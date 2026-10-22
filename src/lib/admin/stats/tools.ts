import "server-only";
import { connectToDatabase } from "@/lib/db";
import type { Period } from "@/lib/admin/period";
import type { FormatId } from "@/config/formats";
import { conversionCategory, toolCategories, tools, type ToolCategory, type ToolId } from "@/config/tools";
import { ConversionLog, conversionTools, type ConversionTool } from "@/models/ConversionLog";
import { inRange } from "./buckets";

export interface ToolUsage {
  /** "convert" (format converter) or a tool id. */
  tool: ConversionTool;
  total: number;
  failed: number;
  /** Most frequent error code of its failures ("unknown" if logged without one). */
  topError: string | null;
}

export interface CategoryUsage {
  category: ToolCategory;
  total: number;
  failed: number;
}

export interface ToolStats {
  /** Tools with at least one attempt in the period, most used first. */
  byTool: ToolUsage[];
  /** Categories with at least one attempt, most used first. */
  byCategory: CategoryUsage[];
}

interface Row {
  _id: { tool: ConversionTool; from?: FormatId | null; to?: FormatId | null; error: string | null };
  total: number;
  failed: number;
}

/** Category of a logged entry: the registry's for tools, the format pair's for the converter. */
export function entryCategory(tool: ConversionTool, from?: FormatId | null, to?: FormatId | null): ToolCategory {
  if (tool !== "convert") return tools[tool as ToolId].category;
  return from && to ? conversionCategory({ from, to }) : "image";
}

/** Most used first, then most failed, then `tie` (registry order). */
const byUse = <T extends { total: number; failed: number }>(tie: (a: T, b: T) => number) => (a: T, b: T) =>
  b.total - a.total || b.failed - a.failed || tie(a, b);

/**
 * Folds rows grouped by (tool, converter pair, error code) into usage per
 * tool and per category. Pure, so it is tested without a database.
 */
export function foldToolRows(rows: readonly Row[]): ToolStats {
  const perTool = new Map<ConversionTool, ToolUsage & { errors: Map<string, number> }>();
  const perCategory = new Map<ToolCategory, CategoryUsage>();
  for (const { _id, total, failed } of rows) {
    const tool = perTool.get(_id.tool) ?? { tool: _id.tool, total: 0, failed: 0, topError: null, errors: new Map() };
    tool.total += total;
    tool.failed += failed;
    if (failed > 0) {
      const code = _id.error ?? "unknown";
      tool.errors.set(code, (tool.errors.get(code) ?? 0) + failed);
    }
    perTool.set(_id.tool, tool);
    const category = entryCategory(_id.tool, _id.from, _id.to);
    const cat = perCategory.get(category) ?? { category, total: 0, failed: 0 };
    cat.total += total;
    cat.failed += failed;
    perCategory.set(category, cat);
  }
  const byTool = [...perTool.values()].map(({ errors, ...usage }) => {
    let top: [string, number] | null = null;
    for (const e of errors) if (!top || e[1] > top[1] || (e[1] === top[1] && e[0] < top[0])) top = e;
    return { ...usage, topError: top?.[0] ?? null };
  });
  return {
    byTool: byTool.sort(byUse((a, b) => conversionTools.indexOf(a.tool) - conversionTools.indexOf(b.tool))),
    byCategory: [...perCategory.values()].sort(
      byUse((a, b) => toolCategories.indexOf(a.category) - toolCategories.indexOf(b.category)),
    ),
  };
}

/** Usage and errors per tool and per category in the period (one aggregation). */
export async function toolStats(period: Period): Promise<ToolStats> {
  await connectToDatabase();
  const rows = await ConversionLog.aggregate<Row>([
    inRange(period),
    {
      $group: {
        _id: {
          tool: { $ifNull: ["$tool", "convert"] },
          // The converter's category depends on the format pair; tools have their own.
          from: { $cond: [{ $eq: [{ $ifNull: ["$tool", "convert"] }, "convert"] }, "$from", null] },
          to: { $cond: [{ $eq: [{ $ifNull: ["$tool", "convert"] }, "convert"] }, "$to", null] },
          error: { $cond: ["$success", null, { $ifNull: ["$errorCode", "unknown"] }] },
        },
        total: { $sum: 1 },
        failed: { $sum: { $cond: [{ $eq: ["$success", false] }, 1, 0] } },
      },
    },
  ]);
  // Entries of tools removed from the registry since they were logged are skipped.
  return foldToolRows(rows.filter((r) => r._id.tool === "convert" || r._id.tool in tools));
}

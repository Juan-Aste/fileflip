import "server-only";
import type { ToolCategory } from "@/config/tools";
import type { ConversionTool } from "@/models/ConversionLog";
import site from "../../../messages/es.json";

/**
 * Spanish names of tools and categories for the admin panel, taken from the
 * public site's messages so every tool of the registry has one.
 */
export function toolLabel(tool: ConversionTool): string {
  if (tool === "convert") return "Conversor de formatos";
  return (site.Tools as Record<string, { title?: string }>)[tool]?.title ?? tool;
}

export function categoryLabel(category: ToolCategory): string {
  return (site.Catalog.categories as Record<string, { name?: string }>)[category]?.name ?? category;
}

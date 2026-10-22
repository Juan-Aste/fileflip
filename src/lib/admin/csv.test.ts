import { describe, expect, it } from "vitest";
import { csvField, csvTables, isCsvTable, tableCsv, toCsv } from "./csv";
import type { ConversionStats } from "./stats/conversions";
import type { ToolStats } from "./stats/tools";
import type { VisitStats } from "./stats/visits";

describe("csvField", () => {
  it("quotes separators, quotes and line breaks", () => {
    expect(csvField("plain")).toBe("plain");
    expect(csvField('a,"b"')).toBe('"a,""b"""');
    expect(csvField("two\nlines")).toBe('"two\nlines"');
    expect(csvField(12.5)).toBe("12.5");
    expect(csvField(undefined)).toBe("");
    expect(csvField(Number.NaN)).toBe("");
  });

  it("neutralizes spreadsheet formulas", () => {
    expect(csvField("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvField("+1")).toBe("'+1");
    expect(csvField("@sum")).toBe("'@sum");
    expect(csvField("-2,3")).toBe("\"'-2,3\"");
  });
});

describe("toCsv", () => {
  it("writes a header and CRLF rows", () => {
    expect(toCsv(["a", "b"], [[1, "x"], [2, null]])).toBe("a,b\r\n1,x\r\n2,\r\n");
  });
});

const conversions = {
  perBucket: [
    { key: "2026-10-19", total: 3, failed: 1 },
    { key: "2026-10-20", total: 0, failed: 0 },
  ],
  top: [
    { tool: "convert", from: "jpg", to: "webp", count: 2 },
    { tool: "merge-pdf", count: 1 },
  ],
  engines: { browser: 2, server: 1 },
} as ConversionStats;

describe("tableCsv", () => {
  it("exports the conversion tables", () => {
    expect(tableCsv("conversions-per-day", { conversions })).toBe("period,total,failed\r\n2026-10-19,3,1\r\n2026-10-20,0,0\r\n");
    expect(tableCsv("top-conversions", { conversions })).toBe("tool,from,to,count\r\nconvert,jpg,webp,2\r\nmerge-pdf,,,1\r\n");
    expect(tableCsv("engines", { conversions })).toBe("engine,count\r\nbrowser,2\r\nserver,1\r\n");
  });

  it("exports usage per tool and per category", () => {
    const tools = {
      byTool: [
        { tool: "compress-image", total: 5, failed: 2, topError: "fileDamaged" },
        { tool: "convert", total: 3, failed: 0, topError: null },
      ],
      byCategory: [{ category: "image", total: 8, failed: 2 }],
    } as ToolStats;
    expect(tableCsv("usage-by-tool", { tools })).toBe(
      "tool,count,failed,top_error\r\ncompress-image,5,2,fileDamaged\r\nconvert,3,0,\r\n",
    );
    expect(tableCsv("usage-by-category", { tools })).toBe("category,count,failed\r\nimage,8,2\r\n");
  });

  it("exports count tables", () => {
    const visits = { byCountry: [{ key: "AR", count: 4 }, { key: "unknown", count: 1 }] } as VisitStats;
    expect(tableCsv("visits-by-country", { visits })).toBe("country,count\r\nAR,4\r\nunknown,1\r\n");
  });
});

describe("isCsvTable", () => {
  it("only accepts known tables", () => {
    expect(Object.keys(csvTables).every(isCsvTable)).toBe(true);
    expect(isCsvTable("toString")).toBe(false);
    expect(isCsvTable("users")).toBe(false);
    expect(isCsvTable(null)).toBe(false);
  });
});

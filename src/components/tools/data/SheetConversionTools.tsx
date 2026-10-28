"use client";

import SpreadsheetTool, { type SheetPreset } from "./SpreadsheetTool";

// One page per searched conversion ("Excel a CSV", "JSON a Excel"...), all on the same engine.
const excel = ["xlsx", "xls", "ods"];
const presets = {
  "excel-to-csv": { id: "excel-to-csv", extensions: excel, to: "csv" },
  "csv-to-excel": { id: "csv-to-excel", extensions: ["csv", "tsv"], to: "xlsx" },
  "xls-to-xlsx": { id: "xls-to-xlsx", extensions: ["xls"], to: "xlsx" },
  "excel-to-ods": { id: "excel-to-ods", extensions: ["xlsx", "xls"], to: "ods" },
  "ods-to-excel": { id: "ods-to-excel", extensions: ["ods"], to: "xlsx" },
  "excel-to-json": { id: "excel-to-json", extensions: excel, to: "json" },
  "json-to-excel": { id: "json-to-excel", extensions: ["json"], to: "xlsx" },
} satisfies Record<string, SheetPreset>;

export const ExcelToCsvTool = () => <SpreadsheetTool preset={presets["excel-to-csv"]} />;
export const CsvToExcelTool = () => <SpreadsheetTool preset={presets["csv-to-excel"]} />;
export const XlsToXlsxTool = () => <SpreadsheetTool preset={presets["xls-to-xlsx"]} />;
export const ExcelToOdsTool = () => <SpreadsheetTool preset={presets["excel-to-ods"]} />;
export const OdsToExcelTool = () => <SpreadsheetTool preset={presets["ods-to-excel"]} />;
export const ExcelToJsonTool = () => <SpreadsheetTool preset={presets["excel-to-json"]} />;
export const JsonToExcelTool = () => <SpreadsheetTool preset={presets["json-to-excel"]} />;

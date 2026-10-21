// Shared JSON helpers for the data tools.

import { ConversionError } from "@/lib/convert-error";
import { stripBom } from "./text";

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

export const invalidData = () => new ConversionError("invalidData");

export function isPlainObject(value: unknown): value is Record<string, Json> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** JSON.parse that fails with `invalidData` (and accepts a leading BOM). */
export function parseJson(text: string): Json {
  try {
    return JSON.parse(stripBom(text));
  } catch {
    throw invalidData();
  }
}

export const toJsonText = (value: unknown) => JSON.stringify(value, null, 2) + "\n";

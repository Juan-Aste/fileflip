import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { defaultLocale, locales } from "@/i18n/routing";

type Messages = { [key: string]: string | Messages };

function load(locale: string): Messages {
  const file = join(__dirname, "..", "messages", `${locale}.json`);
  return JSON.parse(readFileSync(file, "utf8")) as Messages;
}

// Flattens nested messages into "a.b.c" keys.
function flatten(messages: Messages, prefix = ""): Record<string, string> {
  return Object.entries(messages).reduce<Record<string, string>>(
    (acc, [key, value]) => {
      const path = prefix ? `${prefix}.${key}` : key;
      if (typeof value === "string") acc[path] = value;
      else Object.assign(acc, flatten(value, path));
      return acc;
    },
    {},
  );
}

// ICU placeholders such as {year} or {count, plural, ...}.
function placeholders(text: string): string[] {
  return [...text.matchAll(/\{(\w+)/g)].map((m) => m[1]).sort();
}

const reference = flatten(load(defaultLocale));

describe("message files", () => {
  it.each(locales.filter((l) => l !== defaultLocale))(
    "%s has exactly the same keys as the default locale",
    (locale) => {
      const keys = Object.keys(flatten(load(locale))).sort();
      expect(keys).toEqual(Object.keys(reference).sort());
    },
  );

  it.each(locales)("%s has no empty strings", (locale) => {
    const empty = Object.entries(flatten(load(locale)))
      .filter(([, v]) => v.trim() === "")
      .map(([k]) => k);
    expect(empty).toEqual([]);
  });

  it.each(locales.filter((l) => l !== defaultLocale))(
    "%s uses the same placeholders as the default locale",
    (locale) => {
      const messages = flatten(load(locale));
      for (const [key, text] of Object.entries(reference)) {
        expect(placeholders(messages[key]), key).toEqual(placeholders(text));
      }
    },
  );
});

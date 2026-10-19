import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse, TYPE, type MessageFormatElement } from "@formatjs/icu-messageformat-parser";
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

// ICU arguments ({year}, {count, plural, ...}), including nested ones.
function placeholders(text: string): string[] {
  const names = new Set<string>();
  const walk = (elements: MessageFormatElement[]) => {
    for (const el of elements) {
      if ("value" in el && el.type !== TYPE.literal) names.add(String(el.value));
      if ("options" in el) Object.values(el.options).forEach((o) => walk(o.value));
      if (el.type === TYPE.tag) walk(el.children);
    }
  };
  walk(parse(text));
  return [...names].sort();
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

  it.each(locales)("%s only has valid ICU messages", (locale) => {
    for (const [key, text] of Object.entries(flatten(load(locale)))) {
      expect(() => parse(text), key).not.toThrow();
    }
  });

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

describe("API error messages", () => {
  it("has a translation for every API error code", async () => {
    const { apiErrorCodes } = await import("@/lib/api-errors");
    const keys = Object.keys(reference).filter((k) => k.startsWith("ApiErrors."));
    expect(keys.map((k) => k.slice("ApiErrors.".length)).sort()).toEqual([...apiErrorCodes].sort());
  });
});

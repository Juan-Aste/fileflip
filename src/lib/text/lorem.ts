// Lorem ipsum: placeholder text from the classic passage (Cicero, De finibus
// 1.32-33, in the scrambled form used by typesetters and designers).

export type LoremUnit = "paragraphs" | "sentences" | "words";

export const LOREM_LIMITS: Record<LoremUnit, number> = { paragraphs: 100, sentences: 500, words: 10_000 };

export const LOREM_START = "Lorem ipsum dolor sit amet, consectetur adipiscing elit";

const WORDS = (
  "lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua " +
  "enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure in " +
  "reprehenderit voluptate velit esse cillum fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt culpa " +
  "qui officia deserunt mollit anim id est laborum perspiciatis unde omnis iste natus error voluptatem accusantium doloremque " +
  "laudantium totam rem aperiam eaque ipsa quae ab illo inventore veritatis quasi architecto beatae vitae dicta explicabo nemo " +
  "ipsam quia voluptas aspernatur aut odit fugit consequuntur magni dolores eos ratione sequi nesciunt neque porro quisquam " +
  "dolorem adipisci numquam eius modi tempora incidunt magnam aliquam quaerat minima nostrum exercitationem ullam corporis " +
  "suscipit laboriosam aliquid commodi consequatur autem vel eum iure quam nihil molestiae illum quo"
).split(" ");

export interface LoremOptions {
  unit: LoremUnit;
  count: number;
  /** Begin with "Lorem ipsum dolor sit amet, consectetur adipiscing elit". */
  startWithLorem: boolean;
  /** A number in [0, 1); Math.random by default (tests pass a seeded one). */
  random?: () => number;
}

const between = (random: () => number, min: number, max: number) => min + Math.floor(random() * (max - min + 1));
const pick = (random: () => number) => WORDS[Math.floor(random() * WORDS.length)]!;
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function sentence(random: () => number, start?: string): string {
  const words = start ? start.split(" ") : [];
  const length = Math.max(words.length + between(random, 3, 8), between(random, 7, 15));
  while (words.length < length) words.push(pick(random));
  // A comma in longer sentences, never next to the ends.
  if (!start && words.length > 9 && random() < 0.6) {
    const at = between(random, 3, words.length - 4);
    words[at] += ",";
  }
  return `${capitalize(words.join(" "))}.`;
}

/** The text as paragraphs (one for sentences or words). */
export function generateLorem(options: LoremOptions): string[] {
  const random = options.random ?? Math.random;
  const count = Math.max(1, Math.min(Math.floor(options.count) || 1, LOREM_LIMITS[options.unit]));
  let first = options.startWithLorem;
  const nextSentence = () => {
    const s = sentence(random, first ? LOREM_START : undefined);
    first = false;
    return s;
  };
  if (options.unit === "words") {
    const words: string[] = options.startWithLorem ? LOREM_START.split(" ").slice(0, count) : [];
    while (words.length < count) words.push(pick(random));
    return [`${capitalize(words.join(" "))}.`];
  }
  if (options.unit === "sentences") return [Array.from({ length: count }, nextSentence).join(" ")];
  return Array.from({ length: count }, () => Array.from({ length: between(random, 4, 7) }, nextSentence).join(" "));
}

export function loremToText(paragraphs: string[], html: boolean): string {
  return html ? paragraphs.map((p) => `<p>${p}</p>`).join("\n") + "\n" : paragraphs.join("\n\n") + "\n";
}

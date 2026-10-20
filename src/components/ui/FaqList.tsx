import { ChevronDown } from "lucide-react";
import { faqPageJsonLd, jsonLdString, type FaqItem } from "@/lib/faq";

/** Accordion of questions (native <details>, no JS) plus its FAQPage structured data. */
export default function FaqList({ items, locale }: { items: readonly FaqItem[]; locale: string }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(faqPageJsonLd(locale, items)) }}
      />
      <div className="flex flex-col gap-3">
        {items.map(({ q, a }) => (
          <details
            key={q}
            className="group rounded-xl border border-border bg-surface shadow-card transition-colors open:border-border-strong"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-xl px-5 py-4 font-semibold [&::-webkit-details-marker]:hidden">
              {q}
              <ChevronDown
                aria-hidden="true"
                className="h-5 w-5 shrink-0 text-muted transition-transform duration-200 group-open:rotate-180"
              />
            </summary>
            <p className="px-5 pb-4 text-muted group-open:animate-rise">{a}</p>
          </details>
        ))}
      </div>
    </>
  );
}

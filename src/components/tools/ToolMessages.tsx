"use client";

import { useMemo } from "react";
import { NextIntlClientProvider, useLocale, useMessages, useTimeZone, type AbstractIntlMessages } from "next-intl";

/**
 * Adds one tool's messages (see toolMessages) to the ones the layout sends
 * to the browser, for the tool's client component.
 */
export default function ToolMessages({
  messages,
  children,
}: {
  messages: AbstractIntlMessages;
  children: React.ReactNode;
}) {
  const parent = useMessages();
  const locale = useLocale();
  const timeZone = useTimeZone();
  const merged = useMemo(() => ({ ...parent, ...messages }), [parent, messages]);
  return (
    <NextIntlClientProvider locale={locale} timeZone={timeZone} messages={merged}>
      {children}
    </NextIntlClientProvider>
  );
}

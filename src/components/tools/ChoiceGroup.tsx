"use client";

import { useId } from "react";
import { choicePill } from "@/components/ui/styles";

interface Props<T extends string> {
  legend: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  /** Keeps the legend for screen readers only. */
  hideLegend?: boolean;
}

/** Pill-style radio group. */
export default function ChoiceGroup<T extends string>({ legend, value, options, onChange, hideLegend }: Props<T>) {
  const name = useId();
  return (
    <fieldset>
      <legend className={hideLegend ? "sr-only" : "mb-2 text-sm font-medium"}>{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <label key={o.value} className="cursor-pointer">
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="peer sr-only"
            />
            <span className={choicePill}>
              {o.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

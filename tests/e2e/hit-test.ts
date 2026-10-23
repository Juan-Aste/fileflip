// "Everything visible can be clicked": for each visible link, button, input,
// select, textarea and label on the page, scroll it into view and ask the
// browser which element receives a click at its center and at its inner
// corners (document.elementFromPoint). The answer must be the element itself
// or a descendant; anything else means an invisible layer (or a sibling)
// covers it. Also reports controls that stay off screen and, on touch
// viewports, targets smaller than 24×24 px (WCAG 2.5.8, inline links in a
// sentence and untouched browser controls excepted).
import type { Page } from "@playwright/test";
import { encode } from "next-auth/jwt";

export interface HitIssue {
  kind: "covered" | "offscreen" | "small" | "overflow";
  /** Short, stable description of the element (tag, id/name, classes, text). */
  target: string;
  /** For "covered": what got the click instead. For "small": the size. */
  detail: string;
}

/** Runs the check on the current page; restores the scroll position. */
export async function hitTestPage(page: Page, opts: { touch: boolean }): Promise<HitIssue[]> {
  return page.evaluate(({ touch }) => {
    const issues: { kind: "covered" | "offscreen" | "small" | "overflow"; target: string; detail: string }[] = [];
    const describe = (el: Element | null): string => {
      if (!el) return "(nothing)";
      const tag = el.tagName.toLowerCase();
      const id = el.id ? `#${el.id}` : "";
      const name = el.getAttribute("name") ? `[name=${el.getAttribute("name")}]` : "";
      const type = el.getAttribute("type") ? `[type=${el.getAttribute("type")}]` : "";
      const aria = el.getAttribute("aria-label");
      const text = (aria ?? (el as HTMLElement).innerText ?? "").replace(/\s+/g, " ").trim().slice(0, 40);
      const cls = (el.getAttribute("class") ?? "").split(/\s+/).filter(Boolean).slice(0, 4).join(".");
      return `${tag}${id}${name}${type}${cls ? `.${cls}` : ""}${text ? ` "${text}"` : ""}`;
    };
    const startY = window.scrollY;
    const vw = document.documentElement.clientWidth;
    const vh = window.innerHeight;
    if (document.documentElement.scrollWidth > vw + 1) {
      // Find the widest culprit to make the report actionable.
      let widest: Element | null = null;
      for (const el of Array.from(document.body.querySelectorAll("*"))) {
        const r = el.getBoundingClientRect();
        if (r.right > vw + 1 && (!widest || r.right > widest.getBoundingClientRect().right)) widest = el;
      }
      issues.push({ kind: "overflow", target: describe(widest), detail: `page scrolls sideways: ${document.documentElement.scrollWidth}px > ${vw}px` });
    }
    const selector = "a[href], button, input:not([type=hidden]), select, textarea, label, summary, [role=button], [role=tab], [role=menuitem], [role=option]";
    const els = Array.from(document.querySelectorAll<HTMLElement>(selector)).filter((el) => {
      if (el.closest("ins.adsbygoogle, [data-ad-slot], [data-hit-test-skip]")) return false;
      if (!el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return false;
      const r = el.getBoundingClientRect();
      // sr-only content (1×1 px, clipped) is meant for screen readers only.
      return r.width > 2 && r.height > 2;
    });
    interface Target { el: HTMLElement; x: number; y: number; w: number; h: number }
    const targets: Target[] = [];
    for (const el of els) {
      el.scrollIntoView({ block: "center", inline: "nearest", behavior: "instant" });
      const r = el.getBoundingClientRect();
      if (r.right <= 0 || r.left >= vw || r.bottom <= 0 || r.top >= vh) {
        issues.push({ kind: "offscreen", target: describe(el), detail: `at ${Math.round(r.left)},${Math.round(r.top)}` });
        continue;
      }
      const radius = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0;
      const inset = Math.min(Math.max(3, radius * 0.35 + 3), r.width / 2 - 0.5, r.height / 2 - 0.5);
      const left = Math.max(r.left, 0);
      const right = Math.min(r.right, vw);
      const top = Math.max(r.top, 0);
      const bottom = Math.min(r.bottom, vh);
      const points: [number, number][] = [
        [(left + right) / 2, (top + bottom) / 2],
        [left + inset, top + inset],
        [right - inset, top + inset],
        [left + inset, bottom - inset],
        [right - inset, bottom - inset],
      ];
      const control = el instanceof HTMLLabelElement ? el.control : null;
      // Disabled controls ignore the pointer on purpose (pointer-events: none).
      const disabled = el.matches(":disabled, [aria-disabled=true]");
      for (const [x, y] of disabled ? [] : points) {
        const hit = document.elementFromPoint(x, y);
        if (!hit) continue;
        if (hit === el || el.contains(hit) || (control && (hit === control || control.contains(hit)))) continue;
        // A label covering its own control still forwards the click.
        if (hit instanceof HTMLLabelElement && hit.control === el) continue;
        // An inline link that wraps across lines has gaps in its bounding box.
        if (getComputedStyle(el).display === "inline" && el.getClientRects().length > 1) continue;
        issues.push({ kind: "covered", target: describe(el), detail: `covered by ${describe(hit)} at ${Math.round(x - r.left)},${Math.round(y - r.top)}` });
        break;
      }
    }
    if (touch) {
      // Measure every target in one layout snapshot (scrolling above moved inner
      // scroll containers between measurements).
      // At the top of the page sticky headers sit in their own place, not over
      // content. Targets scrolled out of an inner scroll box are clipped away.
      window.scrollTo({ top: 0, behavior: "instant" });
      for (const el of els) {
        let { left, top, right, bottom } = el.getBoundingClientRect();
        for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
          const st = getComputedStyle(a);
          if (st.overflowX === "visible" && st.overflowY === "visible") continue;
          const c = a.getBoundingClientRect();
          left = Math.max(left, c.left);
          top = Math.max(top, c.top);
          right = Math.min(right, c.right);
          bottom = Math.min(bottom, c.bottom);
        }
        if (right - left <= 0 || bottom - top <= 0) continue;
        targets.push({ el, x: left + window.scrollX, y: top + window.scrollY, w: right - left, h: bottom - top });
      }
      // WCAG 2.5.8: a target under 24×24 px still passes when a 24 px circle
      // centered on it touches no other target (nor another small target's circle).
      const center = (t: Target) => [t.x + t.w / 2, t.y + t.h / 2] as const;
      const distToRect = (px: number, py: number, t: Target) =>
        Math.hypot(Math.max(t.x - px, 0, px - (t.x + t.w)), Math.max(t.y - py, 0, py - (t.y + t.h)));
      const isSmall = (t: Target) => t.w < 24 || t.h < 24;
      const sized = targets.filter((t) => !(t.el instanceof HTMLLabelElement));
      for (const t of sized) {
        const style = getComputedStyle(t.el);
        const inlineInText =
          style.display === "inline" && (t.el.parentElement?.innerText.trim().length ?? 0) > t.el.innerText.trim().length + 3;
        const uaControl =
          t.el instanceof HTMLInputElement && ["checkbox", "radio", "range"].includes(t.el.type) && style.appearance !== "none";
        if (inlineInText || uaControl || !isSmall(t)) continue;
        const [cx, cy] = center(t);
        const crowded = sized.find(
          (o) =>
            o !== t &&
            !o.el.contains(t.el) &&
            !t.el.contains(o.el) &&
            (distToRect(cx, cy, o) < 12 || (isSmall(o) && Math.hypot(cx - center(o)[0], cy - center(o)[1]) < 24)),
        );
        if (crowded) {
          issues.push({ kind: "small", target: describe(t.el), detail: `${Math.round(t.w)}×${Math.round(t.h)} px, too close to ${describe(crowded.el)}` });
        }
      }
    }
    window.scrollTo({ top: startY, behavior: "instant" });
    return issues;
  }, opts);
}

export const E2E_AUTH_SECRET = "e2e-only-not-a-real-secret";
export const E2E_ADMIN_EMAIL = "admin@e2e.test";

/**
 * Signs the browser context in with a JWT session (the e2e server runs without
 * MongoDB, so Auth.js uses JWT sessions) as the e2e admin.
 */
export async function signInAsAdmin(page: Page, baseURL: string) {
  const salt = "authjs.session-token";
  const value = await encode({
    salt,
    secret: E2E_AUTH_SECRET,
    token: { sub: "e2e-admin", email: E2E_ADMIN_EMAIL, name: "E2E Admin" },
  });
  await page.context().addCookies([{ name: salt, value, url: baseURL, httpOnly: true, sameSite: "Lax" }]);
}

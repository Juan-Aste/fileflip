import "server-only";
import { createTranslator } from "next-intl";
import messages from "../../../messages/admin.es.json";

/**
 * The admin panel is Spanish-only. Its messages live in their own file so
 * they are not sent to the browser with the public site's messages.
 */
export function adminTranslator() {
  return createTranslator({ locale: "es", messages, namespace: "Admin" });
}

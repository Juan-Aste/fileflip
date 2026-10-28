import { getMessages } from "next-intl/server";
import type { ToolId } from "@/config/tools";
import { toolMessages } from "@/i18n/client-messages";
import ToolComponent from "./ToolComponent";
import ToolMessages from "./ToolMessages";

/** A tool's client component with its own messages (the layout leaves them out, see clientMessages). */
export default async function ToolBlock({ id }: { id: ToolId }) {
  const messages = await getMessages();
  return (
    <ToolMessages messages={toolMessages(messages, id)}>
      <ToolComponent id={id} />
    </ToolMessages>
  );
}

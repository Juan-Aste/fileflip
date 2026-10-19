"use client";

import type { ToolId } from "@/config/tools";
import MergePdfTool from "./MergePdfTool";

const components: Partial<Record<ToolId, React.ComponentType>> = {
  "merge-pdf": MergePdfTool,
};

export default function ToolComponent({ id }: { id: ToolId }) {
  const Component = components[id];
  return Component ? <Component /> : null;
}

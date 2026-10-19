"use client";

import type { ToolId } from "@/config/tools";
import ImagesToPdfTool from "./ImagesToPdfTool";
import MergePdfTool from "./MergePdfTool";
import OrganizePdfTool from "./OrganizePdfTool";
import RotatePdfTool from "./RotatePdfTool";
import SplitPdfTool from "./SplitPdfTool";

const components: Partial<Record<ToolId, React.ComponentType>> = {
  "merge-pdf": MergePdfTool,
  "split-pdf": SplitPdfTool,
  "rotate-pdf": RotatePdfTool,
  "organize-pdf": OrganizePdfTool,
  "images-to-pdf": ImagesToPdfTool,
};

export default function ToolComponent({ id }: { id: ToolId }) {
  const Component = components[id];
  return Component ? <Component /> : null;
}

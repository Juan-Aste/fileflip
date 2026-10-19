"use client";

import type { ToolId } from "@/config/tools";
import CompressPdfTool from "./CompressPdfTool";
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
  "compress-pdf": CompressPdfTool,
};

export default function ToolComponent({ id }: { id: ToolId }) {
  const Component = components[id];
  return Component ? <Component /> : null;
}

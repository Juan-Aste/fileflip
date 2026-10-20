"use client";

import dynamic from "next/dynamic";
import type { ToolId } from "@/config/tools";

// One chunk per tool: a page only downloads the tool it shows. They are still
// server-rendered, so there is no layout shift while the chunk loads.
const components: Record<ToolId, React.ComponentType> = {
  "merge-pdf": dynamic(() => import("./MergePdfTool")),
  "split-pdf": dynamic(() => import("./SplitPdfTool")),
  "rotate-pdf": dynamic(() => import("./RotatePdfTool")),
  "organize-pdf": dynamic(() => import("./OrganizePdfTool")),
  "images-to-pdf": dynamic(() => import("./ImagesToPdfTool")),
  "compress-pdf": dynamic(() => import("./CompressPdfTool")),
};

export default function ToolComponent({ id }: { id: ToolId }) {
  const Component = components[id];
  return <Component />;
}

import {
  FileArchive,
  Images,
  Layers,
  LayoutGrid,
  RotateCw,
  Scissors,
  type LucideIcon,
} from "lucide-react";
import type { ToolId } from "@/config/tools";

const icons: Record<ToolId, LucideIcon> = {
  "merge-pdf": Layers,
  "split-pdf": Scissors,
  "rotate-pdf": RotateCw,
  "organize-pdf": LayoutGrid,
  "images-to-pdf": Images,
  "compress-pdf": FileArchive,
};

export default function ToolIcon({ id, className }: { id: ToolId; className?: string }) {
  const Icon = icons[id];
  return <Icon aria-hidden="true" className={className} />;
}

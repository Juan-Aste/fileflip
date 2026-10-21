import {
  Braces,
  CodeXml,
  FileCode,
  FileJson,
  Settings2,
  FileArchive,
  Sheet,
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
  "json-to-csv": Sheet,
  "csv-to-json": Braces,
  "json-to-yaml": FileCode,
  "yaml-to-json": FileJson,
  "json-to-toml": Settings2,
  "toml-to-json": FileJson,
  "json-to-xml": CodeXml,
  "xml-to-json": FileJson,
};

export default function ToolIcon({ id, className }: { id: ToolId; className?: string }) {
  const Icon = icons[id];
  return <Icon aria-hidden="true" className={className} />;
}

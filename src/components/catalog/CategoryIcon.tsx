import {
  Archive,
  BookOpen,
  Box,
  Captions,
  Code,
  DraftingCompass,
  FileText,
  FileType,
  Image,
  Music,
  ScanText,
  Table,
  Type,
  Video,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { ToolCategory } from "@/config/tools";

const icons: Record<ToolCategory, LucideIcon> = {
  image: Image,
  pdf: FileText,
  document: FileType,
  data: Table,
  developer: Code,
  utility: Wrench,
  subtitle: Captions,
  font: Type,
  archive: Archive,
  ocr: ScanText,
  ebook: BookOpen,
  audio: Music,
  video: Video,
  "3d": Box,
  cad: DraftingCompass,
};

export default function CategoryIcon({ category, className }: { category: ToolCategory; className?: string }) {
  const Icon = icons[category];
  return <Icon aria-hidden="true" className={className} />;
}

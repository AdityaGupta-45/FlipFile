import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { setMeta } from "../lib/seo.js";
import { Camera, Crop, MessageSquare, Sparkles, Workflow, EyeOff, ImageDown, Pencil, PenTool, Eye, File, FileImage, FileText, GitCompare, Hash, Image, Images, LayoutGrid, Merge, Minimize2, Music, RotateCw, Scissors, Shrink, Trash2, Type, Droplets } from "lucide-react";

export function usePageTitle(title, description) {
  const { pathname } = useLocation();
  useEffect(() => { setMeta({ title, description, path: pathname }); }, [title, description, pathname]);
}

export function Logo({ className = "h-7 w-6" }) {
  return (
    <svg viewBox="0 0 24 30" fill="none" className={className} aria-hidden="true">
      <path d="M2 2h13l7 7v19H2z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M15 2v7h7" fill="var(--chip)" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

const icons = {
  "merge-pdf": Merge,
  "split-pdf": Scissors,
  "compress-pdf": Minimize2,
  "pdf-to-jpg": FileImage,
  "jpg-to-pdf": Images,
  "png-to-jpg": Image,
  "compress-image": Shrink,
  "mp4-to-mp3": Music,
  "word-to-pdf": FileText,
  "delete-pages": Trash2,
  "organize-pages": LayoutGrid,
  "scan-to-pdf": Camera,
  "rotate-pdf": RotateCw,
  "page-numbers": Hash,
  watermark: Droplets,
  "extract-text": Type,
  "pdf-viewer": Eye,
  "compare-pdfs": GitCompare,
  "sign-pdf": PenTool,
  "crop-pdf": Crop,
  "redact-pdf": EyeOff,
  "extract-images": ImageDown,
  "edit-pdf": Pencil,
  "summarize-pdf": Sparkles,
  "chat-with-pdf": MessageSquare,
  "custom-workflows": Workflow,
};
const catColor = {
  "Organize PDF": "#e5484d",
  "Optimize PDF": "#0e9f8e",
  "Convert to PDF": "#e5740b",
  "Convert from PDF": "#0b8bd9",
  "Edit PDF": "#a855c8",
  "PDF Security": "#3e63dd",
  "Images and Media": "#2f9e6a",
  "AI & Workflows": "#d6409f",
};

export function ToolIcon({ tool, size = 24, pad = 24 }) {
  const Icon = icons[tool.id] || File;
  const color = catColor[tool.cat] || "#3e63dd";
  return (
    <span
      className="grid shrink-0 place-items-center rounded-xl"
      style={{ width: size + pad, height: size + pad, background: `color-mix(in srgb, ${color} 16%, transparent)`, color }}
    >
      <Icon size={size} aria-hidden="true" />
    </span>
  );
}

export function ProgressBar({ value, label }) {
  return (
    <div className="mt-6" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label="Progress">
      <div className="flex justify-between text-sm font-bold">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="mt-2 h-3 overflow-hidden rounded-full bg-[var(--line)]">
        <div className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-300" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
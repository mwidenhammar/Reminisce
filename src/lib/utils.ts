import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Get initials from a name for avatar fallbacks
export function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

// Remove bracketed suffixes from memory titles (e.g., "[Recording]")
export function getCleanTitle(title: string): string {
  return title.replace(/\s*\[[^\]]+\]$/, "");
}

// Format seconds as MM:SS for timers and audio players
export function formatTime(seconds: number): string {
  if (isNaN(seconds) || !isFinite(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

// Text size CSS class mappings
export const TEXT_SIZE_CLASSES = {
  small: "text-base",
  medium: "text-lg",
  large: "text-xl",
} as const;

export type TextSize = keyof typeof TEXT_SIZE_CLASSES;

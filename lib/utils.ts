import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(input: string | number | Date): string {
  const date = typeof input === "string" || typeof input === "number" ? new Date(input) : input;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(input: string | number | Date): string {
  const date = typeof input === "string" || typeof input === "number" ? new Date(input) : input;
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function shorten(text: string, max = 120): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1).trimEnd() + "…";
}

export function snakeToTitle(s: string): string {
  return s
    .split("_")
    .map((p) => (p.length > 0 ? p[0].toUpperCase() + p.slice(1) : p))
    .join(" ");
}

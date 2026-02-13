import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Strip HTML tags and truncate to prevent rendering untrusted error content. */
export function sanitizeErrorMessage(msg: string, maxLength = 200): string {
  const stripped = msg.replace(/<[^>]*>/g, '').trim()
  return stripped.length > maxLength ? stripped.slice(0, maxLength) + '…' : stripped
}

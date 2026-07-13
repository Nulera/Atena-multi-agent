import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function hslVar(token: string): string {
  return `hsl(var(--${token}))`
}

export function hslVarWithAlpha(token: string, alpha: number): string {
  return `hsl(var(--${token}) / ${alpha})`
}

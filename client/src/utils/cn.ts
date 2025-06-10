// Simple utility function for combining class names
// This replaces clsx + tailwind-merge with a simpler implementation

type ClassValue =
  | string
  | number
  | boolean
  | undefined
  | null
  | { [key: string]: boolean | undefined | null }
  | ClassValue[];

function clsx(...inputs: ClassValue[]): string {
  const classes: string[] = [];

  for (const input of inputs) {
    if (!input) continue;

    if (typeof input === 'string' || typeof input === 'number') {
      classes.push(String(input));
    } else if (Array.isArray(input)) {
      const result = clsx(...input);
      if (result) classes.push(result);
    } else if (typeof input === 'object') {
      for (const [key, value] of Object.entries(input)) {
        if (value) classes.push(key);
      }
    }
  }

  return classes.join(' ');
}

// Simple Tailwind class merger - removes duplicates and handles conflicts
function twMerge(classNames: string): string {
  const classes = classNames.split(' ').filter(Boolean);
  const seen = new Set<string>();
  const uniqueClasses: string[] = [];

  for (const cls of classes) {
    if (!seen.has(cls)) {
      seen.add(cls);
      uniqueClasses.push(cls);
    }
  }

  return uniqueClasses.join(' ');
}

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(...inputs));
}

export type { ClassValue };

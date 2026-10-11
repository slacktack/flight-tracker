import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// Custom font sizes would otherwise read as colours and get dropped.
const twMerge = extendTailwindMerge({
  extend: { classGroups: { 'font-size': [{ text: ['micro', 'small', 'base', 'lead', 'title', 'code', 'hero'] }] } },
});

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

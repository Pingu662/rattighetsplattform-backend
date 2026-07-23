import { clsx, type ClassValue } from 'clsx';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';

/**
 * Combines class names using clsx.
 * Commonly used in Tailwind CSS projects to conditionally apply classes.
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/**
 * Formats a date to a short, human-readable string.
 * Example: "15 jan 2024"
 */
export function formatDateShort(date: string | Date): string {
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) {
      return 'Ogiltigt datum';
    }
    return format(d, 'P', { locale: sv });
  } catch {
    return 'Ogiltigt datum';
  }
}

/**
 * Returns Tailwind CSS classes for a given case status.
 * Used to color-code status badges in the UI.
 */
export function getStatusColor(status: string): string {
  const normalized = (status || '').toLowerCase().trim();

  const statusMap: Record<string, string> = {
    open: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    in_progress: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    'in progress': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    pending: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    resolved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    closed: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
    rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    draft: 'bg-slate-100 text-slate-800 dark:bg-slate-800/30 dark:text-slate-300',
    submitted: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    archived: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
  };

  return statusMap[normalized] || 'bg-slate-100 text-slate-800 dark:bg-slate-800/30 dark:text-slate-300';
}

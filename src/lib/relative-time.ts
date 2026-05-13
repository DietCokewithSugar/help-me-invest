/**
 * Format a relative time string ("3 minutes ago" / "3 分钟前") given an ISO
 * timestamp and a locale-aware label set from the i18n translation tree.
 */
interface RelativeTimeLabels {
  justNow: string;
  minutesAgo: (n: number) => string;
  hoursAgo: (n: number) => string;
  daysAgo: (n: number) => string;
}

export function formatRelativeTime(
  iso: string,
  locale: string,
  labels: RelativeTimeLabels,
): string {
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return iso;
  const diffMs = Date.now() - time;
  if (diffMs < 60 * 1000) return labels.justNow;
  const minutes = Math.floor(diffMs / (60 * 1000));
  if (minutes < 60) return labels.minutesAgo(minutes);
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return labels.hoursAgo(hours);
  const days = Math.floor(hours / 24);
  if (days < 14) return labels.daysAgo(days);
  return new Date(iso).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US');
}

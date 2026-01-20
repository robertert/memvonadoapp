export const calculateDateAgo = (date: Date): string => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const diffDays = Math.floor(diff / (1000 * 60 * 60 * 24));
  return diffDays === 0
    ? "today"
    : diffDays === 1
    ? "yesterday"
    : `${diffDays} days ago`;
};

export const calculateTimeAgo = (date: Date): string => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diff / (1000 * 60));
  const diffHours = Math.floor(diff / (1000 * 60 * 60));
  const diffDays = Math.floor(diff / (1000 * 60 * 60 * 24));
  const diffMonths = Math.floor(diff / (1000 * 60 * 60 * 24 * 30));
  const diffYears = Math.floor(diff / (1000 * 60 * 60 * 24 * 365));
  return diffMinutes === 0
    ? "just now"
    : diffMinutes === 1
    ? "1 minute ago"
    : diffMinutes < 60
    ? `${diffMinutes} minutes ago`
    : diffHours === 1
    ? "1 hour ago"
    : diffHours < 24
    ? `${diffHours} hours ago`
    : diffDays === 1
    ? "1 day ago"
    : diffDays < 7
    ? `${diffDays} days ago`
    : diffDays < 30
    ? `${diffMonths} months ago`
    : diffYears === 1
    ? "1 year ago"
    : diffYears > 1
    ? `${diffYears} years ago`
    : `${diffDays} days ago`;
};

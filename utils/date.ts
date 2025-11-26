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

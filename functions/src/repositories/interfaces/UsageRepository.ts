export interface UsageRepository {
  /** Get usage count for userId on date (YYYY-MM-DD) */
  getUsage(userId: string, date: string): Promise<number>;

  /** Increment usage for userId on date; returns the new count */
  incrementUsage(userId: string, date: string): Promise<number>;

  /** Get the admin-configured daily limit for this usage type */
  getAdminLimit(key: string): Promise<number>;
}

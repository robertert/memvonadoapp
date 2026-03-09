import type { AvocadoConfig, AvocadoGrowth, UserSettings, UserDailyStats } from "memvocado-types";

export interface AvocadoUserData {
  avocadoGrowth: Partial<AvocadoGrowth>;
  settings: Partial<UserSettings>;
  dailyStats: Partial<UserDailyStats>;
}

export interface AvocadoRepository {
  /** Get avocado-relevant user fields, or null if user does not exist */
  getUser(userId: string): Promise<AvocadoUserData | null>;

  /** Partial update of avocadoGrowth fields (dot-notation keys) */
  updateAvocadoGrowth(userId: string, data: Record<string, unknown>): Promise<void>;

  /** Fetch admin/avocadoConfig, or null if it does not exist */
  getAvocadoConfig(): Promise<AvocadoConfig | null>;

  /** Read streakThreshold from admin/settings */
  getStreakThreshold(): Promise<number>;
}

import type { Notification } from "memvocado-types";
import type { NotificationRepository } from "../repositories/interfaces/NotificationRepository";

export class NotificationService {
  constructor(private readonly repo: NotificationRepository) {}

  async getNotifications(userId: string, limit = 50): Promise<Notification[]> {
    return this.repo.getUnread(userId, limit);
  }

  async markRead(userId: string, notifId: string): Promise<void> {
    await this.repo.markRead(userId, notifId);
  }

  async create(
    userId: string,
    notification: { title: string; body: string; type: "info" | "success" | "warning" | "error"; linkTo?: string | null; read?: boolean }
  ): Promise<string> {
    return this.repo.create(userId, {
      title: notification.title,
      body: notification.body,
      type: notification.type,
      linkTo: notification.linkTo ?? null,
      read: notification.read ?? false,
    });
  }

  async notifyStreakBroken(userId: string): Promise<void> {
    await this.create(userId, {
      title: "Streak broken",
      body: "You missed your daily practice. Start again today!",
      type: "warning",
    });
  }

  async notifySeasonEnd(params: {
    userId: string;
    finalPosition?: number;
    leagueNumber?: number;
  }): Promise<void> {
    const { userId, finalPosition, leagueNumber } = params;
    let body = "Season ended! Check your final ranking.";
    if (finalPosition !== undefined && finalPosition <= 3 && leagueNumber !== undefined && leagueNumber < 15) {
      const pos = finalPosition === 1 ? "1st" : finalPosition === 2 ? "2nd" : "3rd";
      body = `Season ended! You finished ${pos} in your group and advanced to League ${leagueNumber + 1}!`;
    }
    await this.create(userId, { title: "Weekly League Reset!", body, type: "info" });
  }

  async notifyLeagueAdvance(userId: string, fromLeague: number, toLeague: number): Promise<void> {
    await this.create(userId, {
      title: "Ranking Up!",
      body: `Congrats! You advanced to League ${toLeague}.`,
      type: "success",
    });
  }
}

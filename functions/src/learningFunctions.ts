import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";

import { SuperMemo2 } from "./superMemo2";

/**
 * Calculate next review date when card progress is updated
 */
export const calculateNextReview = onDocumentUpdated(
  "users/{userId}/decks/{deckId}/cardProgress/{cardId}",
  async (event) => {
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();

    if (!beforeData || !afterData) {
      logger.error("No data found in document");
      return;
    }

    if (beforeData.grade === afterData.grade) {
      return;
    }

    try {
      const superMemo = new SuperMemo2();
      const { interval, difficulty } = superMemo.calculate(
        afterData.grade,
        afterData.difficulty || 2.5,
        afterData.nextReviewInterval || 1
      );

      const nextReviewDate = new Date();
      nextReviewDate.setDate(nextReviewDate.getDate() + interval);

      await event.data?.after.ref.update({
        difficulty: difficulty,
        nextReviewInterval: interval,
        nextReviewDate: nextReviewDate,
        lastReviewDate: new Date(),
      });

      logger.info("Next review calculated successfully", {
        cardId: event.params.cardId,
        interval: interval,
        difficulty: difficulty,
      });
    } catch (error) {
      logger.error("Error calculating next review", error);
    }
  }
);

import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions";

// URLs of functions to keep warm.
// Get these from Firebase Console > Functions > click function > "Trigger URL"
// or from the output of `firebase deploy`.
// A ping to an onCall function will return 400 (wrong format), but that's enough
// to keep the container warm — the runtime had to start to handle the request.
const WARM_URLS: string[] = [
  "https://startlearningsession-cnusrvmxsa-ew.a.run.app",
  "https://getuserdecks-cnusrvmxsa-ew.a.run.app",
  "https://getdeckdetails-cnusrvmxsa-ew.a.run.app",
  "https://updatecardprogress-cnusrvmxsa-ew.a.run.app",
  "https://getdailyuserstats-cnusrvmxsa-ew.a.run.app",
  "https://getuserprogress-cnusrvmxsa-ew.a.run.app",
];

export const keepFunctionsWarm = onSchedule(
  { schedule: "every 5 minutes", region: "europe-west1" },
  async () => {
    if (WARM_URLS.length === 0) {
      logger.info("No URLs configured for keepFunctionsWarm — skipping.");
      return;
    }

    logger.info(`Pinging ${WARM_URLS.length} functions to keep warm...`);

    await Promise.all(
      WARM_URLS.map((url) =>
        fetch(url).catch((err) =>
          logger.warn(`Ping failed for ${url}`, { error: String(err) })
        )
      )
    );

    logger.info("Ping complete.");
  }
);

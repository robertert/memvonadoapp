const mockTranslateText = jest.fn();

jest.mock("@google-cloud/translate", () => ({
  TranslationServiceClient: jest.fn().mockImplementation(() => ({
    translateText: mockTranslateText,
  })),
}));

jest.mock("firebase-functions/logger", () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

import { TranslationService } from "../../src/services/TranslationService";
import { DAILY_TRANSLATION_LIMIT } from "memvocado-types/schemas/api/translation";
import { InMemoryUsageRepository } from "./helpers/inMemoryRepositories";

const TODAY = new Date().toISOString().split("T")[0];

function makeService() {
  const usageRepo = new InMemoryUsageRepository();
  const service = new TranslationService(usageRepo);
  return { service, usageRepo };
}

function makeSuccessResponse(translatedText = "Hola mundo") {
  return [{ translations: [{ translatedText }] }];
}

// ── translate() ───────────────────────────────────────────────────────────────

describe("TranslationService.translate", () => {
  beforeEach(() => {
    mockTranslateText.mockResolvedValue(makeSuccessResponse());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("returns translated text on success", async () => {
    const { service } = makeService();

    const result = await service.translate({
      userId: "u1",
      text: "Hello world",
      fromLanguage: "en",
      toLanguage: "es",
    });

    expect(result.success).toBe(true);
    expect(result.translatedText).toBe("Hola mundo");
    expect(result.fromLanguage).toBe("en");
    expect(result.toLanguage).toBe("es");
  });

  it("increments usage counter after translation", async () => {
    const { service, usageRepo } = makeService();

    await service.translate({
      userId: "u1",
      text: "Hello",
      fromLanguage: "en",
      toLanguage: "es",
    });

    const usage = await usageRepo.getUsage("u1", TODAY);
    expect(usage).toBe(1);
  });

  it("returns { success: false } when daily limit is reached", async () => {
    const { service, usageRepo } = makeService();
    usageRepo.seed("u1", TODAY, DAILY_TRANSLATION_LIMIT);

    const result = await service.translate({
      userId: "u1",
      text: "Hello",
      fromLanguage: "en",
      toLanguage: "es",
    });

    expect(result.success).toBe(false);
    expect(result.translatedText).toBeNull();
    expect(result.isLimitReached).toBe(true);
    expect(mockTranslateText).not.toHaveBeenCalled();
  });

  it("returns { success: false } when API throws error (silent failure)", async () => {
    const { service } = makeService();
    mockTranslateText.mockRejectedValueOnce(new Error("Network error"));

    const result = await service.translate({
      userId: "u1",
      text: "Hello",
      fromLanguage: "en",
      toLanguage: "es",
    });

    expect(result.success).toBe(false);
    expect(result.translatedText).toBeNull();
    expect(result.isLimitReached).toBe(false);
  });

  it("correctly computes remainingToday after translation", async () => {
    const { service, usageRepo } = makeService();
    usageRepo.seed("u1", TODAY, 5);

    const result = await service.translate({
      userId: "u1",
      text: "Hello",
      fromLanguage: "en",
      toLanguage: "es",
    });

    expect(result.remainingToday).toBe(DAILY_TRANSLATION_LIMIT - 6);
    expect(result.isLimitReached).toBe(false);
  });

  it("handles same-language pair (from === to)", async () => {
    const { service } = makeService();
    mockTranslateText.mockResolvedValueOnce([{ translations: [{ translatedText: "Hello" }] }]);

    const result = await service.translate({
      userId: "u1",
      text: "Hello",
      fromLanguage: "en",
      toLanguage: "en",
    });

    expect(result.success).toBe(true);
    expect(result.fromLanguage).toBe("en");
    expect(result.toLanguage).toBe("en");
  });
});

// ── getLimit() ────────────────────────────────────────────────────────────────

describe("TranslationService.getLimit", () => {
  it("returns default values when no usage recorded", async () => {
    const { service } = makeService();

    const result = await service.getLimit("u1");

    expect(result.usedToday).toBe(0);
    expect(result.remainingToday).toBe(DAILY_TRANSLATION_LIMIT);
    expect(result.dailyLimit).toBe(DAILY_TRANSLATION_LIMIT);
    expect(result.isLimitReached).toBe(false);
  });

  it("returns correct usedToday when translations were made", async () => {
    const { service, usageRepo } = makeService();
    usageRepo.seed("u1", TODAY, 42);

    const result = await service.getLimit("u1");

    expect(result.usedToday).toBe(42);
    expect(result.remainingToday).toBe(DAILY_TRANSLATION_LIMIT - 42);
  });

  it("isLimitReached: true when usedToday >= dailyLimit", async () => {
    const { service, usageRepo } = makeService();
    usageRepo.seed("u1", TODAY, DAILY_TRANSLATION_LIMIT);

    const result = await service.getLimit("u1");

    expect(result.isLimitReached).toBe(true);
    expect(result.remainingToday).toBe(0);
  });

  it("resetsAt contains tomorrow's UTC midnight date", async () => {
    const { service } = makeService();

    const result = await service.getLimit("u1");

    const resetsAt = new Date(result.resetsAt);
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);

    expect(resetsAt.getTime()).toBe(tomorrow.getTime());
  });

  it("isolation: usage for one user does not affect another", async () => {
    const { service, usageRepo } = makeService();
    usageRepo.seed("u1", TODAY, 100);

    const resultU2 = await service.getLimit("u2");

    expect(resultU2.usedToday).toBe(0);
    expect(resultU2.remainingToday).toBe(DAILY_TRANSLATION_LIMIT);
  });
});

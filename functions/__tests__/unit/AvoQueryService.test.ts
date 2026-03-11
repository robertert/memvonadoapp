const mockGenerateContentAvo = jest.fn();

jest.mock("@google-cloud/vertexai", () => ({
  VertexAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: mockGenerateContentAvo,
    }),
  })),
}));

jest.mock("firebase-functions/logger", () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

import { AvoQueryService } from "../../src/services/AvoQueryService";
import { DAILY_AVO_QUERY_LIMIT } from "memvocado-types/schemas/api/avoHelper";
import { InMemoryUsageRepository } from "./helpers/inMemoryRepositories";

const TODAY = new Date().toISOString().split("T")[0];

function makeService() {
  const usageRepo = new InMemoryUsageRepository();
  const service = new AvoQueryService(usageRepo);
  return { service, usageRepo };
}

function makeGeminiResponse(text = "This is the AVO answer.") {
  return {
    response: {
      candidates: [{ content: { parts: [{ text }] } }],
    },
  };
}

const defaultCardContext = {
  front: "Bonjour",
  back: "Hello",
  tags: ["french", "greeting"],
  deckName: "French Basics",
  frontLanguage: "fr",
  backLanguage: "en",
};

// ── query() ───────────────────────────────────────────────────────────────────

describe("AvoQueryService.query", () => {
  beforeEach(() => {
    mockGenerateContentAvo.mockResolvedValue(makeGeminiResponse());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("returns answer for chipType: explain_answer", async () => {
    const { service } = makeService();

    const result = await service.query({
      userId: "u1",
      chipType: "explain_answer",
      cardContext: defaultCardContext,
      responseLanguage: "en",
    });

    expect(result.answer).toBe("This is the AVO answer.");
    expect(result.isLimitReached).toBe(false);
  });

  it("returns answer for chipType: mnemonic", async () => {
    const { service } = makeService();
    mockGenerateContentAvo.mockResolvedValueOnce(makeGeminiResponse("Mnemonic tip here"));

    const result = await service.query({
      userId: "u1",
      chipType: "mnemonic",
      cardContext: defaultCardContext,
      responseLanguage: "en",
    });

    expect(result.answer).toBe("Mnemonic tip here");
  });

  it("returns answer for chipType: use_in_sentence", async () => {
    const { service } = makeService();
    mockGenerateContentAvo.mockResolvedValueOnce(makeGeminiResponse("Example sentence here"));

    const result = await service.query({
      userId: "u1",
      chipType: "use_in_sentence",
      cardContext: defaultCardContext,
      responseLanguage: "en",
    });

    expect(result.answer).toBe("Example sentence here");
  });

  it("returns answer for chipType: custom with customQuestion", async () => {
    const { service } = makeService();
    mockGenerateContentAvo.mockResolvedValueOnce(makeGeminiResponse("Custom answer"));

    const result = await service.query({
      userId: "u1",
      chipType: "custom",
      customQuestion: "What is the etymology of this word?",
      cardContext: defaultCardContext,
      responseLanguage: "en",
    });

    expect(result.answer).toBe("Custom answer");
  });

  it("increments usage counter after query", async () => {
    const { service, usageRepo } = makeService();

    await service.query({
      userId: "u1",
      chipType: "explain_answer",
      cardContext: defaultCardContext,
      responseLanguage: "en",
    });

    const usage = await usageRepo.getUsage("u1", TODAY);
    expect(usage).toBe(1);
  });

  it("returns { isLimitReached: true } when daily limit is reached", async () => {
    const { service, usageRepo } = makeService();
    usageRepo.seed("u1", TODAY, DAILY_AVO_QUERY_LIMIT);

    const result = await service.query({
      userId: "u1",
      chipType: "explain_answer",
      cardContext: defaultCardContext,
      responseLanguage: "en",
    });

    expect(result.isLimitReached).toBe(true);
    expect(result.remainingToday).toBe(0);
    expect(mockGenerateContentAvo).not.toHaveBeenCalled();
  });

  it("admin override raises limit above default", async () => {
    const { service, usageRepo } = makeService();
    const customLimit = 200;
    usageRepo.setAdminLimit("dailyAVOQueryLimit", customLimit);
    // Seed user at the default DAILY_AVO_QUERY_LIMIT (which would normally block)
    usageRepo.seed("u1", TODAY, DAILY_AVO_QUERY_LIMIT);

    const result = await service.query({
      userId: "u1",
      chipType: "explain_answer",
      cardContext: defaultCardContext,
      responseLanguage: "en",
    });

    // Because admin limit is higher, this should succeed
    expect(result.isLimitReached).toBe(false);
    expect(mockGenerateContentAvo).toHaveBeenCalledTimes(1);
  });

  it("uses Polish limit-reached message when responseLanguage is pl", async () => {
    const { service, usageRepo } = makeService();
    usageRepo.seed("u1", TODAY, DAILY_AVO_QUERY_LIMIT);

    const result = await service.query({
      userId: "u1",
      chipType: "explain_answer",
      cardContext: defaultCardContext,
      responseLanguage: "pl",
    });

    expect(result.answer).toContain("Osiągnąłeś");
  });

  it("propagates error when Gemini generateContent throws", async () => {
    const { service } = makeService();
    mockGenerateContentAvo.mockRejectedValueOnce(new Error("Gemini API unavailable"));

    await expect(
      service.query({
        userId: "u1",
        chipType: "explain_answer",
        cardContext: defaultCardContext,
        responseLanguage: "en",
      })
    ).rejects.toThrow("Gemini API unavailable");
  });

  it("remainingToday decrements after each query", async () => {
    const { service, usageRepo } = makeService();
    usageRepo.seed("u1", TODAY, DAILY_AVO_QUERY_LIMIT - 2);

    const result = await service.query({
      userId: "u1",
      chipType: "explain_answer",
      cardContext: defaultCardContext,
      responseLanguage: "en",
    });

    expect(result.remainingToday).toBe(1);
    expect(result.isLimitReached).toBe(false);
  });
});

// ── getLimit() ────────────────────────────────────────────────────────────────

describe("AvoQueryService.getLimit", () => {
  it("returns default values when no usage recorded", async () => {
    const { service } = makeService();

    const result = await service.getLimit("u1");

    expect(result.usedToday).toBe(0);
    expect(result.remainingToday).toBe(DAILY_AVO_QUERY_LIMIT);
    expect(result.dailyLimit).toBe(DAILY_AVO_QUERY_LIMIT);
    expect(result.isLimitReached).toBe(false);
  });

  it("accounts for admin override limit", async () => {
    const { service, usageRepo } = makeService();
    usageRepo.setAdminLimit("dailyAVOQueryLimit", 100);

    const result = await service.getLimit("u1");

    expect(result.dailyLimit).toBe(100);
    expect(result.remainingToday).toBe(100);
  });

  it("isLimitReached: true when usedToday >= dailyLimit", async () => {
    const { service, usageRepo } = makeService();
    usageRepo.seed("u1", TODAY, DAILY_AVO_QUERY_LIMIT);

    const result = await service.getLimit("u1");

    expect(result.isLimitReached).toBe(true);
    expect(result.remainingToday).toBe(0);
  });

  it("isolation: usage for one user does not affect another", async () => {
    const { service, usageRepo } = makeService();
    usageRepo.seed("u1", TODAY, 20);

    const resultU2 = await service.getLimit("u2");

    expect(resultU2.usedToday).toBe(0);
    expect(resultU2.remainingToday).toBe(DAILY_AVO_QUERY_LIMIT);
  });
});

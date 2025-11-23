/**
 * @jest-environment node
 */
import { registerUser, loginUser } from "../src/authHandlers";

const mockCreateUser = jest.fn();
const mockCreateCustomToken = jest.fn();
const mockDocGet = jest.fn();
const mockDocSet = jest.fn();

jest.mock("firebase-admin/auth", () => ({
  getAuth: () => ({
    createUser: mockCreateUser,
    createCustomToken: mockCreateCustomToken,
  }),
}));

jest.mock("firebase-admin/firestore", () => ({
  getFirestore: () => ({
    doc: () => ({
      get: mockDocGet,
      set: mockDocSet,
    }),
  }),
}));

const baseUserDoc = {
  id: "uid-123",
  username: "demo_user",
  email: "demo@example.com",
  settings: {
    theme: "light",
    notificationsEnabled: true,
    dailyGoal: 30,
    dailyNew: 10,
    language: "en",
  },
  createdAt: new Date(),
  updatedAt: new Date(),
  league: 1,
  currentGroupId: "unassigned",
  experiencePoints: 0,
  currencyCount: 0,
  stats: {
    totalCards: 0,
    totalDecks: 0,
    totalReviews: 0,
    averageDifficulty: 0,
    currentStreak: 0,
    longestStreak: 0,
  },
  followingCount: 0,
  followersCount: 0,
};

const mockFetch = jest.fn();

describe("authHandlers callable functions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global as any).fetch = mockFetch;
    process.env.FIREBASE_WEB_API_KEY = "test-api-key";
  });

  it("registers user and returns custom token", async () => {
    mockCreateUser.mockResolvedValueOnce({ uid: "uid-123" });
    mockCreateCustomToken.mockResolvedValueOnce("token-abc");
    mockDocGet.mockResolvedValueOnce({ exists: false });
    mockDocSet.mockResolvedValueOnce(undefined);

    const result = await registerUser({
      data: {
        email: "demo@example.com",
        password: "Password123!",
        username: "DemoUser",
      },
    } as any);

    expect(result.uid).toBe("uid-123");
    expect(result.customToken).toBe("token-abc");
    expect(mockCreateUser).toHaveBeenCalledWith(
      expect.objectContaining({ email: "demo@example.com" })
    );
    expect(mockDocSet).toHaveBeenCalledTimes(1);
  });

  it("logs user in via REST sign in endpoint", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        localId: "uid-123",
        email: "demo@example.com",
        idToken: "id-token",
        refreshToken: "refresh-token",
        expiresIn: "3600",
      }),
    });
    mockDocGet.mockResolvedValueOnce({
      exists: true,
      data: () => baseUserDoc,
    });
    mockDocSet.mockResolvedValueOnce(undefined);
    mockCreateCustomToken.mockResolvedValueOnce("token-xyz");

    const result = await loginUser({
      data: { email: "demo@example.com", password: "Password123!" },
    } as any);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("identitytoolkit.googleapis.com"),
      expect.objectContaining({
        method: "POST",
      })
    );
    expect(result.customToken).toBe("token-xyz");
    expect(result.idToken).toBe("id-token");
    expect(mockDocSet).toHaveBeenCalledWith(
      expect.objectContaining({ id: "uid-123" }),
      { merge: true }
    );
  });
});

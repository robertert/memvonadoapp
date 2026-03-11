const mockGenerateContentFP = jest.fn();
const mockDownloadFile = jest.fn();

jest.mock("@google-cloud/vertexai", () => ({
  SchemaType: {
    OBJECT: "OBJECT",
    ARRAY: "ARRAY",
    STRING: "STRING",
    INTEGER: "INTEGER",
  },
  VertexAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: mockGenerateContentFP,
    }),
  })),
}));

jest.mock("firebase-admin", () => ({
  storage: jest.fn().mockReturnValue({
    bucket: jest.fn().mockReturnValue({
      file: jest.fn().mockReturnValue({
        download: mockDownloadFile,
      }),
    }),
  }),
}));

jest.mock("firebase-functions/logger", () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

// Mock dynamic imports used in processFile
jest.mock("pdf-lib", () => ({
  PDFDocument: {
    load: jest.fn().mockResolvedValue({
      getPageCount: jest.fn().mockReturnValue(1),
    }),
    create: jest.fn().mockResolvedValue({
      copyPages: jest.fn().mockResolvedValue([{}]),
      addPage: jest.fn(),
      save: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
    }),
  },
}));

jest.mock("xlsx", () => ({
  read: jest.fn().mockReturnValue({
    SheetNames: ["Sheet1"],
    Sheets: { Sheet1: {} },
  }),
  utils: {
    sheet_to_json: jest.fn().mockReturnValue([
      ["Front 1", "Back 1"],
      ["Front 2", "Back 2"],
    ]),
  },
}));

jest.mock("mammoth", () => ({
  extractRawText: jest.fn().mockResolvedValue({ value: "Some extracted text content here." }),
}));

import { FileProcessingService } from "../../src/services/FileProcessingService";

function makeService() {
  return new FileProcessingService();
}

function makeCoTResponse(
  flashcards = [
    { front: "Front 1", back: "Back 1", tags: [] as string[] },
    { front: "Front 2", back: "Back 2", tags: [] as string[] },
  ]
) {
  return {
    response: {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  planning: {
                    detected_mode: "vocabulary",
                    detected_topic: "Test Topic",
                    target_count: flashcards.length,
                    reasoning: "Test reasoning",
                  },
                  meta: { detected_topic: "Test Topic", detected_mode: "vocabulary" },
                  flashcards,
                }),
              },
            ],
          },
        },
      ],
    },
  };
}

function makeScanResponse(flashcards = [{ front: "Front 1", back: "Back 1" }]) {
  return {
    response: {
      candidates: [
        { content: { parts: [{ text: JSON.stringify({ flashcards }) }] } },
      ],
    },
  };
}

function makeTextResponse(text = "Extracted text from image") {
  return {
    response: {
      candidates: [{ content: { parts: [{ text }] } }],
    },
  };
}

// ── classifyFile() ─────────────────────────────────────────────────────────────

describe("FileProcessingService.classifyFile", () => {
  it("recognizes IMAGE from image/jpeg", async () => {
    const service = makeService();
    const result = await service.classifyFile("image/jpeg");
    expect(result).toBe("IMAGE");
  });

  it("recognizes IMAGE from image/png", async () => {
    const service = makeService();
    const result = await service.classifyFile("image/png");
    expect(result).toBe("IMAGE");
  });

  it("recognizes IMAGE from any image/* MIME type", async () => {
    const service = makeService();
    const result = await service.classifyFile("image/webp");
    expect(result).toBe("IMAGE");
  });

  it("recognizes PDF", async () => {
    const service = makeService();
    const result = await service.classifyFile("application/pdf");
    expect(result).toBe("PDF");
  });

  it("recognizes XLSX from openxmlformats MIME type", async () => {
    const service = makeService();
    const result = await service.classifyFile(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    expect(result).toBe("XLSX");
  });

  it("recognizes XLSX from application/vnd.ms-excel", async () => {
    const service = makeService();
    const result = await service.classifyFile("application/vnd.ms-excel");
    expect(result).toBe("XLSX");
  });

  it("recognizes CSV from text/csv", async () => {
    const service = makeService();
    const result = await service.classifyFile("text/csv");
    expect(result).toBe("CSV");
  });

  it("recognizes DOCX from openxmlformats word MIME type", async () => {
    const service = makeService();
    const result = await service.classifyFile(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    expect(result).toBe("DOCX");
  });

  it("throws HttpsError for unsupported MIME type without fileName", async () => {
    const service = makeService();

    await expect(
      service.classifyFile("application/octet-stream")
    ).rejects.toThrow("Nieobsługiwany");
  });

  it("falls back to extension when MIME type is ambiguous", async () => {
    const service = makeService();

    const result = await service.classifyFile(
      "application/octet-stream",
      "document.pdf"
    );

    expect(result).toBe("PDF");
  });

  it("uses .jpg extension as IMAGE fallback", async () => {
    const service = makeService();

    const result = await service.classifyFile(
      "application/octet-stream",
      "photo.jpg"
    );

    expect(result).toBe("IMAGE");
  });

  it("throws when extension is also unsupported", async () => {
    const service = makeService();

    await expect(
      service.classifyFile("application/octet-stream", "file.xyz")
    ).rejects.toThrow("Nieobsługiwany");
  });
});

// ── processFile() — IMAGE ─────────────────────────────────────────────────────

describe("FileProcessingService.processFile (IMAGE)", () => {
  beforeEach(() => {
    mockGenerateContentFP.mockResolvedValue(makeCoTResponse());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("returns flashcards with correct fields (front, back, tags)", async () => {
    const service = makeService();

    const result = await service.processFile({
      storagePath: "uploads/user/image.jpg",
      mimeType: "image/jpeg",
      detail: "medium",
    });

    expect(result.flashcards).toHaveLength(2);
    expect(result.flashcards[0]).toMatchObject({
      front: "Front 1",
      back: "Back 1",
      tags: expect.any(Array),
    });
  });

  it("returns meta with detected_topic, detected_mode, source_type", async () => {
    const service = makeService();

    const result = await service.processFile({
      storagePath: "uploads/user/image.jpg",
      mimeType: "image/jpeg",
      detail: "medium",
    });

    expect(result.meta.detected_topic).toBe("Test Topic");
    expect(result.meta.detected_mode).toBe("vocabulary");
    expect(result.meta.source_type).toBe("IMAGE");
  });

  it("throws when Gemini returns invalid JSON", async () => {
    const service = makeService();
    mockGenerateContentFP.mockResolvedValueOnce({
      response: {
        candidates: [{ content: { parts: [{ text: "INVALID JSON {{{" }] } }],
      },
    });

    await expect(
      service.processFile({
        storagePath: "uploads/user/image.jpg",
        mimeType: "image/jpeg",
        detail: "medium",
      })
    ).rejects.toThrow();
  });

  it("passes hint to prompt when provided", async () => {
    const service = makeService();

    await service.processFile({
      storagePath: "uploads/user/image.jpg",
      mimeType: "image/jpeg",
      detail: "high",
      hint: "French vocabulary",
    });

    expect(mockGenerateContentFP).toHaveBeenCalledTimes(1);
  });
});

// ── processFile() — PDF ───────────────────────────────────────────────────────

describe("FileProcessingService.processFile (PDF)", () => {
  beforeEach(() => {
    mockDownloadFile.mockResolvedValue([Buffer.from([1, 2, 3])]);
    mockGenerateContentFP.mockResolvedValue(makeCoTResponse());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("returns flashcards with source_type: PDF", async () => {
    const service = makeService();

    const result = await service.processFile({
      storagePath: "uploads/user/doc.pdf",
      mimeType: "application/pdf",
      detail: "medium",
    });

    expect(result.meta.source_type).toBe("PDF");
    expect(result.flashcards).toHaveLength(2);
  });

  it("returns correct meta fields for PDF", async () => {
    const service = makeService();

    const result = await service.processFile({
      storagePath: "uploads/user/doc.pdf",
      mimeType: "application/pdf",
      detail: "medium",
    });

    expect(result.meta.detected_topic).toBe("Test Topic");
    expect(result.meta.detected_mode).toBe("vocabulary");
  });
});

// ── processFile() — XLSX (2 columns) ─────────────────────────────────────────

describe("FileProcessingService.processFile (XLSX — 2 columns)", () => {
  beforeEach(() => {
    mockDownloadFile.mockResolvedValue([Buffer.from([1, 2, 3])]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("returns flashcards directly from rows without calling Gemini", async () => {
    const service = makeService();

    const result = await service.processFile({
      storagePath: "uploads/user/vocab.xlsx",
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      detail: "medium",
    });

    expect(result.flashcards).toHaveLength(2);
    expect(result.flashcards[0]).toMatchObject({ front: "Front 1", back: "Back 1" });
    expect(result.meta.source_type).toBe("XLSX");
    expect(mockGenerateContentFP).not.toHaveBeenCalled();
  });
});

// ── processFile() — XLSX (N columns) ─────────────────────────────────────────

describe("FileProcessingService.processFile (XLSX — N columns)", () => {
  beforeEach(() => {
    mockDownloadFile.mockResolvedValue([Buffer.from([1, 2, 3])]);
    mockGenerateContentFP.mockResolvedValue(makeCoTResponse());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("calls Gemini when rows have more than 2 columns", async () => {
    const xlsxMock = jest.requireMock("xlsx");
    xlsxMock.utils.sheet_to_json.mockReturnValueOnce([
      ["Term", "Definition", "Example"],
      ["Bonjour", "Hello", "Bonjour, comment vas-tu?"],
    ]);
    const service = makeService();

    const result = await service.processFile({
      storagePath: "uploads/user/data.xlsx",
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      detail: "medium",
    });

    expect(mockGenerateContentFP).toHaveBeenCalledTimes(1);
    expect(result.meta.source_type).toBe("XLSX");
  });
});

// ── processFile() — DOCX ─────────────────────────────────────────────────────

describe("FileProcessingService.processFile (DOCX)", () => {
  beforeEach(() => {
    mockDownloadFile.mockResolvedValue([Buffer.from([1, 2, 3])]);
    mockGenerateContentFP.mockResolvedValue(makeCoTResponse());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("extracts text via mammoth and returns flashcards with source_type: DOCX", async () => {
    const service = makeService();

    const result = await service.processFile({
      storagePath: "uploads/user/document.docx",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      detail: "medium",
    });

    expect(result.meta.source_type).toBe("DOCX");
    expect(result.flashcards).toHaveLength(2);
    expect(mockGenerateContentFP).toHaveBeenCalledTimes(1);
  });
});

// ── processFile() — CSV ───────────────────────────────────────────────────────

describe("FileProcessingService.processFile (CSV)", () => {
  beforeEach(() => {
    mockDownloadFile.mockResolvedValue([Buffer.from([1, 2, 3])]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("returns flashcards directly from rows and sets source_type: CSV", async () => {
    const service = makeService();

    const result = await service.processFile({
      storagePath: "uploads/user/cards.csv",
      mimeType: "text/csv",
      detail: "medium",
    });

    expect(result.meta.source_type).toBe("CSV");
    expect(result.flashcards).toHaveLength(2);
    expect(mockGenerateContentFP).not.toHaveBeenCalled();
  });
});

// ── processFile() — deduplication ────────────────────────────────────────────

describe("FileProcessingService.processFile (deduplication)", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("deduplicates cards with the same front value (case-insensitive) across chunks", async () => {
    const mammothMock = jest.requireMock("mammoth");
    // TEXT_CHUNK_SIZE=12000, step=11500 → 13000 chars produces exactly 2 chunks
    mammothMock.extractRawText.mockResolvedValueOnce({ value: "a".repeat(13000) });
    mockDownloadFile.mockResolvedValueOnce([Buffer.from([1, 2, 3])]);

    mockGenerateContentFP
      .mockResolvedValueOnce(
        makeCoTResponse([{ front: "Capital of France", back: "Paris", tags: [] }])
      )
      .mockResolvedValueOnce(
        makeCoTResponse([
          { front: "CAPITAL OF FRANCE", back: "Paris again", tags: [] },
          { front: "Big Ben", back: "London", tags: [] },
        ])
      );

    const service = makeService();
    const result = await service.processFile({
      storagePath: "uploads/user/long.docx",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      detail: "medium",
    });

    expect(result.flashcards).toHaveLength(2);
    expect(result.flashcards[0].front).toBe("Capital of France");
    expect(result.flashcards[1].front).toBe("Big Ben");
  });
});

// ── extractTextFromImage() ────────────────────────────────────────────────────

describe("FileProcessingService.extractTextFromImage", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("returns { success: true, text } on success", async () => {
    const service = makeService();
    mockGenerateContentFP.mockResolvedValueOnce(makeTextResponse("Hello world text"));

    const result = await service.extractTextFromImage({
      storagePath: "uploads/user/scan.jpg",
      mimeType: "image/jpeg",
    });

    expect(result.success).toBe(true);
    expect(result.text).toBe("Hello world text");
    expect(result.error).toBeNull();
  });

  it("returns { success: true, text: null } when no text is detected", async () => {
    const service = makeService();
    mockGenerateContentFP.mockResolvedValueOnce(makeTextResponse(""));

    const result = await service.extractTextFromImage({
      storagePath: "uploads/user/blank.jpg",
    });

    expect(result.success).toBe(true);
    expect(result.text).toBeNull();
  });

  it("returns { success: false, error } when Gemini throws", async () => {
    const service = makeService();
    mockGenerateContentFP.mockRejectedValueOnce(new Error("API unavailable"));

    const result = await service.extractTextFromImage({
      storagePath: "uploads/user/image.jpg",
    });

    expect(result.success).toBe(false);
    expect(result.text).toBeNull();
    expect(result.error).toBeTruthy();
  });
});

// ── scanDocument() ────────────────────────────────────────────────────────────

describe("FileProcessingService.scanDocument", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("returns flashcards without meta field", async () => {
    const service = makeService();
    mockGenerateContentFP.mockResolvedValueOnce(
      makeScanResponse([
        { front: "Q1", back: "A1" },
        { front: "Q2", back: "A2" },
      ])
    );

    const result = await service.scanDocument({
      storagePath: "uploads/user/doc.pdf",
    });

    expect(result.flashcards).toHaveLength(2);
    expect(result.flashcards[0]).toMatchObject({ front: "Q1", back: "A1" });
    expect((result as any).meta).toBeUndefined();
  });

  it("returns empty array when document yields no flashcards", async () => {
    const service = makeService();
    mockGenerateContentFP.mockResolvedValueOnce(makeScanResponse([]));

    const result = await service.scanDocument({
      storagePath: "uploads/user/empty.pdf",
    });

    expect(result.flashcards).toHaveLength(0);
  });

  it("uses provided mimeType in the request", async () => {
    const service = makeService();
    mockGenerateContentFP.mockResolvedValueOnce(makeScanResponse());

    await service.scanDocument({
      storagePath: "uploads/user/image.jpg",
      mimeType: "image/jpeg",
    });

    expect(mockGenerateContentFP).toHaveBeenCalledTimes(1);
  });
});

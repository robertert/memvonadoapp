import { onCall, HttpsError } from "firebase-functions/v2/https";
import { SchemaType, VertexAI } from "@google-cloud/vertexai";
import {
  ProcessFileRequestSchema,
  ProcessFileResponseSchema,
} from "memvocado-types/schemas/api/processFile";
import * as logger from "firebase-functions/logger";
import { serializeTimestamps } from "./utils/serialization";
import { z } from "zod";
import * as admin from "firebase-admin";

// Vertex AI
const vertexAI = new VertexAI({
  project: process.env.GCLOUD_PROJECT,
  location: "us-central1",
});

// Internal Zod schema for Gemini JSON response
const GeminiResponseSchema = z.object({
  meta: z.object({
    detected_topic: z.string(),
    detected_mode: z.enum(["vocabulary", "exam_qa", "concept"]),
  }),
  flashcards: z.array(
    z.object({
      front: z.string(),
      back: z.string(),
      tags: z.array(z.string()).default([]),
    })
  ),
});

type GeminiResponseType = z.infer<typeof GeminiResponseSchema>;

// ── File type classification ──────────────────────────────────────────
type FileType = "IMAGE" | "PDF" | "XLSX" | "CSV" | "DOCX";


const EXTENSION_TO_FILE_TYPE: Record<string, FileType> = {
  ".jpg": "IMAGE",
  ".jpeg": "IMAGE",
  ".png": "IMAGE",
  ".gif": "IMAGE",
  ".webp": "IMAGE",
  ".bmp": "IMAGE",
  ".heic": "IMAGE",
  ".heif": "IMAGE",
  ".pdf": "PDF",
  ".xlsx": "XLSX",
  ".xls": "XLSX",
  ".csv": "CSV",
  ".docx": "DOCX",
};

const outputSchema = {
  type: SchemaType.OBJECT,
  properties: {
    planning: {
      type: SchemaType.OBJECT,
      properties: {
        detected_mode: { type: SchemaType.STRING, enum: ["vocabulary", "exam_qa", "concept"] },
        detected_topic: { type: SchemaType.STRING },
        target_count: { type: SchemaType.INTEGER },
        reasoning: { type: SchemaType.STRING },
      },
      required: ["detected_mode", "detected_topic", "target_count", "reasoning"],
    },
    meta: {
      type: SchemaType.OBJECT,
      properties: {
        detected_topic: { type: SchemaType.STRING },
        detected_mode: { type: SchemaType.STRING, enum: ["vocabulary", "exam_qa", "concept"] },
      },
      required: ["detected_topic", "detected_mode"],
    },
    flashcards: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          front: { type: SchemaType.STRING },
          back: { type: SchemaType.STRING },
          tags: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        },
        required: ["front", "back", "tags"],
      },
    },
  },
  required: ["planning", "meta", "flashcards"],
};

const SUPPORTED_FORMATS_LABEL =
  "Obsługiwane formaty: JPG, PNG, PDF, XLSX, CSV, DOCX";

/**
 * Classify file type based on MIME type and file name.
 * Falls back to extension matching when MIME is generic/unknown.
 * @param {string} mimeType - MIME type of the file
 * @param {string} fileName - File name of the file
 * @return {FileType} File type
 */
function classifyFile(mimeType: string, fileName?: string): FileType {
  const mime = mimeType.toLowerCase();

  // 1. Try MIME type first
  if (mime.startsWith("image/")) return "IMAGE";
  if (mime === "application/pdf") return "PDF";
  if (
    mime ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    mime === "application/vnd.ms-excel"
  ) return "XLSX";
  if (mime === "text/csv") return "CSV";
  if (
    mime ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) return "DOCX";

  // 2. Fallback: try file extension (mobile devices often send
  //    application/octet-stream or wrong MIME)
  if (fileName) {
    const ext = fileName.slice(fileName.lastIndexOf(".")).toLowerCase();
    const fromExt = EXTENSION_TO_FILE_TYPE[ext];
    if (fromExt) {
      logger.info("classifyFile: MIME miss, matched by extension", {
        mimeType,
        fileName,
        resolvedType: fromExt,
      });
      return fromExt;
    }
  }

  throw new HttpsError(
    "invalid-argument",
    `Nieobsługiwany typ pliku: ${mimeType}${fileName ? ` (${fileName})` : ""}. ${SUPPORTED_FORMATS_LABEL}`
  );
}

// ── Storage helpers ───────────────────────────────────────────────────

/**
 * Build Google Storage URI from storage path
 * @param {string} storagePath - Storage path
 * @return {string} Google Storage URI
 */
function buildGsUri(storagePath: string): string {
  return storagePath.startsWith("gs://")
    ? storagePath
    : `gs://${process.env.GCLOUD_PROJECT}.appspot.com/${storagePath}`;
}

/**
 * Download file from Google Storage
 * @param {string} storagePath - Storage path
 * @return {Promise<Buffer>} File buffer
 */
async function downloadFile(storagePath: string): Promise<Buffer> {
  const bucket = admin.storage().bucket();
  const [fileBuffer] = await bucket.file(storagePath).download();
  return fileBuffer;
}

// ── Detail level config ───────────────────────────────────────────────
type DetailLevel = "low" | "medium" | "high";

const DETAIL_DESCRIPTIONS: Record<DetailLevel, string> = {
  low: "ZWIĘŹLE — Stwórz minimalną liczbę fiszek pokrywających TYLKO najważniejsze pojęcia, kluczowe definicje i główne tezy. Pomiń detale, daty drugorzędne i szczegółowe wyliczenia.",
  medium: "ZRÓWNOWAŻENIE — Stwórz umiarkowaną liczbę fiszek pokrywających wszystkie istotne pojęcia, definicje i procesy. Zachowaj równowagę między szczegółowością a zwięzłością.",
  high: "SZCZEGÓŁOWO — Stwórz maksymalną liczbę fiszek pokrywających 100% merytoryki materiału. Nie pomijaj żadnych detali: definicje, daty, nazwiska, procesy, wyliczenia, zależności przyczynowo-skutkowe. Zasada atomowości: jedna fiszka = jedna informacja.",
};

// ── Single-prompt Chain-of-Thought ───────────────────────────────────

// Extended Zod schema — includes the planning fields in the response
const GeminiCoTResponseSchema = z.object({
  planning: z.object({
    detected_mode: z.enum(["vocabulary", "exam_qa", "concept"]),
    detected_topic: z.string(),
    target_count: z.number().int().min(1),
    reasoning: z.string(),
  }),
  meta: z.object({
    detected_topic: z.string(),
    detected_mode: z.enum(["vocabulary", "exam_qa", "concept"]),
  }),
  flashcards: z.array(
    z.object({
      front: z.string(),
      back: z.string(),
      tags: z.array(z.string()).default([]),
    })
  ),
});

/**
 * Build a single chain-of-thought prompt.
 * Gemini must first fill "planning" (analyze + decide count),
 * then produce "flashcards" matching that count — all in one JSON.
 * @param {string} sourceType - Source type label
 * @param {DetailLevel} detail - User detail level
 * @param {string} hint - Optional hint
 * @return {string} CoT prompt
 */
function buildCoTPrompt(
  sourceType: string,
  detail: DetailLevel,
  hint?: string | null
): string {
  return `
Jesteś bezwzględnym "Ekstraktorem Wiedzy" do tworzenia fiszek (Anki). Twoim celem jest MAKSYMALIZACJA liczby fiszek przy zachowaniu wysokiej jakości. Twoim wrogiem jest streszczanie.

KONTEKST ŹRÓDŁA: ${sourceType}
${hint ? `WSKAZÓWKA UŻYTKOWNIKA: ${hint}` : ""}
POZIOM SZCZEGÓŁOWOŚCI: ${DETAIL_DESCRIPTIONS[detail]} (High Granularity)

═══════════════════════════════════════
KROK 1 — ANALIZA I MATEMATYKA (chain-of-thought)
═══════════════════════════════════════
Przeanalizuj materiał i wypełnij sekcję "planning" według surowych reguł:

1. **detected_mode**:
   - "vocabulary" (słówka/wyrażenia)
   - "exam_qa" (baza pytań/test)
   - "concept" (tekst ciągły/artykuł)

2. **target_count (KLUCZOWE)** — Oblicz minimalną liczbę fiszek:
   - Dla "vocabulary"/"exam_qa": MUSISZ policzyć każdą pozycję. Jeśli jest 50 słówek, target_count = 50.
   - Dla "concept": Podziel tekst na logiczne atomy informacji.
     - Reguła Gęstości: Przyjmij średnio 1 fiszkę na każde 30-50 słów tekstu źródłowego.
     - Jeśli tekst jest długi, a Ty planujesz mniej niż 15 fiszek, prawdopodobnie popełniasz błąd "nadmiernego streszczania".

3. **strategy**:
   - Jak rozbijesz długie akapity na pojedyncze fakty?

═══════════════════════════════════════
KROK 2 — EKSTRAKCJA (Strict Rules)
═══════════════════════════════════════
Generując fiszki, trzymaj się tych zasad (ZŁAMANIE ICH POWODUJE BŁĄD SYSTEMU):

1. ZASADA ATOMOWOŚCI: Jedna fiszka = Jeden, prosty fakt.
   - ŹLE: "Opisz przyczyny i skutki X" (To zbyt złożone).
   - DOBRZE: Fiszka 1: "Jaka była bezpośrednia przyczyna X?", Fiszka 2: "Jaki był skutek gospodarczy X?".

2. ZASADA ROZBIJANIA LIST (Anti-Grouping):
   - Jeśli tekst wymienia "5 cech stylu romańskiego", NIE twórz jednej fiszki "Wymień cechy".
   - STWÓRZ 5 OSOBNYCH FISZEK, np. "Czy grube mury są cechą stylu romańskiego?", "Jakie okna charakteryzują styl romański?".

3. ZAKAZ STRESZCZANIA:
   - Nie ignoruj "mniej ważnych" informacji. Użytkownik chce się nauczyć CAŁEGO materiału, a nie tylko głównych nagłówków.

4. DLA TRYBU "exam_qa" / "vocabulary":
   - Mapowanie musi być 1:1. Nie pomijaj żadnego pytania ani słówka z listy wejściowej.

═══════════════════════════════════════
FORMAT WYJŚCIOWY — JSON:
═══════════════════════════════════════
{
  "planning": {
    "detected_mode": "vocabulary" | "exam_qa" | "concept",
    "detected_topic": "Główny temat materiału",
    "target_count": <liczba_całkowita_min_1>,
    "reasoning": "Krótkie uzasadnienie, dlaczego tyle fiszek i jaki przyjęto tryb."
  },
  "meta": {
    "detected_topic": "To samo co w planning",
    "detected_mode": "To samo co w planning"
  },
  "flashcards": [
    {
      "front": "Pytanie lub pojęcie",
      "back": "Odpowiedź lub definicja",
      "tags": ["tag1", "tag2"]
    }
  ]
}
`.trim();
}

/**
 * Parse CoT response into standard GeminiResponseType, logging planning info.
 * @param {string} responseText - Raw JSON from Gemini
 * @return {GeminiResponseType} Parsed response
 */
function parseCoTResponse(responseText: string): GeminiResponseType {
  const parsed = GeminiCoTResponseSchema.parse(JSON.parse(responseText));

  logger.info("CoT planning", {
    mode: parsed.planning.detected_mode,
    topic: parsed.planning.detected_topic,
    targetCount: parsed.planning.target_count,
    actualCount: parsed.flashcards.length,
    reasoning: parsed.planning.reasoning,
  });

  // Return the standard shape (without planning)
  return {
    meta: parsed.meta,
    flashcards: parsed.flashcards,
  };
}

/**
 * Merge multiple GeminiResponseType results, deduplicating flashcards
 * from overlapping pages/chunks.
 * @param {GeminiResponseType[]} results - Array of results to merge
 * @return {GeminiResponseType} Merged result
 */
function mergeChunkResults(results: GeminiResponseType[]): GeminiResponseType {
  const allFlashcards: GeminiResponseType["flashcards"] = [];
  const seen = new Set<string>();

  for (const r of results) {
    for (const card of r.flashcards) {
      // Deduplicate by front text (overlap pages may produce duplicates)
      const key = card.front.trim().toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        allFlashcards.push(card);
      }
    }
  }

  const lastMeta = results[results.length - 1]?.meta;

  return {
    meta: lastMeta || {
      detected_topic: "Dokument",
      detected_mode: "concept",
    },
    flashcards: allFlashcards,
  };
}

/**
 * Process a single text chunk with Gemini (no splitting).
 * @param {string} text - Text chunk
 * @param {string} sourceType - Source type
 * @param {DetailLevel} detail - Detail level
 * @param {number} chunkIndex - Chunk index (for fragment label)
 * @param {number} totalChunks - Total number of chunks
 * @param {string} hint - Optional hint
 * @return {Promise<GeminiResponseType>} Gemini response
 */
async function processTextChunkWithGemini(
  text: string,
  sourceType: string,
  detail: DetailLevel,
  chunkIndex: number,
  totalChunks: number,
  hint?: string | null
): Promise<GeminiResponseType> {
  const model = vertexAI.getGenerativeModel({
    model: "gemini-2.0-flash-001",
    generationConfig: { responseMimeType: "application/json", temperature: 0.2, responseSchema: outputSchema },
  });

  const prompt = buildCoTPrompt(sourceType, detail, hint);
  const fragmentLabel = totalChunks > 1
    ? `\n\n(Fragment ${chunkIndex + 1} z ${totalChunks})`
    : "";

  const result = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
          { text: `\n\n--- MATERIAŁ DO PRZETWORZENIA ---${fragmentLabel}\n\n${text}` },
        ],
      },
    ],
  });

  const responseText =
    result.response.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!responseText) throw new Error(`Brak odpowiedzi od AI (chunk ${chunkIndex + 1})`);

  return parseCoTResponse(responseText);
}

// ~3000 tokens ≈ ~12000 characters, overlap ~500 chars to preserve context at boundaries
const TEXT_CHUNK_SIZE = 12000;
const TEXT_CHUNK_OVERLAP = 500;

/**
 * Split text into overlapping chunks of ~12000 chars (~3000 tokens).
 * @param {string} text - Full text
 * @return {string[]} Array of text chunks
 */
function splitTextIntoChunks(text: string): string[] {
  const chunks: string[] = [];
  const step = TEXT_CHUNK_SIZE - TEXT_CHUNK_OVERLAP;

  for (let start = 0; start < text.length; start += step) {
    chunks.push(text.slice(start, start + TEXT_CHUNK_SIZE));
    if (start + TEXT_CHUNK_SIZE >= text.length) break;
  }

  return chunks;
}

/**
 * Process text with Gemini — splits into ~3000-token chunks with overlap
 * for long texts, processes all chunks in parallel.
 * @param {string} text - Text to process
 * @param {string} sourceType - Source type
 * @param {DetailLevel} detail - Detail level
 * @param {string} hint - Optional hint
 * @return {Promise<GeminiResponseType>} Gemini response
 */
async function processTextWithGemini(
  text: string,
  sourceType: string,
  detail: DetailLevel = "medium",
  hint?: string | null
): Promise<GeminiResponseType> {
  // Short text — single call
  if (text.length <= TEXT_CHUNK_SIZE) {
    return processTextChunkWithGemini(text, sourceType, detail, 0, 1, hint);
  }

  // Long text — split, process in parallel, merge
  const chunks = splitTextIntoChunks(text);

  logger.info("Text chunked for parallel processing", {
    sourceType,
    totalLength: text.length,
    chunkCount: chunks.length,
  });

  const results = await Promise.all(
    chunks.map((chunk, i) =>
      processTextChunkWithGemini(chunk, sourceType, detail, i, chunks.length, hint)
    )
  );

  return mergeChunkResults(results);
}

// ── Processors ────────────────────────────────────────────────────────

/**
 * Process a multimodal file (image/PDF) with single-prompt CoT.
 * @param {object} filePart - Gemini fileData part
 * @param {string} sourceType - Source type label
 * @param {DetailLevel} detail - Detail level
 * @param {string} hint - Optional hint
 * @return {Promise<GeminiResponseType>} Generated flashcards
 */
async function processMultimodalCoT(
  filePart: { fileData: { fileUri: string; mimeType: string } },
  sourceType: string,
  detail: DetailLevel,
  hint?: string | null
): Promise<GeminiResponseType> {
  const model = vertexAI.getGenerativeModel({
    model: "gemini-2.0-flash-001",
    generationConfig: { responseMimeType: "application/json", temperature: 0.2, responseSchema: outputSchema },
  });

  const prompt = buildCoTPrompt(sourceType, detail, hint);
  const result = await model.generateContent({
    contents: [{ role: "user", parts: [filePart, { text: prompt }] }],
  });

  const responseText =
    result.response.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!responseText) throw new Error("Brak odpowiedzi od AI");

  return parseCoTResponse(responseText);
}

/**
 * Process image with Gemini (2-phase)
 * @param {string} storagePath - Storage path
 * @param {string} mimeType - MIME type
 * @param {DetailLevel} detail - Detail level
 * @param {string} hint - Hint
 * @return {Promise<GeminiResponseType>} Gemini response
 */
async function processImage(
  storagePath: string,
  mimeType: string,
  detail: DetailLevel,
  hint?: string | null
): Promise<GeminiResponseType> {
  const filePart = {
    fileData: {
      fileUri: buildGsUri(storagePath),
      mimeType,
    },
  };

  return processMultimodalCoT(filePart, "SKAN_OBRAZU", detail, hint);
}

/**
 * Process a single PDF chunk (sub-PDF buffer) via multimodal inline data.
 * @param {Buffer} pdfBuffer - PDF chunk as buffer
 * @param {string} sourceType - Source type label
 * @param {number} chunkIndex - Chunk index (for logging)
 * @param {number} totalChunks - Total number of chunks
 * @param {DetailLevel} detail - Detail level
 * @param {string} hint - Optional hint
 * @return {Promise<GeminiResponseType>} Generated flashcards
 */
async function processInlinePdfChunk(
  pdfBuffer: Buffer,
  sourceType: string,
  chunkIndex: number,
  totalChunks: number,
  detail: DetailLevel,
  hint?: string | null
): Promise<GeminiResponseType> {
  const model = vertexAI.getGenerativeModel({
    model: "gemini-2.0-flash-001",
    generationConfig: { responseMimeType: "application/json", temperature: 0.2, responseSchema: outputSchema },
  });

  const prompt = buildCoTPrompt(sourceType, detail, hint);
  const result = await model.generateContent({
    contents: [{
      role: "user",
      parts: [
        {
          inlineData: {
            data: pdfBuffer.toString("base64"),
            mimeType: "application/pdf",
          },
        },
        { text: `${prompt}\n\n(Fragment ${chunkIndex + 1} z ${totalChunks})` },
      ],
    }],
  });

  const responseText =
    result.response.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!responseText) throw new Error(`Brak odpowiedzi od AI (chunk ${chunkIndex + 1})`);

  return parseCoTResponse(responseText);
}

/**
 * Split a PDF buffer into page-range chunks (5 pages each, 1 page overlap).
 * @param {Buffer} fileBuffer - Full PDF buffer
 * @return {Promise<Buffer[]>} Array of sub-PDF buffers
 */
async function splitPdfIntoChunks(fileBuffer: Buffer): Promise<{ chunks: Buffer[]; pageCount: number }> {
  const { PDFDocument } = await import("pdf-lib");
  const srcDoc = await PDFDocument.load(fileBuffer);
  const pageCount = srcDoc.getPageCount();

  const CHUNK_SIZE = 5;
  const OVERLAP = 1;
  const chunks: Buffer[] = [];

  for (let start = 0; start < pageCount; start += CHUNK_SIZE - OVERLAP) {
    const end = Math.min(start + CHUNK_SIZE, pageCount);
    const newDoc = await PDFDocument.create();
    const pageIndices = Array.from({ length: end - start }, (_, i) => start + i);
    const copiedPages = await newDoc.copyPages(srcDoc, pageIndices);
    for (const page of copiedPages) {
      newDoc.addPage(page);
    }
    chunks.push(Buffer.from(await newDoc.save()));

    // If we've reached the end, stop
    if (end >= pageCount) break;
  }

  return { chunks, pageCount };
}

/**
 * Process PDF with Gemini — splits into 5-page chunks (1-page overlap)
 * for PDFs with >5 pages, processes all chunks in parallel.
 * @param {string} storagePath - Storage path
 * @param {DetailLevel} detail - Detail level
 * @param {string} hint - Hint
 * @return {Promise<GeminiResponseType>} Gemini response
 */
async function processPdf(
  storagePath: string,
  detail: DetailLevel,
  hint?: string | null
): Promise<GeminiResponseType> {
  const bucket = admin.storage().bucket();
  const file = bucket.file(storagePath);
  const [fileBuffer] = await file.download();

  // Check page count
  const { PDFDocument } = await import("pdf-lib");
  const srcDoc = await PDFDocument.load(fileBuffer);
  const pageCount = srcDoc.getPageCount();

  logger.info("PDF page count", { storagePath, pageCount });

  // 5 pages or fewer — process as a single file (multimodal if small enough)
  if (pageCount <= 5) {
    const fileSizeBytes = fileBuffer.length;
    const fileSizeMB = fileSizeBytes / (1024 * 1024);

    if (fileSizeMB < 15) {
      const filePart = {
        fileData: {
          fileUri: buildGsUri(storagePath),
          mimeType: "application/pdf",
        },
      };
      return processMultimodalCoT(filePart, "DOKUMENT_PDF", detail, hint);
    }

    // Small page count but large file — use inline data
    return processInlinePdfChunk(
      fileBuffer, "DOKUMENT_PDF", 0, 1, detail, hint
    );
  }

  // >5 pages — split into 5-page chunks with 1-page overlap
  const { chunks } = await splitPdfIntoChunks(fileBuffer);

  logger.info("PDF chunked for parallel processing", {
    storagePath,
    pageCount,
    chunkCount: chunks.length,
  });

  // Process all chunks in parallel
  const results = await Promise.all(
    chunks.map((chunk, i) =>
      processInlinePdfChunk(
        chunk,
        "DOKUMENT_PDF (fragment)",
        i,
        chunks.length,
        detail,
        hint
      )
    )
  );

  return mergeChunkResults(results);
}

/**
 * Process spreadsheet with Gemini
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} mimeType - MIME type
 * @param {DetailLevel} detail - Detail level
 * @param {string} hint - Hint
 * @return {Promise<GeminiResponseType>} Gemini response
 */
async function processSpreadsheet(
  fileBuffer: Buffer,
  mimeType: string,
  detail: DetailLevel,
  hint?: string | null
): Promise<GeminiResponseType> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(fileBuffer, { type: "buffer" });

  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new HttpsError(
      "failed-precondition",
      "Arkusz jest pusty"
    );
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rows: string[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
  });

  // Filter out empty rows
  const nonEmptyRows = rows.filter((row) =>
    row.some((cell) => String(cell).trim() !== "")
  );

  if (nonEmptyRows.length === 0) {
    throw new HttpsError(
      "failed-precondition",
      "Arkusz nie zawiera danych"
    );
  }

  // Check if exactly 2 columns → direct mapping (no AI needed)
  const maxCols = Math.max(...nonEmptyRows.map((r) => r.length));

  if (maxCols === 2) {
    // Direct front/back mapping
    const flashcards = nonEmptyRows
      .filter(
        (row) =>
          String(row[0]).trim() !== "" && String(row[1]).trim() !== ""
      )
      .map((row) => ({
        front: String(row[0]).trim(),
        back: String(row[1]).trim(),
        tags: [] as string[],
      }));

    return {
      meta: {
        detected_topic: hint || "Import z arkusza",
        detected_mode: "vocabulary" as const,
      },
      flashcards,
    };
  }

  // More than 2 columns → format as text and send to Gemini
  const textRows = nonEmptyRows.map((row) => row.join(" | ")).join("\n");
  return processTextWithGemini(
    textRows,
    "DANE_ARKUSZA",
    detail,
    hint
  );
}

/**
 * Process DOCX with Gemini
 * @param {Buffer} fileBuffer - File buffer
 * @param {DetailLevel} detail - Detail level
 * @param {string} hint - Hint
 * @return {Promise<GeminiResponseType>} Gemini response
 */
async function processDocx(
  fileBuffer: Buffer,
  detail: DetailLevel,
  hint?: string | null
): Promise<GeminiResponseType> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer: fileBuffer });
  const text = result.value.trim();

  if (!text) {
    throw new HttpsError(
      "failed-precondition",
      "Dokument DOCX nie zawiera tekstu"
    );
  }

  return processTextWithGemini(text, "DOKUMENT_DOCX", detail, hint);
}

// ── Main Cloud Function ───────────────────────────────────────────────
export const processFile = onCall(
  {
    memory: "1GiB",
    timeoutSeconds: 120,
  },
  async (request) => {
    // Auth check
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    logger.info(request.data);
    // Validate request
    const validationResult = ProcessFileRequestSchema.safeParse(
      request.data || {}
    );
    if (!validationResult.success) {
      throw new HttpsError("invalid-argument", "Invalid request data", {
        issues: validationResult.error.issues,
      });
    }

    const { storagePath, mimeType, hint, fileName, detail } =
      validationResult.data;

    try {
      const fileType = classifyFile(mimeType, fileName);

      logger.info("Processing file", {
        userId: request.auth.uid,
        fileType,
        mimeType,
        fileName,
        detail,
      });

      let result: GeminiResponseType;

      switch (fileType) {
        case "IMAGE":
          result = await processImage(storagePath, mimeType, detail, hint);
          break;

        case "PDF":
          result = await processPdf(storagePath, detail, hint);
          break;

        case "XLSX":
        case "CSV": {
          const fileBuffer = await downloadFile(storagePath);
          result = await processSpreadsheet(
            fileBuffer, mimeType, detail, hint
          );
          break;
        }

        case "DOCX": {
          const fileBuffer = await downloadFile(storagePath);
          result = await processDocx(fileBuffer, detail, hint);
          break;
        }
      }

      logger.info("File processed successfully", {
        userId: request.auth.uid,
        flashcardCount: result.flashcards.length,
        mode: result.meta.detected_mode,
      });

      const response = {
        meta: {
          ...result.meta,
          source_type: fileType,
        },
        flashcards: result.flashcards,
      };

      const validatedResponse = ProcessFileResponseSchema.parse(response);
      return serializeTimestamps(validatedResponse);
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }
      logger.error("File processing failed", error);
      throw new HttpsError("internal", "Nie udało się przetworzyć pliku", {
        issues: error,
      });
    }
  }
);

import { SchemaType, VertexAI } from "@google-cloud/vertexai";
import * as logger from "firebase-functions/logger";
import { HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { z } from "zod";

const vertexAI = new VertexAI({
  project: process.env.GCLOUD_PROJECT,
  location: "us-central1",
});

// ── Types ─────────────────────────────────────────────────────────────
type FileType = "IMAGE" | "PDF" | "XLSX" | "CSV" | "DOCX";
type DetailLevel = "low" | "medium" | "high";

const EXTENSION_TO_FILE_TYPE: Record<string, FileType> = {
  ".jpg": "IMAGE", ".jpeg": "IMAGE", ".png": "IMAGE", ".gif": "IMAGE",
  ".webp": "IMAGE", ".bmp": "IMAGE", ".heic": "IMAGE", ".heif": "IMAGE",
  ".pdf": "PDF", ".xlsx": "XLSX", ".xls": "XLSX", ".csv": "CSV", ".docx": "DOCX",
};

const SUPPORTED_FORMATS_LABEL = "Obsługiwane formaty: JPG, PNG, PDF, XLSX, CSV, DOCX";

// ── Zod schemas ───────────────────────────────────────────────────────
const GeminiResponseSchema = z.object({
  meta: z.object({
    detected_topic: z.string(),
    detected_mode: z.enum(["vocabulary", "exam_qa", "concept"]),
  }),
  flashcards: z.array(z.object({ front: z.string(), back: z.string(), tags: z.array(z.string()).default([]) })),
});
type GeminiResponseType = z.infer<typeof GeminiResponseSchema>;

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
  flashcards: z.array(z.object({ front: z.string(), back: z.string(), tags: z.array(z.string()).default([]) })),
});

const flashcardSchema = z.object({ front: z.string(), back: z.string() });
const flashcardsSchema = z.object({ flashcards: z.array(flashcardSchema) });

// ── Gemini output schema ──────────────────────────────────────────────
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

// ── Detail level config ───────────────────────────────────────────────
const DETAIL_DESCRIPTIONS: Record<DetailLevel, string> = {
  low: "ZWIĘŹLE — Stwórz minimalną liczbę fiszek pokrywających TYLKO najważniejsze pojęcia, kluczowe definicje i główne tezy. Pomiń detale, daty drugorzędne i szczegółowe wyliczenia.",
  medium: "ZRÓWNOWAŻENIE — Stwórz umiarkowaną liczbę fiszek pokrywających wszystkie istotne pojęcia, definicje i procesy. Zachowaj równowagę między szczegółowością a zwięzłością.",
  high: "SZCZEGÓŁOWO — Stwórz maksymalną liczbę fiszek pokrywających 100% merytoryki materiału. Nie pomijaj żadnych detali: definicje, daty, nazwiska, procesy, wyliczenia, zależności przyczynowo-skutkowe. Zasada atomowości: jedna fiszka = jedna informacja.",
};

const TEXT_CHUNK_SIZE = 12000;
const TEXT_CHUNK_OVERLAP = 500;

// ── Helpers ───────────────────────────────────────────────────────────
function buildGsUri(storagePath: string): string {
  return storagePath.startsWith("gs://")
    ? storagePath
    : `gs://${process.env.GCLOUD_PROJECT}.appspot.com/${storagePath}`;
}

async function downloadFile(storagePath: string): Promise<Buffer> {
  const bucket = admin.storage().bucket();
  const [fileBuffer] = await bucket.file(storagePath).download();
  return fileBuffer;
}

function splitTextIntoChunks(text: string): string[] {
  const chunks: string[] = [];
  const step = TEXT_CHUNK_SIZE - TEXT_CHUNK_OVERLAP;
  for (let start = 0; start < text.length; start += step) {
    chunks.push(text.slice(start, start + TEXT_CHUNK_SIZE));
    if (start + TEXT_CHUNK_SIZE >= text.length) break;
  }
  return chunks;
}

function mergeChunkResults(results: GeminiResponseType[]): GeminiResponseType {
  const allFlashcards: GeminiResponseType["flashcards"] = [];
  const seen = new Set<string>();
  for (const r of results) {
    for (const card of r.flashcards) {
      const key = card.front.trim().toLowerCase();
      if (!seen.has(key)) { seen.add(key); allFlashcards.push(card); }
    }
  }
  const lastMeta = results[results.length - 1]?.meta;
  return { meta: lastMeta || { detected_topic: "Dokument", detected_mode: "concept" }, flashcards: allFlashcards };
}

function buildCoTPrompt(sourceType: string, detail: DetailLevel, hint?: string | null): string {
  return `
Jesteś bezwzględnym "Ekstraktorem Wiedzy" do tworzenia fiszek (Anki). Twoim celem jest MAKSYMALIZACJA liczby fiszek przy zachowaniu wysokiej jakości. Twoim wrogiem jest streszczanie.

KONTEKST ŹRÓDŁA: ${sourceType}
${hint ? `WSKAZÓWKA UŻYTKOWNIKA: ${hint}` : ""}
POZIOM SZCZEGÓŁOWOŚCI: ${DETAIL_DESCRIPTIONS[detail]} (High Granularity)

═══════════════════════════════════════
KROK 1 — ANALIZA I MATEMATYKA (chain-of-thought)
═══════════════════════════════════════
Przeanalizuj materiał i wypełnij sekcję "planning" według surowych reguł:

1. **detected_mode**: "vocabulary" | "exam_qa" | "concept"
2. **target_count (KLUCZOWE)** — Oblicz minimalną liczbę fiszek:
   - Dla "vocabulary"/"exam_qa": MUSISZ policzyć każdą pozycję.
   - Dla "concept": 1 fiszka na każde 30-50 słów.
3. **strategy**: Jak rozbijesz długie akapity na pojedyncze fakty?

═══════════════════════════════════════
KROK 2 — EKSTRAKCJA (Strict Rules)
═══════════════════════════════════════
1. ZASADA ATOMOWOŚCI: Jedna fiszka = Jeden, prosty fakt.
2. ZASADA ROZBIJANIA LIST: Jeśli tekst wymienia 5 cech, stwórz 5 osobnych fiszek.
3. ZAKAZ STRESZCZANIA: Nie ignoruj mniej ważnych informacji.
4. DLA TRYBU "exam_qa"/"vocabulary": Mapowanie musi być 1:1.

FORMAT WYJŚCIOWY — JSON:
{ "planning": { "detected_mode": "...", "detected_topic": "...", "target_count": N, "reasoning": "..." }, "meta": { "detected_topic": "...", "detected_mode": "..." }, "flashcards": [{ "front": "...", "back": "...", "tags": [] }] }
`.trim();
}

function parseCoTResponse(responseText: string): GeminiResponseType {
  const parsed = GeminiCoTResponseSchema.parse(JSON.parse(responseText));
  logger.info("CoT planning", { mode: parsed.planning.detected_mode, topic: parsed.planning.detected_topic, targetCount: parsed.planning.target_count, actualCount: parsed.flashcards.length });
  return { meta: parsed.meta, flashcards: parsed.flashcards };
}

async function processTextChunkWithGemini(text: string, sourceType: string, detail: DetailLevel, chunkIndex: number, totalChunks: number, hint?: string | null): Promise<GeminiResponseType> {
  const model = vertexAI.getGenerativeModel({ model: "gemini-2.0-flash-001", generationConfig: { responseMimeType: "application/json", temperature: 0.2, responseSchema: outputSchema } });
  const prompt = buildCoTPrompt(sourceType, detail, hint);
  const fragmentLabel = totalChunks > 1 ? `\n\n(Fragment ${chunkIndex + 1} z ${totalChunks})` : "";
  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }, { text: `\n\n--- MATERIAŁ DO PRZETWORZENIA ---${fragmentLabel}\n\n${text}` }] }],
  });
  const responseText = result.response.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!responseText) throw new Error(`Brak odpowiedzi od AI (chunk ${chunkIndex + 1})`);
  return parseCoTResponse(responseText);
}

async function processTextWithGemini(text: string, sourceType: string, detail: DetailLevel = "medium", hint?: string | null): Promise<GeminiResponseType> {
  if (text.length <= TEXT_CHUNK_SIZE) return processTextChunkWithGemini(text, sourceType, detail, 0, 1, hint);
  const chunks = splitTextIntoChunks(text);
  logger.info("Text chunked for parallel processing", { sourceType, totalLength: text.length, chunkCount: chunks.length });
  const results = await Promise.all(chunks.map((chunk, i) => processTextChunkWithGemini(chunk, sourceType, detail, i, chunks.length, hint)));
  return mergeChunkResults(results);
}

async function processMultimodalCoT(filePart: { fileData: { fileUri: string; mimeType: string } }, sourceType: string, detail: DetailLevel, hint?: string | null): Promise<GeminiResponseType> {
  const model = vertexAI.getGenerativeModel({ model: "gemini-2.0-flash-001", generationConfig: { responseMimeType: "application/json", temperature: 0.2, responseSchema: outputSchema } });
  const prompt = buildCoTPrompt(sourceType, detail, hint);
  const result = await model.generateContent({ contents: [{ role: "user", parts: [filePart, { text: prompt }] }] });
  const responseText = result.response.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!responseText) throw new Error("Brak odpowiedzi od AI");
  return parseCoTResponse(responseText);
}

async function processInlinePdfChunk(pdfBuffer: Buffer, sourceType: string, chunkIndex: number, totalChunks: number, detail: DetailLevel, hint?: string | null): Promise<GeminiResponseType> {
  const model = vertexAI.getGenerativeModel({ model: "gemini-2.0-flash-001", generationConfig: { responseMimeType: "application/json", temperature: 0.2, responseSchema: outputSchema } });
  const prompt = buildCoTPrompt(sourceType, detail, hint);
  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ inlineData: { data: pdfBuffer.toString("base64"), mimeType: "application/pdf" } }, { text: `${prompt}\n\n(Fragment ${chunkIndex + 1} z ${totalChunks})` }] }],
  });
  const responseText = result.response.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!responseText) throw new Error(`Brak odpowiedzi od AI (chunk ${chunkIndex + 1})`);
  return parseCoTResponse(responseText);
}

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
    for (const page of copiedPages) newDoc.addPage(page);
    chunks.push(Buffer.from(await newDoc.save()));
    if (end >= pageCount) break;
  }
  return { chunks, pageCount };
}

// ── Service class ─────────────────────────────────────────────────────
export class FileProcessingService {
  async classifyFile(mimeType: string, fileName?: string): Promise<FileType> {
    const mime = mimeType.toLowerCase();
    if (mime.startsWith("image/")) return "IMAGE";
    if (mime === "application/pdf") return "PDF";
    if (mime === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" || mime === "application/vnd.ms-excel") return "XLSX";
    if (mime === "text/csv") return "CSV";
    if (mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return "DOCX";
    if (fileName) {
      const ext = fileName.slice(fileName.lastIndexOf(".")).toLowerCase();
      const fromExt = EXTENSION_TO_FILE_TYPE[ext];
      if (fromExt) { logger.info("classifyFile: MIME miss, matched by extension", { mimeType, fileName, resolvedType: fromExt }); return fromExt; }
    }
    throw new HttpsError("invalid-argument", `Nieobsługiwany typ pliku: ${mimeType}${fileName ? ` (${fileName})` : ""}. ${SUPPORTED_FORMATS_LABEL}`);
  }

  async processFile(params: { storagePath: string; mimeType: string; hint?: string | null; fileName?: string; detail: DetailLevel }): Promise<{
    meta: { detected_topic: string; detected_mode: string; source_type: string };
    flashcards: Array<{ front: string; back: string; tags: string[] }>;
  }> {
    const { storagePath, mimeType, hint, fileName, detail } = params;
    const fileType = await this.classifyFile(mimeType, fileName);
    logger.info("Processing file", { fileType, mimeType, fileName, detail });

    let result: GeminiResponseType;

    switch (fileType) {
      case "IMAGE": {
        const filePart = { fileData: { fileUri: buildGsUri(storagePath), mimeType } };
        result = await processMultimodalCoT(filePart, "SKAN_OBRAZU", detail, hint);
        break;
      }
      case "PDF": {
        const fileBuffer = await downloadFile(storagePath);
        const { PDFDocument } = await import("pdf-lib");
        const srcDoc = await PDFDocument.load(fileBuffer);
        const pageCount = srcDoc.getPageCount();
        logger.info("PDF page count", { storagePath, pageCount });
        if (pageCount <= 5) {
          if (fileBuffer.length / (1024 * 1024) < 15) {
            const filePart = { fileData: { fileUri: buildGsUri(storagePath), mimeType: "application/pdf" } };
            result = await processMultimodalCoT(filePart, "DOKUMENT_PDF", detail, hint);
          } else {
            result = await processInlinePdfChunk(fileBuffer, "DOKUMENT_PDF", 0, 1, detail, hint);
          }
        } else {
          const { chunks } = await splitPdfIntoChunks(fileBuffer);
          logger.info("PDF chunked for parallel processing", { storagePath, pageCount, chunkCount: chunks.length });
          const results = await Promise.all(chunks.map((chunk, i) => processInlinePdfChunk(chunk, "DOKUMENT_PDF (fragment)", i, chunks.length, detail, hint)));
          result = mergeChunkResults(results);
        }
        break;
      }
      case "XLSX":
      case "CSV": {
        const fileBuffer = await downloadFile(storagePath);
        const XLSX = await import("xlsx");
        const workbook = XLSX.read(fileBuffer, { type: "buffer" });
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) throw new HttpsError("failed-precondition", "Arkusz jest pusty");
        const sheet = workbook.Sheets[firstSheetName];
        const rows: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
        const nonEmptyRows = rows.filter((row) => row.some((cell) => String(cell).trim() !== ""));
        if (nonEmptyRows.length === 0) throw new HttpsError("failed-precondition", "Arkusz nie zawiera danych");
        const maxCols = Math.max(...nonEmptyRows.map((r) => r.length));
        if (maxCols === 2) {
          result = {
            meta: { detected_topic: hint || "Import z arkusza", detected_mode: "vocabulary" },
            flashcards: nonEmptyRows.filter((row) => String(row[0]).trim() !== "" && String(row[1]).trim() !== "").map((row) => ({ front: String(row[0]).trim(), back: String(row[1]).trim(), tags: [] })),
          };
        } else {
          result = await processTextWithGemini(nonEmptyRows.map((row) => row.join(" | ")).join("\n"), "DANE_ARKUSZA", detail, hint);
        }
        break;
      }
      case "DOCX": {
        const fileBuffer = await downloadFile(storagePath);
        const mammoth = await import("mammoth");
        const docResult = await mammoth.extractRawText({ buffer: fileBuffer });
        const text = docResult.value.trim();
        if (!text) throw new HttpsError("failed-precondition", "Dokument DOCX nie zawiera tekstu");
        result = await processTextWithGemini(text, "DOKUMENT_DOCX", detail, hint);
        break;
      }
    }

    return { meta: { ...result.meta, source_type: fileType }, flashcards: result.flashcards };
  }

  async scanDocument(params: { storagePath: string; mimeType?: string }): Promise<{ flashcards: Array<{ front: string; back: string }> }> {
    const { storagePath, mimeType = "application/pdf" } = params;
    const model = vertexAI.getGenerativeModel({ model: "gemini-2.0-flash-001", generationConfig: { responseMimeType: "application/json" } });

    const filePart = { fileData: { fileUri: buildGsUri(storagePath), mimeType } };
    const textPart = { text: `
Jesteś ekspertem w dziedzinie inżynierii dydaktycznej i tworzenia profesjonalnych materiałów do nauki. Twoim zadaniem jest przeanalizowanie dostarczonego dokumentu i przekształcenie go w wysokiej jakości zestaw fiszek w formacie JSON.

### INSTRUKCJA ANALIZY (PRIORYTETOWA):
TRYB A: DOKUMENT TYPU PYTANIE-ODPOWIEDŹ — mapowanie 1:1, zachowaj pełną szczegółowość.
TRYB B: DOKUMENT OPISOWY / CIĄGŁY — głęboka ekstrakcja wiedzy, zasada atomowości.

### FORMAT WYJŚCIOWY:
{ "flashcards": [{ "front": "...", "back": "..." }] }
`.trim() };

    const result = await model.generateContent({ contents: [{ role: "user", parts: [filePart, textPart] }] });
    const responseText = result.response.candidates?.[0].content.parts[0].text;
    if (!responseText) throw new Error("No response from AI");

    const flashcardsData = JSON.parse(responseText);
    return flashcardsSchema.parse(flashcardsData);
  }

  async extractTextFromImage(params: { storagePath: string; mimeType?: string }): Promise<{ success: boolean; text: string | null; error: string | null }> {
    const { storagePath, mimeType = "image/jpeg" } = params;
    try {
      const model = vertexAI.getGenerativeModel({ model: "gemini-2.0-flash-001" });
      const filePart = { fileData: { fileUri: buildGsUri(storagePath), mimeType } };
      const textPart = { text: "Extract all visible text from this image. Return ONLY the extracted text, nothing else. If no text is visible, return an empty string. Do not add any explanations or formatting." };
      const result = await model.generateContent({ contents: [{ role: "user", parts: [filePart, textPart] }] });
      const extractedText = result.response.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
      return { success: true, text: extractedText || null, error: null };
    } catch (error) {
      logger.error("OCR extraction failed", error);
      return { success: false, text: null, error: "Nie udalo sie odczytac tekstu z obrazu. Sprobuj ponownie." };
    }
  }
}

import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import {
  ProcessFileRequestSchema,
  ProcessFileResponseSchema,
} from "memvocado-types/schemas/api/processFile";
import {
  ScanDocumentRequestSchema,
  ScanDocumentResponseSchema,
} from "memvocado-types/schemas/api/scanning";
import {
  ExtractTextFromImageRequestSchema,
  ExtractTextFromImageResponseSchema,
} from "memvocado-types/schemas/api/ocr";
import { serializeTimestamps } from "../utils/serialization";
import { FileProcessingService } from "../services/FileProcessingService";

const fileProcessingService = new FileProcessingService();

export const processFile = onCall(
  { memory: "1GiB", timeoutSeconds: 120 },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    logger.info(request.data);

    const parsed = ProcessFileRequestSchema.safeParse(request.data || {});
    if (!parsed.success) {
      throw new HttpsError("invalid-argument", "Invalid request data", { issues: parsed.error.issues });
    }

    const { storagePath, mimeType, hint, fileName, detail } = parsed.data;

    try {
      const result = await fileProcessingService.processFile({ storagePath, mimeType, hint, fileName, detail });

      logger.info("File processed successfully", {
        userId: request.auth.uid,
        flashcardCount: result.flashcards.length,
        mode: result.meta.detected_mode,
      });

      const validated = ProcessFileResponseSchema.parse(result);
      return serializeTimestamps(validated);
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error("File processing failed", error);
      throw new HttpsError("internal", "Nie udało się przetworzyć pliku", { issues: error });
    }
  }
);

export const scanDocument = onCall(
  { memory: "512MiB", timeoutSeconds: 60 },
  async (request) => {
    const parsed = ScanDocumentRequestSchema.safeParse(request.data || {});
    if (!parsed.success) {
      throw new HttpsError("invalid-argument", "Invalid request data", { issues: parsed.error.issues });
    }

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const { storagePath, mimeType } = parsed.data;

    try {
      const result = await fileProcessingService.scanDocument({ storagePath, mimeType });
      const validated = ScanDocumentResponseSchema.parse(result);
      return serializeTimestamps(validated);
    } catch (error) {
      logger.error("Scan document failed", error);
      throw new HttpsError("internal", "Failed to scan document", { issues: error });
    }
  }
);

export const extractTextFromImage = onCall(
  { memory: "256MiB", timeoutSeconds: 30 },
  async (request) => {
    const parsed = ExtractTextFromImageRequestSchema.safeParse(request.data || {});
    if (!parsed.success) {
      throw new HttpsError("invalid-argument", "Invalid request data", { issues: parsed.error.issues });
    }

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const { storagePath, mimeType } = parsed.data;

    try {
      const result = await fileProcessingService.extractTextFromImage({ storagePath, mimeType });

      logger.info("OCR extraction", { userId: request.auth.uid, success: result.success });

      const validated = ExtractTextFromImageResponseSchema.parse(result);
      return serializeTimestamps(validated);
    } catch (error) {
      logger.error("OCR extraction failed", error);
      const response = { success: false, text: null, error: "Nie udalo sie odczytac tekstu z obrazu. Sprobuj ponownie." };
      return serializeTimestamps(ExtractTextFromImageResponseSchema.parse(response));
    }
  }
);

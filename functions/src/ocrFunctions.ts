import { onCall, HttpsError } from "firebase-functions/v2/https";
import { VertexAI } from "@google-cloud/vertexai";
import {
  ExtractTextFromImageRequestSchema,
  ExtractTextFromImageResponseSchema,
} from "memvocado-types/schemas/api/ocr";
import * as logger from "firebase-functions/logger";
import { serializeTimestamps } from "./utils/serialization";

// Initialize Vertex AI
const vertexAI = new VertexAI({
  project: process.env.GCLOUD_PROJECT,
  location: "us-central1",
});

/**
 * Extract text from an image using Gemini Vision
 * Used for OCR in Quick Add feature
 */
export const extractTextFromImage = onCall(
  {
    memory: "256MiB",
    timeoutSeconds: 30,
  },
  async (request) => {
    // Validate request
    const validationResult = ExtractTextFromImageRequestSchema.safeParse(
      request.data || {}
    );
    if (!validationResult.success) {
      throw new HttpsError("invalid-argument", "Invalid request data", {
        issues: validationResult.error.issues,
      });
    }

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const { storagePath, mimeType } = validationResult.data;

    try {
      // Get Gemini model
      const model = vertexAI.getGenerativeModel({
        model: "gemini-2.0-flash-001",
      });

      // Build file reference
      const filePart = {
        fileData: {
          fileUri: storagePath.startsWith("gs://")
            ? storagePath
            : `gs://${process.env.GCLOUD_PROJECT}.appspot.com/${storagePath}`,
          mimeType: mimeType || "image/jpeg",
        },
      };

      // Simple OCR prompt
      const textPart = {
        text: `Extract all visible text from this image. Return ONLY the extracted text, nothing else. If no text is visible, return an empty string. Do not add any explanations or formatting.`,
      };

      // Generate content
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [filePart, textPart] }],
      });

      const extractedText =
        result.response.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

      logger.info("OCR extraction successful", {
        userId: request.auth.uid,
        textLength: extractedText.length,
      });

      const response = {
        success: true,
        text: extractedText || null,
        error: null,
      };

      return serializeTimestamps(ExtractTextFromImageResponseSchema.parse(response));
    } catch (error) {
      logger.error("OCR extraction failed", error);

      const response = {
        success: false,
        text: null,
        error: "Nie udalo sie odczytac tekstu z obrazu. Sprobuj ponownie.",
      };

      return serializeTimestamps(ExtractTextFromImageResponseSchema.parse(response));
    }
  }
);

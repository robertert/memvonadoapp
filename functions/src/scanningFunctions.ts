import { onCall, HttpsError } from "firebase-functions/v2/https";
import { VertexAI } from "@google-cloud/vertexai";
import {
  ScanDocumentRequestSchema,
  ScanDocumentResponseSchema,
} from "memvocado-types/schemas/api/scanning";

import * as logger from "firebase-functions/logger";
import { serializeTimestamps } from "./utils/serialization";
import { z } from "zod";

const flashcardSchema = z.object({
  front: z.string(),
  back: z.string(),
});

const flashcardsSchema = z.object({
  flashcards: z.array(flashcardSchema),
});

// Inicjalizacja Vertex AI (Project ID i Location są pobierane ze środowiska Cloud Functions)
// Upewnij się, że Twoja funkcja ma rolę "Vertex AI User" w IAM
const vertexAI = new VertexAI({
  project: process.env.GCLOUD_PROJECT,
  location: "us-central1",
});

export const scanDocument = onCall(
  {
    memory: "512MiB", // Możemy dać mało RAMu, bo nie pobieramy pliku!
    timeoutSeconds: 60,
  },
  async (request) => {
    // 1. Walidacja
    const validationResult = ScanDocumentRequestSchema.safeParse(
      request.data || {}
    );
    if (!validationResult.success) {
      throw new HttpsError("invalid-argument", "Invalid request data", {
        issues: validationResult.error.issues,
      });
    }

    const { storagePath, mimeType } = validationResult.data; // Warto przesyłać mimeType z frontu (np. 'application/pdf')

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    try {
      // 2. Wybór modelu
      const model = vertexAI.getGenerativeModel({
        model: "gemini-2.0-flash-001",
        generationConfig: {
          responseMimeType: "application/json", // Wymuszamy JSON
        },
      });

      // 3. Budowanie promptu
      // Ważne: Zamiast pobierać plik, wskazujemy jego lokalizację w Storage
      // storagePath musi być pełny: gs://twoj-bucket/sciezka/do/pliku
      // Jeśli z frontu dostajesz tylko ścieżkę względną, musisz dokleić nazwę bucketu.

      const filePart = {
        fileData: {
          fileUri: storagePath.startsWith("gs://")
            ? storagePath
            : `gs://${process.env.GCLOUD_PROJECT}.appspot.com/${storagePath}`,
          mimeType: mimeType || "application/pdf", // np. 'image/jpeg', 'application/pdf'
        },
      };

      const textPart = {
        text: `
        Jesteś ekspertem od tworzenia materiałów edukacyjnych. 
        Przeanalizuj załączony dokument. Wyciągnij z niego najważniejsze informacje i stwórz zestaw fiszek (pytanie i odpowiedź).
        
        Zwróć wynik w formacie JSON zgodnym z tym schematem:
        {
          "flashcards": [
            { "front": "Pytanie", "back": "Odpowiedź" }
          ]
        }
        
        Jeżeli dokument jest nieczytelny, zwróć pusta tablicę.
        Język fiszek: Polski (chyba że dokument jest do nauki języka, wtedy odpowiednio).
      `,
      };

      // 4. Generowanie
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [filePart, textPart] }],
      });

      const responseText =
        result.response.candidates?.[0].content.parts[0].text;

      if (!responseText) {
        throw new Error("No response from AI");
      }

      // 5. Parsowanie wyniku (Gemini zwróci czysty JSON dzięki responseMimeType)
      const flashcardsData = JSON.parse(responseText);

      logger.info("Flashcards data", flashcardsData);

      const strippedFlashcardsData = flashcardsSchema.parse(flashcardsData);

      logger.info("Flashcards data", strippedFlashcardsData);

      const validatedResponse = ScanDocumentResponseSchema.parse(
        strippedFlashcardsData
      );

      return serializeTimestamps(validatedResponse);
    } catch (error) {
      console.error(error);
      throw new HttpsError("internal", "Failed to scan document", {
        issues: error,
      });
    }
  }
);

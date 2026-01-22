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
              Jesteś ekspertem w dziedzinie inżynierii dydaktycznej i tworzenia profesjonalnych materiałów do nauki (systemy spaced repetition/Anki). Twoim zadaniem jest przeanalizowanie dostarczonego dokumentu i przekształcenie go w wysokiej jakości zestaw fiszek w formacie JSON.

              ### INSTRUKCJA ANALIZY (PRIORYTETOWA):
              Zanim zaczniesz generować fiszki, rozpoznaj strukturę dostarczonego tekstu i wybierz jeden z dwóch trybów działania:

              TRYB A: DOKUMENT TYPU PYTANIE-ODPOWIEDŹ
              Jeśli dokument jest listą pytań i odpowiedzi (np. baza pytań egzaminacyjnych, FAQ, test, quiz):
              1. NIE syntetyzuj ani nie skracaj treści.
              2. Twoim zadaniem jest mapowanie 1:1.
              3. Każda para "Pytanie - Odpowiedź" z dokumentu ma stać się jedną fiszką.
              4. Zachowaj pełną szczegółowość oryginalnych odpowiedzi.

              TRYB B: DOKUMENT OPISOWY / CIĄGŁY
              Jeśli dokument to artykuł, rozdział podręcznika lub notatki:
              1. Dokonaj głębokiej i szczegółowej ekstrakcji wiedzy (Deep Extraction).
              2. Nie pomijaj detali. Twórz fiszki dla definicji, dat, nazwisk, procesów, wyliczeń i zależności przyczynowo-skutkowych.
              3. Stosuj zasadę "Atomowości": jedna fiszka powinna sprawdzać jedną konkretną informację, ale zestaw jako całość ma pokrywać 100% merytoryki tekstu.

              ### WYMAGANIA DOTYCZĄCE TREŚCI:
              - **Język:** Polski (chyba że dokument służy do nauki języka obcego – wtedy "front" w języku obcym, "back" po polsku lub zgodnie z kontekstem).
              - **Szczegółowość:** Bardzo wysoka. Unikaj ogólników. Jeśli tekst wymienia 5 cech zjawiska, stwórz fiszkę, która wymaga wymienienia tych 5 cech (lub rozbij to na mniejsze, jeśli to konieczne dla czytelności).
              - **Czytelność:** Jeśli dokument jest nieczytelny lub nie zawiera treści edukacyjnych, zwróć pustą tablicę [].

              ### FORMAT WYJŚCIOWY:
              Zwróć TYLKO czysty kod JSON, bez bloków markdown, bez komentarzy wstępnych i końcowych. Użyj dokładnie tego schematu:

              {
                "flashcards": [
                  { 
                    "front": "Treść pytania lub pojęcia", 
                    "back": "Szczegółowa odpowiedź lub definicja" 
                  }
                ]
              }     
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

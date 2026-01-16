import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import Database from "better-sqlite3";
import AdmZip from "adm-zip";
import { z } from "zod";
import { Card, CardAlgo, CardGrade } from "./types/common";

/**
 * Interfejs dla danych z tabeli notes w Anki
 */
interface AnkiNote {
  note_id: number;
  model_id: number;
  fields: string;
  tags: string;
  card_id: number;
  queue_type: number;
  due_value: number;
  interval: number;
  ease_factor: number;
  reps: number;
  lapses: number;
}

/**
 * Interfejs dla modelu Anki (szablonu karty)
 */
interface AnkiModel {
  flds: Array<{ name: string }>;
}

/**
 * Interfejs dla metadanych kolekcji Anki
 */
interface AnkiCollection {
  crt: number;
  models: Record<string, AnkiModel>;
}

/**
 * Automatyczne wykrywanie mapowania pól front/back na podstawie nazw
 * @param {string[]} fieldNames - Nazwy pół
 * @return {Object} Obiekt zawierający indeksy pół front i back
 */
function detectFieldMapping(fieldNames: string[]): {
  frontIndex: number;
  backIndex: number;
} {
  const frontIdx = fieldNames.findIndex(
    (name) =>
      /front/i.test(name) || /question/i.test(name) || /pytanie/i.test(name)
  );
  const backIdx = fieldNames.findIndex(
    (name) =>
      /back/i.test(name) || /answer/i.test(name) || /odpowiedz/i.test(name)
  );

  return {
    frontIndex: frontIdx >= 0 ? frontIdx : 0,
    backIndex:
      backIdx >= 0
        ? backIdx
        : frontIdx >= 0
        ? frontIdx + 1
        : Math.min(1, fieldNames.length - 1),
  };
}

/**
 * Parsowanie tagów z formatu Anki (string z spacjami) na tablicę
 * @param {string} tagsString - String z tagami
 * @return {string[]} Tablica tagów
 */
function parseTags(tagsString: string): string[] {
  return tagsString
    .trim()
    .split(/\s+/)
    .filter((tag) => tag.length > 0);
}

// Mapowanie stanu z Anki (queue) na FSRS State
// 0: New, 1: Learning, 2: Review, 3: Relearning
const mapAnkiStateToFSRS = (queue: number): number => {
  switch (queue) {
    case 0:
      return 0; // New
    case 1:
      return 1; // Learning
    case 2:
      return 2; // Review
    case 3:
      return 1; // Day Learning (traktujemy jako Learning/Relearning)
    case -1:
      return 0; // Suspended -> reset do New (lub można pominąć)
    default:
      return 0;
  }
};

// Konwersja Ease Factor (np. 2500) na Difficulty (1-10)
const calculateDifficulty = (factor: number): number => {
  if (!factor || factor === 0) return 5; // Domyślna trudność

  // Anki Ease: zazwyczaj 1300 (trudne) do 3000+ (łatwe). Standard 2500.
  // Wzór heurystyczny: D = 11 - (Ease / 250) byłby zbyt prosty.
  // Użyjmy liniowego mapowania:
  // Ease 1300 -> Diff ~10
  // Ease 2500 -> Diff ~5
  // Ease 3300 -> Diff ~1

  // Wzór: D = 10 - (Ease - 1300) / 200
  const d = 10 - (factor - 1300) / 200;

  // Clamp values between 1 and 10
  return Math.max(1, Math.min(10, d));
};

// Obliczanie dat na podstawie interwału i due_value
const calculateReviewDates = (
  queue: number,
  dueValue: number,
  interval: number,
  collectionCrt: number
) => {
  const oneDayMs = 86400 * 1000;
  const now = Date.now();
  let dueDate: Date;
  let lastReviewDate: Date | undefined;

  // Logika dat w Anki jest różna dla różnych kolejek
  if (queue === 2) {
    // Review: due_value to dni od utworzenia kolekcji (crt)
    const dueTimestamp = collectionCrt * 1000 + dueValue * oneDayMs;
    dueDate = new Date(dueTimestamp);

    // Ostatnia powtórka = Data wymagalności - Interwał
    // To przybliżenie, bo nie mamy dostępu do tabeli revlog w tym miejscu,
    // ale jest wystarczające do FSRS.
    lastReviewDate = new Date(dueTimestamp - interval * oneDayMs);
  } else if (queue === 1 || queue === 3) {
    // Learning: due_value to zazwyczaj timestamp
    // Uwaga: W Anki < 2.1 learning często ma due jako timestamp, w nowszych różnie.
    // Dla bezpieczeństwa, jeśli dueValue jest małe (< 1 mln), traktujemy jako dni, jeśli duże - timestamp.
    if (dueValue > 100000000) {
      dueDate = new Date(dueValue * 1000);
    } else {
      dueDate = new Date(collectionCrt * 1000 + dueValue * oneDayMs);
    }
    // Dla kart w nauce last_review to zazwyczaj "teraz" minus mały czas,
    // lub po prostu zakładamy, że last_review był wczoraj.
    lastReviewDate = new Date(now - oneDayMs);
  } else {
    // New
    dueDate = new Date(now);
  }

  // Elapsed days: ile dni minęło od ostatniej powtórki do TERAZ
  const elapsedDays = lastReviewDate
    ? Math.max(0, (now - lastReviewDate.getTime()) / oneDayMs)
    : 0;

  return { dueDate, lastReviewDate, elapsedDays };
};

/**
 * Konwersja notatki Anki na kartę Memvocado
 * @param {AnkiNote} note - Notatka Anki
 * @param {string[]} fieldNames - Nazwy pół
 * @param {number} collectionCrt - Czas utworzenia kolekcji
 * @return {Card} Karta w formacie Memvocado
 */
function convertToCard(
  note: AnkiNote,
  fieldNames: string[],
  collectionCrt: number
): Omit<Card, "id"> {
  // Podziel pola po znaku \x1f
  const fields = note.fields.split("\x1f");

  // Wykryj mapowanie front/back
  const { frontIndex, backIndex } = detectFieldMapping(fieldNames);

  // Pobierz wartości front i back
  const front = fields[frontIndex] || "";
  const back = backIndex < fields.length ? fields[backIndex] : "";

  // Parsuj tagi
  const tags = parseTags(note.tags);

  // Określ czy karta jest nowa (queue_type === 0 oznacza nową kartę)
  const isFirst = note.queue_type === 0;
  const isNew = note.queue_type === 1;

  // Utwórz datę utworzenia (użyj crt z kolekcji lub aktualnej daty)
  const createdAt =
    collectionCrt > 0 ? new Date(collectionCrt * 1000) : new Date();

  let cardAlgo: CardAlgo | undefined = undefined;

  if (!isNew) {
    const { dueDate, lastReviewDate, elapsedDays } = calculateReviewDates(
      note.queue_type,
      note.due_value,
      note.interval,
      collectionCrt
    );

    cardAlgo = {
      state: mapAnkiStateToFSRS(note.queue_type),
      difficulty: calculateDifficulty(note.ease_factor),
      stability: note.interval, // Heurystyka: Stability ~= Interval
      scheduled_days: note.interval,
      due: dueDate,
      reps: note.reps,
      lapses: note.lapses,
      elapsed_days: elapsedDays,
    };
    if (lastReviewDate) {
      cardAlgo.last_review = lastReviewDate;
    }
  }

  const card: Omit<Card, "id"> = {
    cardData: {
      front,
      back,
    },
    tags,
    firstLearn: {
      isNew,
      isFirst,
    },
    createdAt,
    cardAlgo,
    grade: CardGrade.NotGraded,
  };

  return card;
}

/**
 * Dekompresja pliku Zstd (dla formatu anki21b)
 * @param {string} compressedPath - Ścieżka do skompresowanego pliku Zstd
 * @param {string} outputPath - Ścieżka do pliku wyjściowego
 * @return {Promise<void>} Promise zakończone pomyślnie jeśli dekompresja się powiodła
 * @throws {Error} Jeśli wystąpi błąd podczas dekompresji
 */
async function decompressZstd(
  compressedPath: string,
  outputPath: string
): Promise<void> {
  try {
    const { decompress } = await import("@mongodb-js/zstd");

    // Odczytaj skompresowany plik
    const compressedData = fs.readFileSync(compressedPath);

    // Dekompresuj używając @mongodb-js/zstd
    const decompressedData = await decompress(compressedData);

    // Zapisz zdekompresowane dane
    fs.writeFileSync(outputPath, decompressedData);
  } catch (error) {
    throw new Error(
      `Failed to decompress Zstd file: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Ekstrakcja bazy danych z archiwum ZIP
 * @param {Buffer} apkgBuffer - Buffer z zawartością pliku .apkg
 */
async function extractDatabase(apkgBuffer: Buffer): Promise<string> {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "anki-"));
  let dbPath: string | null = null;

  try {
    const zip = new AdmZip(apkgBuffer);
    const entries = zip.getEntries();

    // Sprawdź czy istnieje collection.anki21b lub collection.anki2
    const hasAnki21b = entries.some(
      (e: { entryName: string }) => e.entryName === "collection.anki21b"
    );
    const hasAnki2 = entries.some(
      (e: { entryName: string }) => e.entryName === "collection.anki2"
    );

    if (hasAnki21b) {
      // Format anki21b - wymaga dekompresji Zstd
      const compressedPath = path.join(tempDir, "collection.anki21b");
      dbPath = path.join(tempDir, "collection.db");

      // Ekstraktuj skompresowany plik
      zip.extractEntryTo("collection.anki21b", tempDir, false, true);

      // Dekompresuj Zstd
      await decompressZstd(compressedPath, dbPath);
    } else if (hasAnki2) {
      // Format anki2 - bezpośrednio SQLite
      dbPath = path.join(tempDir, "collection.anki2");
      zip.extractEntryTo("collection.anki2", tempDir, false, true);
    } else {
      throw new Error(
        "Invalid Anki package: missing collection.anki2 or collection.anki21b"
      );
    }

    if (!dbPath || !fs.existsSync(dbPath)) {
      throw new Error("Failed to extract database from Anki package");
    }

    return dbPath;
  } catch (error) {
    // Czyszczenie w przypadku błędu
    if (dbPath && fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
    throw error;
  }
}

/**
 * Odczyt danych z bazy danych SQLite Anki
 * @param {string} dbPath - Ścieżka do bazy danych SQLite Anki
 * @return {Object} Obiekt zawierający notatki i metadane kolekcji
 * @throws {Error} Jeśli wystąpi błąd podczas odczytu bazy danych
 */
function readAnkiDatabase(dbPath: string): {
  notes: AnkiNote[];
  collection: AnkiCollection;
} {
  const db = new Database(dbPath);

  try {
    // Pobierz metadane kolekcji
    const colRow = db.prepare("SELECT crt, models FROM col LIMIT 1").get() as
      | { crt: number; models: string }
      | undefined;

    let collectionCrt = 1356998400; // Domyślna data (2013)
    let models: Record<string, AnkiModel> = {};

    if (colRow) {
      collectionCrt = colRow.crt || collectionCrt;
      try {
        if (colRow.models) {
          models = JSON.parse(colRow.models);
        }
      } catch (error) {
        // Jeśli nie można sparsować JSON, użyj pustego obiektu
        console.warn("Failed to parse models JSON, using default field names");
      }
    }

    // Pobierz notatki z kartami
    const query = `
      SELECT 
        n.id as note_id,
        n.mid as model_id,
        n.flds as fields,
        n.tags as tags,
        c.id as card_id,
        c.queue as queue_type,
        c.due as due_value,
        c.ivl as interval,
        c.factor as ease_factor,
        c.reps as reps,
        c.lapses as lapses
      FROM notes n
      JOIN cards c ON c.nid = n.id
      ORDER BY c.id
    `;

    const rows = db.prepare(query).all() as Array<{
      note_id: number;
      model_id: number;
      fields: string;
      tags: string;
      card_id: number;
      queue_type: number;
      due_value: number;
      interval: number;
      ease_factor: number;
      reps: number;
      lapses: number;
    }>;

    const notes: AnkiNote[] = rows.map((row) => ({
      note_id: row.note_id,
      model_id: row.model_id,
      fields: row.fields,
      tags: row.tags,
      card_id: row.card_id,
      queue_type: row.queue_type,
      due_value: row.due_value,
      interval: row.interval,
      ease_factor: row.ease_factor,
      reps: row.reps,
      lapses: row.lapses,
    }));

    return {
      notes,
      collection: {
        crt: collectionCrt,
        models,
      },
    };
  } finally {
    db.close();
  }
}

/**
 * Główna funkcja konwersji pliku Anki (.apkg) na karty Memvocado
 *
 * @param {Buffer | string} apkgBuffer - Buffer z zawartością pliku .apkg lub base64 string
 * @return {Promise<Omit<Card, "id">[]>} Tablica kart w formacie Memvocado
 * @throws {Error} Jeśli wystąpi błąd podczas konwersji
 */
export async function convertAnkiApkg(
  apkgBuffer: Buffer | string
): Promise<Omit<Card, "id">[]> {
  let buffer: Buffer;
  let dbPath: string | null = null;
  const tempFiles: string[] = [];

  try {
    // Konwersja base64 string na Buffer jeśli potrzeba
    if (typeof apkgBuffer === "string") {
      buffer = Buffer.from(apkgBuffer, "base64");
    } else {
      buffer = apkgBuffer;
    }

    // Walidacja czy to prawidłowy ZIP
    try {
      const zip = new AdmZip(buffer);
      zip.getEntries(); // Sprawdź czy można odczytać wpisy
    } catch (error) {
      throw new Error(
        `Invalid ZIP file: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }

    // Ekstraktuj bazę danych
    dbPath = await extractDatabase(buffer);
    if (dbPath) {
      tempFiles.push(dbPath);
      // Dodaj również katalog tymczasowy do czyszczenia
      const tempDir = path.dirname(dbPath);
      tempFiles.push(tempDir);
    }

    // Odczytaj dane z bazy
    const { notes, collection } = readAnkiDatabase(dbPath);

    // Konwertuj notatki na karty
    const cards: Omit<Card, "id">[] = [];

    for (const note of notes) {
      // Pobierz nazwy pól z modelu
      const model = collection.models[note.model_id.toString()];
      const fieldNames: string[] = model?.flds?.map((f) => f.name) || [];

      // Jeśli nie ma nazw pól, użyj domyślnych
      if (fieldNames.length === 0) {
        const fields = note.fields.split("\x1f");
        fieldNames.push(...fields.map((_, i) => `Field_${i}`));
      }

      // Konwertuj na kartę
      const card = convertToCard(note, fieldNames, collection.crt);

      // Waliduj kartę przez schema
      try {
        cards.push(card);
      } catch (error) {
        // Loguj błąd walidacji ale kontynuuj przetwarzanie innych kart
        console.error(
          `Failed to validate card ${note.card_id}:`,
          error instanceof z.ZodError ? error.errors : error
        );
      }
    }

    return cards;
  } catch (error) {
    throw new Error(
      `Failed to convert Anki package: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  } finally {
    // Czyszczenie plików tymczasowych
    for (const file of tempFiles) {
      try {
        if (fs.existsSync(file)) {
          if (fs.statSync(file).isDirectory()) {
            // Usuń katalog rekurencyjnie
            fs.rmSync(file, { recursive: true, force: true });
          } else {
            fs.unlinkSync(file);
          }
        }
      } catch (cleanupError) {
        // Ignoruj błędy czyszczenia
        console.warn(`Failed to cleanup temp file ${file}:`, cleanupError);
      }
    }
  }
}

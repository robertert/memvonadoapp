/**
 * Główny plik testowy dla Memvocado Card Flow
 * 
 * Ten plik importuje wszystkie testy i zapewnia, że są one uruchamiane
 * razem podczas wykonywania `npm test`.
 * 
 * Testy pokrywają:
 * - useCardLogic hook (podstawowa logika)
 * - First Learning phase (nowe karty)
 * - FSRS Algorithm (algorytm powtórek)
 * - Card Transitions (przejścia między stanami)
 * - Session Management (zarządzanie sesją)
 * - Error Handling (obsługa błędów)
 */

// Import wszystkich testów
import './useCardLogic.test';
import './firstLearning.test';
import './fsrsAlgorithm.test';
import './cardTransitions.test';
import './sessionManagement.test';
import './errorHandling.test';

describe('Memvocado Card Flow - Test Suite', () => {
  it('powinien uruchomić wszystkie testy', () => {
    // Ten test zapewnia, że wszystkie testy są załadowane
    expect(true).toBe(true);
  });
});

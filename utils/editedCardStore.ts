/**
 * Simple in-memory store for passing edited card data back from
 * the edit screen to the learn screen without a backend fetch.
 */

interface EditedCardData {
  cardId: string;
  front: string;
  back: string;
  tags: string[];
}

let lastEditedCard: EditedCardData | null = null;

export function setEditedCard(data: EditedCardData): void {
  lastEditedCard = data;
}

export function consumeEditedCard(): EditedCardData | null {
  const data = lastEditedCard;
  lastEditedCard = null;
  return data;
}

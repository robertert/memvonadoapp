/**
 * @param {object} cardData - Card data
 * @return {object} Normalized card data
 */
export function normalizeCardData(cardData: { front: string; back: string }) {
  return {
    ...cardData,
    frontLower: cardData.front.trim().toLowerCase(),
    backLower: cardData.back.trim().toLowerCase(),
  };
}

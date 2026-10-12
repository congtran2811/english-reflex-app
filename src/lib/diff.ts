export interface WordComparison {
  word: string;
  matched: boolean;
}

/**
 * Clean word for comparison (lower-case, remove punctuations)
 */
export function normalizeWord(w: string): string {
  return w.toLowerCase().replace(/[^a-z0-9']/g, '').trim();
}

/**
 * Compare target English sentence with user's voice transcript word by word.
 */
export function compareTranscripts(target: string, spoken: string): {
  accuracy: number; // 0 - 100
  comparisons: WordComparison[];
} {
  const targetWords = target.split(/\s+/).filter(Boolean);
  const spokenWords = spoken.split(/\s+/).map(normalizeWord).filter(Boolean);

  let matchCount = 0;
  const comparisons: WordComparison[] = [];

  let searchIndex = 0;
  for (const rawWord of targetWords) {
    const cleanWord = normalizeWord(rawWord);
    // Find matching word in spokenWords near current position
    let found = false;
    for (let i = searchIndex; i < Math.min(searchIndex + 3, spokenWords.length); i++) {
      if (spokenWords[i] === cleanWord) {
        found = true;
        searchIndex = i + 1;
        break;
      }
    }

    if (found) {
      matchCount++;
      comparisons.push({ word: rawWord, matched: true });
    } else {
      comparisons.push({ word: rawWord, matched: false });
    }
  }

  const accuracy = targetWords.length > 0 ? Math.round((matchCount / targetWords.length) * 100) : 0;

  return { accuracy, comparisons };
}

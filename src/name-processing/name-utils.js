/**
 * Утилітарні функції для обробки імен
 */
import { 
  levenshteinDistance, 
  fuzzyMatch, 
  getSimilarity, 
  areStringSimilar 
} from '../utils/string-utils.js';

// Експортуємо імпортовані функції для зворотної сумісності
export { 
  levenshteinDistance, 
  fuzzyMatch, 
  getSimilarity, 
  areStringSimilar 
};

/**
 * Розбиває повне ім'я на частини і враховує обидва можливі порядки
 * @param {string} fullName - Повне ім'я
 * @returns {Object} Об'єкт з різними варіантами імені
 */
export function splitName(fullName) {
  if (!fullName) return { fullName: '' };

  const parts = fullName.trim().split(/\s+/);

  // Якщо тільки одне слово
  if (parts.length === 1) {
    return {
      fullName: fullName.trim(),
      onlyOneWord: true,
      word: parts[0]
    };
  }

  // Стандартний варіант (перше слово - прізвище, решта - ім'я)
  const standard = {
    surname: parts[0],
    firstname: parts.slice(1).join(' ')
  };

  // Альтернативний варіант (останнє слово - прізвище, решта - ім'я)
  const reversed = {
    surname: parts[parts.length - 1],
    firstname: parts.slice(0, parts.length - 1).join(' ')
  };

  return {
    fullName: fullName.trim(),
    standard,
    reversed
  };
}
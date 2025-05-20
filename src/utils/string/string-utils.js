/**
 * Модуль з утилітами для роботи з рядками
 * Містить функції для обчислення відстані, порівняння рядків тощо
 */
import {
  areNamesTransliteratedMatches,
  transliterateToCyrillic,
  transliterateToLatin,
} from '../../features/name-processing/transliteration.js';
import { isVariantOf } from '../../features/name-processing/name-variants.js';
import { getQuality, getThreshold } from '../../config.js';

/**
 * Функція для обчислення відстані Левенштейна між двома рядками
 * (кількість символів, які потрібно додати, видалити або замінити)
 * @param {string} a - Перший рядок
 * @param {string} b - Другий рядок
 * @returns {number} Відстань Левенштейна
 */
export function levenshteinDistance(a, b) {
  if (!a || !b) return a ? a.length : b ? b.length : 0;
  
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  // Оптимізована версія з двома рядками замість повної матриці
  let prev = Array(b.length + 1).fill(0).map((_, i) => i);
  let curr = Array(b.length + 1).fill(0);

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + cost
      );
    }
    [prev, curr] = [curr, prev];
  }

  return prev[b.length];
}

/**
 * Функція для обчислення метрики схожості між двома рядками
 * @param {string} str1 - Перший рядок
 * @param {string} str2 - Другий рядок
 * @returns {number} Схожість від 0 до 1, де 1 - повний збіг
 */
export function getSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  
  if (s1 === s2) return 1;
  
  const distance = levenshteinDistance(s1, s2);
  const maxLength = Math.max(s1.length, s2.length);
  return 1 - (distance / maxLength);
}

/**
 * Функція для перевірки нечіткого співпадіння з урахуванням схожості
 * @param {string} str1 - Перший рядок
 * @param {string} str2 - Другий рядок
 * @param {number} threshold - Поріг схожості (менше значення = більша схожість)
 * @returns {boolean} Чи є рядки достатньо схожими
 */
export function fuzzyMatch(str1, str2, threshold = getThreshold('fuzzyMatch')) {
  if (!str1 || !str2) return false;

  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();

  if (s1 === s2) return true;

  const distance = levenshteinDistance(s1, s2);
  const maxLength = Math.max(s1.length, s2.length);
  const similarity = 1 - distance / maxLength;

  return similarity >= threshold;
}

/**
 * Функція для перевірки схожості рядків
 * @param {string} str1 - Перший рядок
 * @param {string} str2 - Другий рядок
 * @param {number} threshold - Поріг схожості (0-1)
 * @returns {boolean} Результат порівняння
 */
export function areStringSimilar(str1, str2, threshold = getThreshold('fuzzyMatch')) {
  return fuzzyMatch(str1, str2, threshold);
}

/**
 * Удосконалена уніфікована функція оцінки схожості імен
 * @param {string} name1 - Перше ім'я
 * @param {string} name2 - Друге ім'я
 * @param {Object} options - Додаткові параметри
 * @returns {Object} Об'єкт з типом співпадіння та якістю
 */
export function evaluateNameSimilarity(name1, name2, options = {}) {
  if (!name1 || !name2) {
    return { type: 'not-found', quality: 0 };
  }

  const n1 = name1.toLowerCase();
  const n2 = name2.toLowerCase();

  // Додаємо кешування для покращення продуктивності
  const cacheKey = `${n1}|${n2}`;
  if (similarityCache.has(cacheKey)) {
    return similarityCache.get(cacheKey);
  }

  // Точне співпадіння
  if (n1 === n2) {
    const result = {
      type: 'exact-match',
      quality: getQuality('exactMatch') / 100,
    };
    similarityCache.set(cacheKey, result);
    return result;
  }

  // Перевіряємо спочатку, чи міститься кирилиця в одному імені і латиниця в іншому
  const n1HasCyrillic = /[а-яА-ЯіІїЇєЄґҐ]/.test(n1);
  const n2HasCyrillic = /[а-яА-ЯіІїЇєЄґҐ]/.test(n2);
  const n1HasLatin = /[a-zA-Z]/.test(n1);
  const n2HasLatin = /[a-zA-Z]/.test(n2);

  // Якщо одне ім'я кирилицею, а інше латиницею, спочатку перевіримо транслітерацію
  if ((n1HasCyrillic && n2HasLatin) || (n1HasLatin && n2HasCyrillic)) {
    let translitN1 = n1;
    let translitN2 = n2;

    if (n1HasCyrillic) {
      translitN1 = transliterateToLatin(n1).toLowerCase();
    } else if (n1HasLatin) {
      translitN1 = transliterateToCyrillic(n1).toLowerCase();
    }

    if (n2HasCyrillic) {
      translitN2 = transliterateToLatin(n2).toLowerCase();
    } else if (n2HasLatin) {
      translitN2 = transliterateToCyrillic(n2).toLowerCase();
    }

    // Після транслітерації перевіряємо точне співпадіння
    if (translitN1 === translitN2 || translitN1 === n2 || n1 === translitN2) {
      const result = {
        type: 'translit-match',
        quality: getQuality('standardOrderTranslit') / 100,
      };
      similarityCache.set(cacheKey, result);
      return result;
    }

    // Якщо після транслітерації не точне співпадіння, перевіряємо схожість
    const translitSimilarity = Math.max(
      getSimilarity(translitN1, n2),
      getSimilarity(n1, translitN2)
    );

    if (translitSimilarity >= getThreshold('translitMatch')) {
      const result = {
        type: 'translit-fuzzy-match',
        quality: (getQuality('standardOrderTranslit') / 100) * translitSimilarity,
      };
      similarityCache.set(cacheKey, result);
      return result;
    }
  }

  // Перевірка варіантів імені
  if (isVariantOf(n1, n2) || isVariantOf(n2, n1)) {
    const result = {
      type: 'variant-match',
      quality: getQuality('standardOrderNameVariant') / 100,
    };
    similarityCache.set(cacheKey, result);
    return result;
  }

  // Нечітке співпадіння як останній ресурс
  const similarity = getSimilarity(n1, n2);
  if (similarity >= getThreshold('fuzzyMatch')) {
    const result = {
      type: 'fuzzy-match',
      quality: (getQuality('fullNameTranslit') / 100) * similarity,
    };
    similarityCache.set(cacheKey, result);
    return result;
  }

  const result = { type: 'not-found', quality: 0 };
  similarityCache.set(cacheKey, result);
  return result;
}

// Додаємо кеш для оптимізації
const similarityCache = new Map();

/**
 * Санітизує вхідний текстовий контент від потенційно шкідливих елементів
 * @param {string} content - Контент для санітизації
 * @returns {string} - Очищений контент
 */
export function sanitizeContent(content) {
  if (typeof content !== 'string') return '';
  
  return content
    .replace(/<script/gi, '&lt;script')
    .replace(/<\/script>/gi, '&lt;/script&gt;')
    .replace(/javascript:/gi, 'javascript_blocked:')
    .replace(/on\w+\s*=/gi, 'data-blocked-event=');
}

/**
 * Перевіряє, чи містить контент потенційно шкідливі скрипти
 * @param {string} content - Контент для перевірки
 * @returns {boolean} - true, якщо знайдено небезпечний контент
 */
export function containsScriptTags(content) {
  if (typeof content !== 'string') return false;
  
  const dangerousPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /document\.cookie/gi,
    /eval\s*\(/gi,
    /execScript/gi,
    /Function\s*\(/gi,
    /setInterval|setTimeout|setImmediate/gi,
  ];
  
  return dangerousPatterns.some((pattern) => pattern.test(content));
}
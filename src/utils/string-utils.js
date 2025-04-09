/**
 * Модуль з утилітами для роботи з рядками
 * Містить функції для обчислення відстані, порівняння рядків тощо
 */

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
  
    const matrix = [];
  
    // Ініціалізуємо матрицю
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
  
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }
  
    // Заповнюємо матрицю
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        const cost = a[j - 1] === b[i - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,      // видалення
          matrix[i][j - 1] + 1,      // вставка
          matrix[i - 1][j - 1] + cost // заміна
        );
      }
    }
  
    return matrix[b.length][a.length];
  }
  
  /**
   * Функція для обчислення метрики схожості між двома рядками
   * @param {string} str1 - Перший рядок
   * @param {string} str2 - Другий рядок
   * @returns {number} Схожість від 0 до 1, де 1 - повний збіг
   */
  export function getSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;
    
    // Приведення до нижнього регістру
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();
    
    // Якщо рядки однакові, повертаємо максимальну схожість
    if (s1 === s2) return 1;
    
    // Обчислюємо відстань Левенштейна
    const distance = levenshteinDistance(s1, s2);
    
    // Нормалізуємо відстань по відношенню до довжини найдовшого рядка
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
  export function fuzzyMatch(str1, str2, threshold = 0.3) {
    if (!str1 || !str2) return false;
  
    // Приведення до нижнього регістру
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();
  
    // Якщо рядки однакові, повертаємо true
    if (s1 === s2) return true;
  
    // Обчислюємо відстань Левенштейна
    const distance = levenshteinDistance(s1, s2);
  
    // Нормалізуємо відстань по відношенню до довжини найдовшого рядка
    const maxLength = Math.max(s1.length, s2.length);
    const similarity = 1 - distance / maxLength;
  
    // Повертаємо true, якщо схожість більша за поріг
    return similarity >= 1 - threshold;
  }
  
  /**
   * Функція для перевірки схожості рядків
   * @param {string} str1 - Перший рядок
   * @param {string} str2 - Другий рядок
   * @param {number} threshold - Поріг схожості (0-1)
   * @returns {boolean} Результат порівняння
   */
  export function areStringSimilar(str1, str2, threshold = 0.8) {
    if (!str1 || !str2) return false;
  
    // Приведення до нижнього регістру
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();
  
    // Якщо рядки однакові, повертаємо true
    if (s1 === s2) return true;
  
    // Обчислюємо відстань Левенштейна
    const distance = levenshteinDistance(s1, s2);
  
    // Нормалізуємо відстань по відношенню до довжини найдовшого рядка
    const maxLength = Math.max(s1.length, s2.length);
    const similarity = 1 - distance / maxLength;
  
    // Повертаємо true, якщо схожість більша за поріг
    return similarity >= threshold;
  }
  
  /**
   * Санітизує вхідний текстовий контент від потенційно шкідливих елементів
   * @param {string} content - Контент для санітизації
   * @returns {string} - Очищений контент
   */
  export function sanitizeContent(content) {
    if (typeof content !== 'string') return '';
    
    // Заміна потенційно небезпечних символів на безпечні еквіваленти
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
    
    // Шаблони для пошуку потенційно шкідливого коду
    const dangerousPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, // <script> теги
      /javascript:/gi,                                       // javascript: протокол
      /on\w+\s*=/gi,                                         // onload, onclick і т.д.
      /document\.cookie/gi,                                  // доступ до кукі
      /eval\s*\(/gi,                                         // виклики eval
      /execScript/gi,                                        // execScript
      /Function\s*\(/gi,                                     // Function constructor
      /setInterval|setTimeout|setImmediate/gi                // setTimeout і т.д.
    ];
    
    return dangerousPatterns.some(pattern => pattern.test(content));
  }
/**
 * Функція для обчислення відстані Левенштейна між двома рядками
 * @param {string} a - Перший рядок
 * @param {string} b - Другий рядок
 * @returns {number} Відстань Левенштейна
 */
export function levenshteinDistance(a, b) {
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
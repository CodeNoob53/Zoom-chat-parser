/**
 * Утилітарні функції для обробки імен
 */

/**
 * Функція для обчислення відстані Левенштейна між двома рядками
 * (кількість символів, які потрібно додати, видалити або замінити)
 * @param {string} a - Перший рядок
 * @param {string} b - Другий рядок
 * @returns {number} Відстань Левенштейна
 */
export function levenshteinDistance (a, b) {
    if (a.length === 0) return b.length
    if (b.length === 0) return a.length
  
    const matrix = []
  
    // Ініціалізуємо матрицю
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i]
    }
  
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j
    }
  
    // Заповнюємо матрицю
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        const cost = a[j - 1] === b[i - 1] ? 0 : 1
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1, // видалення
          matrix[i][j - 1] + 1, // вставка
          matrix[i - 1][j - 1] + cost // заміна
        )
      }
    }
  
    return matrix[b.length][a.length]
  }
  
  /**
   * Функція для перевірки нечіткого співпадіння з урахуванням схожості
   * @param {string} str1 - Перший рядок
   * @param {string} str2 - Другий рядок
   * @param {number} threshold - Поріг схожості (менше значення = більша схожість)
   * @returns {boolean} Чи є рядки достатньо схожими
   */
  export function fuzzyMatch (str1, str2, threshold = 0.3) {
    if (!str1 || !str2) return false
  
    // Приведення до нижнього регістру
    const s1 = str1.toLowerCase()
    const s2 = str2.toLowerCase()
  
    // Якщо рядки однакові, повертаємо true
    if (s1 === s2) return true
  
    // Обчислюємо відстань Левенштейна
    const distance = levenshteinDistance(s1, s2)
  
    // Нормалізуємо відстань по відношенню до довжини найдовшого рядка
    const maxLength = Math.max(s1.length, s2.length)
    const similarity = 1 - distance / maxLength
  
    // Повертаємо true, якщо схожість більша за поріг
    return similarity >= 1 - threshold
  }
  
  /**
   * Функція для отримання метрики схожості між двома рядками
   * @param {string} str1 - Перший рядок
   * @param {string} str2 - Другий рядок
   * @returns {number} Схожість від 0 до 1, де 1 - повний збіг
   */
  export function getSimilarity (str1, str2) {
    if (!str1 || !str2) return 0
  
    // Приведення до нижнього регістру
    const s1 = str1.toLowerCase()
    const s2 = str2.toLowerCase()
  
    // Якщо рядки однакові, повертаємо максимальну схожість
    if (s1 === s2) return 1
  
    // Обчислюємо відстань Левенштейна
    const distance = levenshteinDistance(s1, s2)
  
    // Нормалізуємо відстань по відношенню до довжини найдовшого рядка
    const maxLength = Math.max(s1.length, s2.length)
    return 1 - distance / maxLength
  }
  
  /**
   * Функція для перевірки схожості рядків
   * @param {string} str1 - Перший рядок
   * @param {string} str2 - Другий рядок
   * @param {number} threshold - Поріг схожості (0-1)
   * @returns {boolean} Результат порівняння
   */
  export function areStringSimilar (str1, str2, threshold = 0.8) {
    if (!str1 || !str2) return false
  
    // Обчислюємо відстань Левенштейна
    const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase())
  
    // Нормалізуємо відстань
    const maxLength = Math.max(str1.length, str2.length)
    const similarity = 1 - distance / maxLength
  
    return similarity >= threshold
  }
  
  /**
   * Розбиває повне ім'я на частини і враховує обидва можливі порядки
   * @param {string} fullName - Повне ім'я
   * @returns {Object} Об'єкт з різними варіантами імені
   */
  export function splitName (fullName) {
    if (!fullName) return { fullName: '' }
  
    const parts = fullName.trim().split(/\s+/)
  
    // Якщо тільки одне слово
    if (parts.length === 1) {
      return {
        fullName: fullName.trim(),
        onlyOneWord: true,
        word: parts[0]
      }
    }
  
    // Стандартний варіант (перше слово - прізвище, решта - ім'я)
    const standard = {
      surname: parts[0],
      firstname: parts.slice(1).join(' ')
    }
  
    // Альтернативний варіант (останнє слово - прізвище, решта - ім'я)
    const reversed = {
      surname: parts[parts.length - 1],
      firstname: parts.slice(0, parts.length - 1).join(' ')
    }
  
    return {
      fullName: fullName.trim(),
      standard,
      reversed
    }
  }
/**
 * Конфігурація для системи порівняння імен
 * Централізовані параметри налаштування для всіх модулів
 */

/**
 * Налаштування порогів, якостей та стратегій для порівняння імен
 */
export const NameMatchingConfig = {
    // Пороги співпадіння (від 0 до 1)
    thresholds: {
      exactMatch: 1.0,             // Точне співпадіння
      variantMatch: 0.9,           // Співпадіння варіантів імені
      translitMatch: 0.65,         // Співпадіння через транслітерацію
      fuzzyMatch: 0.25,            // Нечітке співпадіння
      autoMatchMin: 0.8,           // Мінімальна якість для автоматичного співпадіння
      similarQualityDiff: 5,       // Різниця в якості для схожих співпадінь
      nicknameMatch: 0.85,         // Співпадіння нікнеймів
      ambiguousMatch: 0.9,         // Поріг для неоднозначних імен
    },
  
    // Оцінки якості для типів співпадінь (від 0 до 100)
    qualities: {
      manualAssignment: 100,       // Ручне призначення
      exactMatch: 100,             // Точне співпадіння
      realNameTag: 99,             // Співпадіння через теги реальних імен
      uniqueSurnameMatch: 98,      // Співпадіння унікального прізвища
      uniqueFirstnameMatch: 97,    // Співпадіння унікального імені
      nicknameMatch: 97,           // Співпадіння нікнеймів
      standardOrderExact: 98,      // Точне співпадіння в стандартному порядку
      reversedOrderExact: 92,      // Точне співпадіння в зворотному порядку
      surnameExactFirstnameFuzzy: 90, // Точне прізвище, нечітке ім'я
      standardOrderNameVariant: 88,   // Варіант імені в стандартному порядку
      standardOrderTranslit: 85,      // Транслітерація в стандартному порядку
      reversedSurnameExactFirstnameFuzzy: 85, // Зворотний порядок, точне прізвище, нечітке ім'я
      reversedOrderNameVariant: 82,     // Варіант імені в зворотному порядку
      reversedOrderTranslit: 80,        // Транслітерація в зворотному порядку
      singleWordVariantMatch: 75,       // Співпадіння варіанту однослівного імені
      singleWordSurnameMatch: 70,       // Співпадіння однослівного імені з прізвищем
      singleWordFirstnameMatch: 65,     // Співпадіння однослівного імені з ім'ям
      fullNameTranslit: 60,             // Транслітерація повного імені
      splitNameMatch: 85,               // Співпадіння склеєного імені
      autoMatchSingleName: 95,          // Автоматичне співпадіння однослівного імені
      autoMatch: 90,                    // Загальне автоматичне співпадіння
      notFound: 0,                      // Не знайдено
    },
  
    // Налаштування стратегій порівняння
    strategies: {
      exactMatch: { priority: 100, enabled: true },
      realNameTag: { priority: 99, enabled: true },
      uniqueName: { priority: 98, enabled: true }, // Додана нова стратегія
      nicknameMatch: { priority: 97, enabled: true },
      nameParts: { priority: 95, enabled: true },
    },
  
    // Обмеження для списків
    limits: {
      maxAlternatives: 3,          // Максимальна кількість альтернатив
      maxNameVariants: 5,          // Максимальна кількість варіантів імені
      maxTranslitVariants: 10,     // Максимальна кількість варіантів транслітерації
      batchSize: 100,              // Розмір пакету для асинхронної обробки
      maxRecommendations: 5,       // Максимальна кількість рекомендацій
    },
  
    // Розміри кешів
    cacheSizes: {
      transliteration: 500,        // Кеш транслітерації
      nameMatching: 1000,          // Кеш порівняння імен
      recommendations: 200,        // Кеш рекомендацій
    },
  
    // Налаштування пошуку
    search: {
      minSearchLength: 2,          // Мінімальна довжина для пошуку
      maxResults: 20,              // Максимальна кількість результатів
      searchDebounceTime: 300,     // Затримка пошуку (мс)
    },
  };
  
  /**
   * Налаштування логування
   */
  export const LoggingConfig = {
    enabled: {
      debug: false,  // Детальне логування
      info: true,    // Інформаційні повідомлення
      warn: true,    // Попередження
      error: true,   // Помилки
    },
    prefix: '[NameMatcher]',  // Префікс для логів
  };
  
  /**
   * Отримати значення порогу
   * @param {string} thresholdName - Назва порогу
   * @returns {number} Значення порогу
   */
  export function getThreshold(thresholdName) {
    return NameMatchingConfig.thresholds[thresholdName] || 0.7;
  }
  
  /**
   * Отримати значення якості
   * @param {string} qualityName - Назва якості
   * @returns {number} Значення якості
   */
  export function getQuality(qualityName) {
    return NameMatchingConfig.qualities[qualityName] || 0;
  }
  
  /**
   * Отримати значення ліміту
   * @param {string} limitName - Назва ліміту
   * @returns {number} Значення ліміту
   */
  export function getLimit(limitName) {
    return NameMatchingConfig.limits[limitName] || 0;
  }
  
  /**
   * Перевірити, чи ввімкнено рівень логування
   * @param {string} level - Рівень логування
   * @returns {boolean} Чи ввімкнено
   */
  export function isLoggingEnabled(level) {
    return LoggingConfig.enabled[level] || false;
  }
  
  /**
   * Отримати конфігурацію стратегії
   * @param {string} strategyName - Назва стратегії
   * @returns {Object} Конфігурація стратегії
   */
  export function getStrategyConfig(strategyName) {
    return NameMatchingConfig.strategies[strategyName] || { priority: 0, enabled: false };
  }
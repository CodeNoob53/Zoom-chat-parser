/**
 * Модуль для логування з підтримкою різних рівнів та форматування
 */
import { isLoggingEnabled, LoggingConfig } from '../../config.js';

/**
 * Класи для форматування виводу в консоль
 */
const ConsoleStyles = {
  // Кольори тексту
  colors: {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
  },
  
  // Стилі тексту
  styles: {
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    italic: '\x1b[3m',
    underline: '\x1b[4m',
  }
};

/**
 * Логер для системи порівняння імен
 */
export const Logger = {
  /**
   * Лог рівня debug (для налагодження)
   * @param {...any} args - Аргументи для логування
   */
  debug: (...args) => {
    if (isLoggingEnabled('debug')) {
      console.debug(
        `${ConsoleStyles.colors.cyan}${ConsoleStyles.styles.dim}${LoggingConfig.prefix} [DEBUG]${ConsoleStyles.colors.reset}`,
        ...args
      );
    }
  },
  
  /**
   * Лог рівня info (інформація)
   * @param {...any} args - Аргументи для логування
   */
  info: (...args) => {
    if (isLoggingEnabled('info')) {
      console.info(
        `${ConsoleStyles.colors.blue}${LoggingConfig.prefix} [INFO]${ConsoleStyles.colors.reset}`,
        ...args
      );
    }
  },
  
  /**
   * Лог рівня warn (попередження)
   * @param {...any} args - Аргументи для логування
   */
  warn: (...args) => {
    if (isLoggingEnabled('warn')) {
      console.warn(
        `${ConsoleStyles.colors.yellow}${ConsoleStyles.styles.bold}${LoggingConfig.prefix} [WARN]${ConsoleStyles.colors.reset}`,
        ...args
      );
    }
  },
  
  /**
   * Лог рівня error (помилка)
   * @param {...any} args - Аргументи для логування
   */
  error: (...args) => {
    if (isLoggingEnabled('error')) {
      console.error(
        `${ConsoleStyles.colors.red}${ConsoleStyles.styles.bold}${LoggingConfig.prefix} [ERROR]${ConsoleStyles.colors.reset}`,
        ...args
      );
    }
  },
  
  /**
   * Особлива функція для логування результатів співпадіння імен
   * @param {string} name - Ім'я для якого було знайдено співпадіння
   * @param {Object} matchInfo - Інформація про співпадіння
   */
  matchResult: (name, matchInfo) => {
    if (isLoggingEnabled('info')) {
      const matchType = matchInfo.matchType || 'unknown';
      const quality = matchInfo.quality || 0;
      const dbName = matchInfo.dbName || 'N/A';
      
      let statusColor;
      if (quality >= 90) statusColor = ConsoleStyles.colors.green;
      else if (quality >= 75) statusColor = ConsoleStyles.colors.cyan;
      else if (quality >= 60) statusColor = ConsoleStyles.colors.yellow;
      else statusColor = ConsoleStyles.colors.red;
      
      console.info(
        `${ConsoleStyles.colors.blue}${LoggingConfig.prefix}${ConsoleStyles.colors.reset} Співпадіння для "${name}": ` +
        `${statusColor}${quality}%${ConsoleStyles.colors.reset} ` +
        `(${matchType}) -> "${dbName}"`
      );
    }
  },
  
  /**
   * Лог для групування виведення (починає групу)
   * @param {string} label - Назва групи
   */
  group: (label) => {
    if (console.group) {
      console.group(`${ConsoleStyles.styles.bold}${label}${ConsoleStyles.colors.reset}`);
    }
  },
  
  /**
   * Завершує групу логів
   */
  groupEnd: () => {
    if (console.groupEnd) {
      console.groupEnd();
    }
  },
  
  /**
   * Вимірює час виконання функції
   * @param {string} label - Назва операції
   * @param {Function} func - Функція для виміру часу
   * @returns {any} Результат виконання функції
   */
  time: (label, func) => {
    if (!isLoggingEnabled('debug')) {
      return func();
    }
    
    console.time(`${LoggingConfig.prefix} ${label}`);
    try {
      const result = func();
      console.timeEnd(`${LoggingConfig.prefix} ${label}`);
      return result;
    } catch (error) {
      console.timeEnd(`${LoggingConfig.prefix} ${label}`);
      throw error;
    }
  },
  
  /**
   * Асинхронний вимір часу виконання функції
   * @param {string} label - Назва операції
   * @param {Function} asyncFunc - Асинхронна функція для виміру часу
   * @returns {Promise<any>} Результат виконання функції
   */
  async timeAsync(label, asyncFunc) {
    if (!isLoggingEnabled('debug')) {
      return await asyncFunc();
    }
    
    console.time(`${LoggingConfig.prefix} ${label}`);
    try {
      const result = await asyncFunc();
      console.timeEnd(`${LoggingConfig.prefix} ${label}`);
      return result;
    } catch (error) {
      console.timeEnd(`${LoggingConfig.prefix} ${label}`);
      throw error;
    }
  },
  
  /**
   * Виводить таблицю з даними
   * @param {Array|Object} data - Дані для виведення
   * @param {string} [label] - Необов'язкова назва таблиці
   */
  table: (data, label) => {
    if (isLoggingEnabled('debug') && console.table) {
      if (label) {
        console.log(`${ConsoleStyles.styles.bold}${label}:${ConsoleStyles.colors.reset}`);
      }
      console.table(data);
    }
  }
};

/**
 * Перехоплення та логування помилок для асинхронної функції
 * @param {Function} asyncFunc - Асинхронна функція
 * @returns {Function} Обгорнута функція з обробкою помилок
 */
export function withErrorLogging(asyncFunc) {
  return async (...args) => {
    try {
      return await asyncFunc(...args);
    } catch (error) {
      Logger.error(`Помилка у функції ${asyncFunc.name || 'анонімній'}:`, error);
      throw error;
    }
  };
}

export default Logger;
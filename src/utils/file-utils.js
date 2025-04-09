/**
 * Модуль утиліт для безпечної роботи з файлами
 */
import { containsScriptTags, sanitizeContent } from './string-utils.js';

/**
 * Максимальні розміри файлів (у байтах)
 */
export const MAX_FILE_SIZES = {
  CHAT: 5 * 1024 * 1024,   // 5 МБ для чату
  DATABASE: 2 * 1024 * 1024 // 2 МБ для бази даних
};

/**
 * Дозволені типи MIME і розширення файлів
 */
export const ALLOWED_FILE_TYPES = {
  // Текстові файли
  TEXT: [
    'text/plain', 
    'text/csv', 
    'application/json',
    'text/x-csv', 
    'application/x-csv',
    'text/comma-separated-values'
  ],
  // Розширення файлів
  EXTENSIONS: {
    TEXT: ['.txt'],
    CSV: ['.csv'],
    JSON: ['.json'],
    ANY_ALLOWED: ['.txt', '.csv', '.json']
  }
};

/**
 * Перевірити розмір файлу
 * @param {File} file - Файл для перевірки
 * @param {number} maxSize - Максимальний дозволений розмір
 * @returns {boolean} Результат перевірки
 */
export function isValidFileSize(file, maxSize) {
  return file && file.size <= maxSize;
}

/**
 * Перевірити тип файлу (MIME-тип та розширення)
 * @param {File} file - Файл для перевірки
 * @param {string[]} allowedExtensions - Масив дозволених розширень
 * @param {string[]} allowedMimeTypes - Масив дозволених MIME-типів
 * @returns {boolean} Результат перевірки
 */
export function isValidFileType(file, allowedExtensions = ALLOWED_FILE_TYPES.EXTENSIONS.ANY_ALLOWED, allowedMimeTypes = ALLOWED_FILE_TYPES.TEXT) {
  if (!file) return false;
  
  // Перевірка розширення файлу
  const fileName = file.name.toLowerCase();
  const isValidExt = allowedExtensions.some(ext => fileName.endsWith(ext));
  
  // Перевірка MIME-типу (якщо доступно)
  const isValidMime = file.type === '' || allowedMimeTypes.includes(file.type);
  
  return isValidExt && isValidMime;
}

/**
 * Асинхронне безпечне читання текстового файлу
 * @param {File} file - Файл для читання
 * @returns {Promise<{success: boolean, content: string|null, error: string|null}>} Результат читання
 */
export async function readTextFile(file) {
  return new Promise(resolve => {
    try {
      // Створюємо читач файлів
      const reader = new FileReader();
      
      // Обробка помилок
      reader.onerror = () => {
        resolve({
          success: false,
          content: null,
          error: 'Помилка читання файлу'
        });
      };
      
      // Обробка успішного читання
      reader.onload = (e) => {
        try {
          // Отримуємо контент
          const content = e.target.result;
          
          // Перевіряємо на шкідливий код
          if (containsScriptTags(content)) {
            resolve({
              success: false,
              content: null,
              error: 'Файл містить потенційно шкідливий код'
            });
            return;
          }
          
          // Повертаємо очищений контент
          resolve({
            success: true,
            content: sanitizeContent(content),
            error: null
          });
        } catch (error) {
          resolve({
            success: false,
            content: null,
            error: `Помилка обробки даних: ${error.message}`
          });
        }
      };
      
      // Читаємо файл як текст
      reader.readAsText(file);
    } catch (error) {
      resolve({
        success: false,
        content: null,
        error: `Помилка: ${error.message}`
      });
    }
  });
}

/**
 * Визначити формат файлу за вмістом та ім'ям
 * @param {string} content - Вміст файлу
 * @param {string} fileName - Ім'я файлу
 * @returns {string} Формат файлу ('json', 'csv', 'txt')
 */
export function detectFileFormat(content, fileName) {
  // Спочатку перевіряємо за розширенням файлу
  if (fileName) {
    const lowerName = fileName.toLowerCase();
    if (lowerName.endsWith('.json')) return 'json';
    if (lowerName.endsWith('.csv')) return 'csv';
    if (lowerName.endsWith('.txt')) return 'txt';
  }
  
  // Якщо розширення не визначене або не відповідає, перевіряємо за вмістом
  if (content) {
    const trimmedContent = content.trim();
    
    // Перевіряємо, чи це JSON
    if (trimmedContent.startsWith('{') && trimmedContent.endsWith('}') || 
        trimmedContent.startsWith('[') && trimmedContent.endsWith(']')) {
      try {
        JSON.parse(trimmedContent);
        return 'json';
      } catch (e) {
        // Не валідний JSON, продовжуємо перевірку
      }
    }
    
    // Перевіряємо, чи це CSV (має коми та рядки)
    if (trimmedContent.includes(',') && 
        trimmedContent.includes('\n') && 
        !trimmedContent.includes('{') && 
        !trimmedContent.includes('[')) {
      return 'csv';
    }
  }
  
  // За замовчуванням вважаємо, що це текстовий файл
  return 'txt';
}

/**
 * Створити безпечний URL для завантаження файлу
 * @param {string} content - Вміст файлу
 * @param {string} mimeType - MIME-тип файлу
 * @returns {string} URL для завантаження
 */
export function createDownloadUrl(content, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  return URL.createObjectURL(blob);
}

/**
 * Ініціювати завантаження файлу користувачем
 * @param {string} url - URL для завантаження
 * @param {string} fileName - Ім'я файлу для завантаження
 */
export function downloadFile(url, fileName) {
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Звільняємо пам'ять
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 100);
}
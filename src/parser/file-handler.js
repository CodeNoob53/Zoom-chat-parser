import { elements } from '../core/dom.js';
import { showNotification } from '../core/notification.js';
import { importTxt, importCsv, importJson } from '../database/database-import-export.js';
import { containsScriptTags, sanitizeContent } from '../utils/string-utils.js';

/**
 * Максимальні розміри файлів (у байтах)
 */
const MAX_CHAT_FILE_SIZE = 5 * 1024 * 1024; // 5 МБ для чату
const MAX_DB_FILE_SIZE = 2 * 1024 * 1024;   // 2 МБ для бази даних

/**
 * Дозволені типи MIME і розширення файлів
 */
const ALLOWED_TEXT_TYPES = [
  'text/plain', 
  'text/csv', 
  'application/json',
  'text/x-csv', 
  'application/x-csv',
  'text/comma-separated-values'
];

const ALLOWED_EXTENSIONS = ['.txt', '.csv', '.json'];

/**
 * Перевіряє, чи є файл допустимим текстовим файлом
 * @param {File} file - Файл для перевірки
 * @param {string[]} allowedExts - Масив дозволених розширень
 * @returns {boolean} - Чи є файл допустимим
 */
function isValidTextFile(file, allowedExts = ALLOWED_EXTENSIONS) {
  // Перевірка MIME-типу
  const isValidMime = ALLOWED_TEXT_TYPES.includes(file.type) || file.type === '';
  
  // Перевірка розширення файлу
  const fileName = file.name.toLowerCase();
  const isValidExt = allowedExts.some(ext => fileName.endsWith(ext));
  
  return isValidMime && isValidExt;
}

/**
 * Ініціалізує обробники подій для файлів з покращеною безпекою
 */
export function initFileHandlers() {
  const { fileInput, chatInput } = elements;
  
  // Перевірка наявності елементів перед додаванням слухачів
  if (fileInput) {
    // Коли вибрано файл чату
    fileInput.addEventListener("change", () => {
      if (fileInput.files && fileInput.files[0]) {
        const file = fileInput.files[0];
        
        // Перевірка розміру файлу
        if (file.size > MAX_CHAT_FILE_SIZE) {
          showNotification("Файл занадто великий. Максимальний розмір 5 МБ.", "error");
          fileInput.value = "";
          return;
        }
        
        // Перевірка типу файлу
        if (!isValidTextFile(file, ['.txt'])) {
          showNotification("Дозволені тільки текстові файли (.txt)", "error");
          fileInput.value = "";
          return;
        }
        
        const reader = new FileReader();
        
        // Обробка помилок при читанні
        reader.onerror = () => {
          showNotification("Помилка читання файлу", "error");
          fileInput.value = "";
        };
        
        reader.onload = (e) => {
          try {
            // Перевірка на потенційно шкідливий контент
            const content = e.target.result;
            
            // Перевіряємо наявність скриптів та HTML
            if (containsScriptTags(content)) {
              showNotification("Файл може містити потенційно шкідливий код", "error");
              fileInput.value = "";
              return;
            }
            
            // Валідний файл, використовуємо його контент
            chatInput.value = sanitizeContent(content);
            
            // Скидаємо значення input файлу після завантаження
            fileInput.value = "";
          } catch (error) {
            console.error("Помилка обробки файлу:", error);
            showNotification("Помилка обробки файлу", "error");
            fileInput.value = "";
          }
        };
        
        // Безпечне читання як текст
        reader.readAsText(file);
      }
    });
  }
}

/**
 * Ініціалізує обробник імпорту для вкладки "База"
 * @param {HTMLElement} importFile - Елемент інпуту для файлу
 */
export function initDatabaseImport(importFile) {
  if (!importFile) return;
  
  importFile.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Перевірка розміру файлу
    if (file.size > MAX_DB_FILE_SIZE) {
      showNotification("Файл бази занадто великий. Максимальний розмір 2 МБ.", "error");
      importFile.value = "";
      return;
    }
    
    // Перевірка типу файлу
    if (!isValidTextFile(file)) {
      showNotification("Підтримуються формати: TXT, CSV, JSON", "error");
      importFile.value = "";
      return;
    }
    
    const reader = new FileReader();
    
    reader.onerror = () => {
      showNotification("Помилка читання файлу бази", "error");
      importFile.value = "";
    };
    
    reader.onload = (event) => {
      try {
        const content = event.target.result;
        
        // Перевіряємо на скрипти та HTML
        if (containsScriptTags(content)) {
          showNotification("Файл бази може містити потенційно шкідливий код", "error");
          importFile.value = "";
          return;
        }
        
        // Визначаємо формат файлу та імпортуємо
        if (file.name.endsWith('.json') || content.trim().startsWith('{')) {
          importJson(sanitizeContent(content));
        } else if (file.name.endsWith('.csv') || content.includes(',')) {
          importCsv(sanitizeContent(content));
        } else {
          importTxt(sanitizeContent(content));
        }
        
        // Скидаємо значення поля файлу
        importFile.value = "";
      } catch (error) {
        console.error("Помилка обробки файлу бази:", error);
        showNotification("Помилка обробки файлу бази", "error");
        importFile.value = "";
      }
    };
    
    reader.readAsText(file);
  });
}

// Експортуємо sanitizeContent для зворотної сумісності
export { sanitizeContent };
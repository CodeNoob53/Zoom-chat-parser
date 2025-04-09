/**
 * Модуль для безпечної обробки завантажених файлів
 * з використанням async/await
 */
import { elements } from '../core/dom.js';
import { showNotification } from '../core/notification.js';
import { importTxt, importCsv, importJson } from '../database/database-import-export.js';
import {
  MAX_FILE_SIZES,
  ALLOWED_FILE_TYPES,
  isValidFileSize,
  isValidFileType,
  readTextFile,
  detectFileFormat
} from '../utils/file-utils.js';

/**
 * Ініціалізує обробники подій для файлів з покращеною безпекою та асинхронністю
 */
export function initFileHandlers() {
  const { fileInput, chatInput } = elements;
  
  // Перевірка наявності елементів перед додаванням слухачів
  if (fileInput) {
    // Коли вибрано файл чату
    fileInput.addEventListener("change", async (event) => {
      if (!fileInput.files || !fileInput.files[0]) return;
      
      try {
        const file = fileInput.files[0];
        
        // Перевірка розміру файлу
        if (!isValidFileSize(file, MAX_FILE_SIZES.CHAT)) {
          showNotification("Файл занадто великий. Максимальний розмір 5 МБ.", "error");
          fileInput.value = "";
          return;
        }
        
        // Перевірка типу файлу
        if (!isValidFileType(file, ALLOWED_FILE_TYPES.EXTENSIONS.TEXT)) {
          showNotification("Дозволені тільки текстові файли (.txt)", "error");
          fileInput.value = "";
          return;
        }
        
        // Асинхронне читання файлу
        const result = await readTextFile(file);
        
        if (!result.success) {
          showNotification(result.error, "error");
          fileInput.value = "";
          return;
        }
        
        // Встановлюємо вміст чату
        chatInput.value = result.content;
        
        // Скидаємо значення input файлу після завантаження
        fileInput.value = "";
        
        showNotification("Файл завантажено успішно", "success");
      } catch (error) {
        console.error("Помилка обробки файлу:", error);
        showNotification("Помилка обробки файлу", "error");
        fileInput.value = "";
      }
    });
  }
}

/**
 * Ініціалізує обробник імпорту для вкладки "База"
 * @param {HTMLElement} importFile - Елемент інпуту для файлу
 */
export async function initDatabaseImport(importFile) {
  if (!importFile) return;
  
  importFile.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      // Перевірка розміру файлу
      if (!isValidFileSize(file, MAX_FILE_SIZES.DATABASE)) {
        showNotification("Файл бази занадто великий. Максимальний розмір 2 МБ.", "error");
        importFile.value = "";
        return;
      }
      
      // Перевірка типу файлу
      if (!isValidFileType(file, ALLOWED_FILE_TYPES.EXTENSIONS.ANY_ALLOWED)) {
        showNotification("Підтримуються формати: TXT, CSV, JSON", "error");
        importFile.value = "";
        return;
      }
      
      // Асинхронне читання файлу
      const result = await readTextFile(file);
      
      if (!result.success) {
        showNotification(result.error, "error");
        importFile.value = "";
        return;
      }
      
      // Визначаємо формат файлу
      const fileFormat = detectFileFormat(result.content, file.name);
      
      // Імпортуємо дані відповідно до формату
      switch (fileFormat) {
        case 'json':
          importJson(result.content);
          break;
        case 'csv':
          importCsv(result.content);
          break;
        case 'txt':
        default:
          importTxt(result.content);
          break;
      }
      
      // Скидаємо значення поля файлу
      importFile.value = "";
    } catch (error) {
      console.error("Помилка обробки файлу бази:", error);
      showNotification("Помилка обробки файлу бази", "error");
      importFile.value = "";
    }
  });
}
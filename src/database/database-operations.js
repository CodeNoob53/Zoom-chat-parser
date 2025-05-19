/**
 * Модуль для операцій з базою даних
 */
import { showNotification } from '../core/notification.js';
import { importFile, exportFile } from '../utils/file-operations.js';
import { getDatabase } from './database-service.js';
import { renderDatabaseTable } from './database-table.js';
import {
  MAX_FILE_SIZES,
  ALLOWED_FILE_TYPES,
  isValidFileSize,
  isValidFileType
} from '../utils/file-utils.js';

/**
 * Імпортувати файл бази даних
 * @param {File} file - Файл для імпорту
 * @returns {Promise<boolean>} Результат імпорту
 */
export async function importDatabaseFile(file) {
  if (!file) return false;

  try {
    // Перевірка розміру файлу
    if (!isValidFileSize(file, MAX_FILE_SIZES.DATABASE)) {
      showNotification("Файл бази занадто великий. Максимальний розмір 2 МБ.", "error");
      return false;
    }
    
    // Перевірка типу файлу
    if (!isValidFileType(file, ALLOWED_FILE_TYPES.EXTENSIONS.ANY_ALLOWED)) {
      showNotification("Підтримуються формати: TXT, CSV, JSON", "error");
      return false;
    }
    
    // Імпортуємо файл
    const success = await importFile(file, { isDatabase: true });
    if (success) {
      renderDatabaseTable();
      return true;
    }
    return false;
  } catch (error) {
    console.error("Помилка обробки файлу бази:", error);
    showNotification("Помилка обробки файлу бази", "error");
    return false;
  }
}

/**
 * Експортувати базу даних
 * @param {string} format - Формат експорту ('csv', 'json')
 * @returns {boolean} Результат експорту
 */
export function exportDatabase(format) {
  try {
    const database = getDatabase();
    
    if (database.entries.length === 0) {
      showNotification('База даних порожня', 'warning');
      return false;
    }
    
    return exportFile(database, format, { isDatabase: true });
  } catch (error) {
    console.error('Помилка експорту бази даних:', error);
    showNotification('Помилка експорту бази даних', 'error');
    return false;
  }
}

/**
 * Ініціалізувати обробники імпорту/експорту бази даних
 * @param {HTMLElement} importBtn - Кнопка імпорту
 * @param {HTMLElement} importFile - Елемент інпуту для файлу
 * @param {HTMLElement} exportCsvBtn - Кнопка експорту CSV
 * @param {HTMLElement} exportJsonBtn - Кнопка експорту JSON
 */
export function initDatabaseHandlers(importBtn, importFile, exportCsvBtn, exportJsonBtn) {
  // Обробник кнопки імпорту
  if (importBtn && importFile) {
    importBtn.addEventListener('click', () => {
      importFile.click();
    });
    
    // Обробник вибору файлу
    importFile.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const success = await importDatabaseFile(file);
      if (success) {
        importFile.value = '';
      }
    });
  }
  
  // Обробник кнопки експорту CSV
  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', () => {
      exportDatabase('csv');
    });
  }
  
  // Обробник кнопки експорту JSON
  if (exportJsonBtn) {
    exportJsonBtn.addEventListener('click', () => {
      exportDatabase('json');
    });
  }
} 
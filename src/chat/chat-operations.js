/**
 * Модуль для операцій з чатом
 */
import { showNotification } from '../core/notification.js';
import { importFile, exportFile } from '../utils/file-operations.js';
import { visualizeChat } from '../ui/chat-view.js';
import {
  MAX_FILE_SIZES,
  ALLOWED_FILE_TYPES,
  isValidFileSize,
  isValidFileType
} from '../utils/file-utils.js';

/**
 * Імпортувати файл чату
 * @param {File} file - Файл для імпорту
 * @returns {Promise<boolean>} Результат імпорту
 */
export async function importChatFile(file) {
  if (!file) return false;

  try {
    // Перевірка розміру файлу
    if (!isValidFileSize(file, MAX_FILE_SIZES.CHAT)) {
      showNotification("Файл чату занадто великий. Максимальний розмір 10 МБ.", "error");
      return false;
    }
    
    // Перевірка типу файлу
    if (!isValidFileType(file, ALLOWED_FILE_TYPES.EXTENSIONS.TEXT)) {
      showNotification("Підтримуються тільки текстові файли", "error");
      return false;
    }
    
    // Імпортуємо файл
    const success = await importFile(file, { isDatabase: false });
    if (success) {
      // Візуалізуємо чат
      visualizeChat();
      return true;
    }
    return false;
  } catch (error) {
    console.error("Помилка обробки файлу чату:", error);
    showNotification("Помилка обробки файлу чату", "error");
    return false;
  }
}

/**
 * Експортувати дані чату
 * @param {Object} data - Дані для експорту
 * @param {string} format - Формат експорту ('txt', 'csv', 'json')
 * @returns {boolean} Результат експорту
 */
export function exportChatData(data, format) {
  try {
    if (!data || !data.participants || data.participants.length === 0) {
      showNotification("Немає даних для експорту", "warning");
      return false;
    }

    return exportFile(data, format, { isDatabase: false });
  } catch (error) {
    console.error("Помилка експорту чату:", error);
    showNotification("Помилка експорту чату", "error");
    return false;
  }
}

/**
 * Ініціалізувати обробники файлів чату
 * @param {HTMLElement} fileInput - Елемент інпуту для файлу
 * @param {HTMLElement} chatInput - Елемент інпуту для чату
 */
export function initChatFileHandlers(fileInput, chatInput) {
  if (fileInput) {
    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const success = await importChatFile(file);
      if (success) {
        fileInput.value = "";
      }
    });
  }
  
  if (chatInput) {
    chatInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const success = await importChatFile(file);
      if (success) {
        chatInput.value = "";
      }
    });
  }
} 
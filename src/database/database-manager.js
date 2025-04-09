/**
 * Головний модуль для роботи з базою даних
 * Об'єднує всі модулі в одну систему
 */

// Імпорт основних компонентів
import { 
  initDatabaseService,
  updateDbStatusDisplay, 
  getDatabase,
  findEntryByNickname,
  findEntryByFullName,
  addNicknameToEntry,
  convertOldDatabase,
  getOldFormatDatabase,
  addEntry,
  getAllEntries,
  searchEntries
} from './database-service.js';

import { 
  initDatabaseForm, 
  editDatabaseEntry, 
  deleteDatabaseEntry 
} from './database-form-manager.js';

import { initImportExportButtons } from './database-import-export.js';
import { renderDatabaseTable } from './database-table.js';
import { initDatabaseSearch } from './database-search.js';

// Реекспорт API функцій для зовнішнього використання
export { 
  getDatabase,
  getAllEntries,
  findEntryByNickname,
  findEntryByFullName,
  addNicknameToEntry,
  convertOldDatabase,
  getOldFormatDatabase,
  addEntry,
  editDatabaseEntry,
  deleteDatabaseEntry,
  searchEntries
};

/**
 * Ініціалізувати менеджер бази даних
 * @param {Object} options - Налаштування
 */
export function initDatabaseManager(options = {}) {
  // Ініціалізуємо сервіс бази даних з налаштуваннями
  initDatabaseService(options);
  
  // Ініціалізуємо форму бази даних
  initDatabaseForm();
  
  // Ініціалізуємо кнопки імпорту/експорту
  initImportExportButtons();
  
  // Відображаємо таблицю бази
  renderDatabaseTable();
  
  // Ініціалізуємо пошук
  initDatabaseSearch();
  
  // Оновлюємо статус бази даних на вкладці "Парсер"
  updateDbStatusDisplay();
  
  console.log('Менеджер бази даних ініціалізовано');
}
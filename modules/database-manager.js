/**
 * Головний модуль для роботи з базою даних
 * Об'єднує всі модулі в одну систему
 */

// Імпорт основних компонентів
import { loadDatabaseFromLocalStorage, updateDbStatusDisplay } from './database-core.js';
import { initDatabaseForm } from './database-form.js';
import { initImportExportButtons } from './database-import-export.js';
import { renderDatabaseTable } from './database-table.js';
import { initDatabaseSearch } from './database-search.js';

// Реекспорт API функцій для зовнішнього використання
export { 
  getDatabase,
  findEntryByNickname,
  findEntryByFullName,
  addNicknameToEntry,
  convertOldDatabase,
  getOldFormatDatabase,
  addEntry
} from './database-api.js';

/**
 * Ініціалізувати менеджер бази даних
 */
export function initDatabaseManager() {
  // Завантажуємо збережену базу з localStorage
  loadDatabaseFromLocalStorage();
  
  // Ініціалізуємо форму
  initDatabaseForm();
  
  // Ініціалізуємо кнопки імпорту/експорту
  initImportExportButtons();
  
  // Відображаємо таблицю бази
  renderDatabaseTable();
  
  // Ініціалізуємо пошук
  initDatabaseSearch();
  
  // Оновлюємо статус бази даних на вкладці "Парсер"
  updateDbStatusDisplay();
}
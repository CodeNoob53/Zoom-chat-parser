/**
 * Модуль для пошуку в базі даних
 */
import { showNotification } from '../core/notification.js';
import * as DatabaseService from './database-service.js';
import { renderDatabaseTable } from './database-table.js';

/**
 * Ініціалізувати пошук у базі даних
 */
export function initDatabaseSearch() {
  const searchInput = document.getElementById('dbSearchInput');
  const searchBtn = document.getElementById('dbSearchBtn');
  
  if (!searchInput || !searchBtn) return;
  
  // Обробник кнопки пошуку
  searchBtn.addEventListener('click', () => {
    performSearch(searchInput.value);
  });
  
  // Обробник натискання Enter у полі пошуку
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      performSearch(searchInput.value);
      e.preventDefault();
    }
  });
  
  // Обробник зміни тексту в полі пошуку
  searchInput.addEventListener('input', () => {
    // Для реалізації "живого пошуку" додамо debounce
    clearTimeout(searchInput.debounceTimer);
    
    // Якщо поле порожнє, показуємо всі записи
    if (!searchInput.value.trim()) {
      renderDatabaseTable();
      return;
    }
    
    // Затримка для зменшення навантаження при швидкому введенні
    searchInput.debounceTimer = setTimeout(() => {
      performSearch(searchInput.value, true);
    }, 300);
  });
}

/**
 * Виконати пошук в базі даних
 * @param {string} query - Пошуковий запит
 * @param {boolean} silent - Не показувати сповіщення при пошуку
 */
export function performSearch(query, silent = false) {
  // Якщо поле порожнє, показуємо всі записи
  if (!query.trim()) {
    renderDatabaseTable();
    return;
  }
  
  // Шукаємо записи через сервіс
  const filteredEntries = DatabaseService.searchEntries(query);
  
  // Відображаємо результати
  renderDatabaseTable(filteredEntries);
  
  // Показуємо сповіщення про результат, якщо не silent
  if (!silent) {
    if (filteredEntries.length === 0) {
      showNotification('Не знайдено записів, що відповідають запиту', 'warning');
    } else {
      showNotification(`Знайдено ${filteredEntries.length} записів`, 'success');
    }
  }
}
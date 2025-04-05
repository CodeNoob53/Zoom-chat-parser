/**
 * Модуль для пошуку в базі даних
 */
import { showNotification } from './notification.js';
import { databaseData } from './database-core.js';
import { renderDatabaseTable } from './database-table.js';

/**
 * Ініціалізувати пошук у базі даних
 */
export function initDatabaseSearch() {
  const searchInput = document.getElementById('dbSearchInput');
  const searchBtn = document.getElementById('dbSearchBtn');
  
  // Обробник кнопки пошуку
  searchBtn.addEventListener('click', () => {
    performSearch(searchInput.value);
  });
  
  // Обробник натискання Enter у полі пошуку
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      performSearch(searchInput.value);
    }
  });
  
  // Обробник зміни тексту в полі пошуку
  searchInput.addEventListener('input', () => {
    // Якщо поле порожнє, показуємо всі записи
    if (!searchInput.value.trim()) {
      renderDatabaseTable();
    }
  });
}

/**
 * Виконати пошук в базі даних
 * @param {string} query - Пошуковий запит
 */
export function performSearch(query) {
  // Якщо поле порожнє, показуємо всі записи
  if (!query.trim()) {
    renderDatabaseTable();
    return;
  }
  
  // Шукаємо записи, що відповідають запиту
  const filteredEntries = databaseData.entries.filter(entry => {
    const searchLower = query.toLowerCase();
    
    // Пошук у прізвищі та імені
    if (entry.surname.toLowerCase().includes(searchLower) ||
        entry.firstname.toLowerCase().includes(searchLower)) {
      return true;
    }
    
    // Пошук у нікнеймах
    if (entry.nicknames && entry.nicknames.some(nick => 
        nick && nick.toLowerCase().includes(searchLower))) {
      return true;
    }
    
    // Пошук за ID
    if (entry.id.includes(query)) {
      return true;
    }
    
    return false;
  });
  
  // Відображаємо результати
  renderDatabaseTable(filteredEntries);
  
  // Показуємо результати пошуку
  if (filteredEntries.length === 0) {
    showNotification('Не знайдено записів, що відповідають запиту', 'warning');
  } else {
    showNotification(`Знайдено ${filteredEntries.length} записів`, 'success');
  }
}
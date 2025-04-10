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
  
  if (!searchInput) return;
  
  // Обробник натискання Enter у полі пошуку
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      performSearch(searchInput.value);
      e.preventDefault();
    }
  });
  
  // Спрощений обробник зміни тексту
  searchInput.addEventListener('input', () => {
    clearTimeout(searchInput.debounceTimer);
    
    searchInput.debounceTimer = setTimeout(() => {
      const searchText = searchInput.value.trim();
      
      try {
        // Простіший підхід до оновлення таблиці
        const databaseList = document.getElementById('databaseList');
        if (!databaseList) return;
        
        if (searchText === '') {
          // Показати всі записи
          import('../database/database-service.js').then(module => {
            const entries = module.getAllEntries();
            renderEntriesToTable(entries, databaseList);
          });
        } else {
          // Шукати за текстом
          import('../database/database-service.js').then(module => {
            const entries = module.searchEntries(searchText);
            renderEntriesToTable(entries, databaseList);
          });
        }
      } catch (error) {
        console.error('Помилка при пошуку:', error);
      }
    }, 300);
  });
}

/**
 * Відображає записи в таблиці більш простим способом
 * @param {Array} entries - Записи для відображення
 * @param {HTMLElement} tableBody - Тіло таблиці
 */
function renderEntriesToTable(entries, tableBody) {
  // Очищаємо таблицю
  tableBody.innerHTML = '';
  
  if (entries.length === 0) {
    // Показуємо повідомлення про відсутність результатів
    const emptyRow = document.createElement('tr');
    const emptyCell = document.createElement('td');
    emptyCell.colSpan = 5;
    emptyCell.style.textAlign = 'center';
    emptyCell.style.padding = '20px';
    emptyCell.textContent = 'Немає результатів для відображення';
    emptyRow.appendChild(emptyCell);
    tableBody.appendChild(emptyRow);
    return;
  }
  
  // Додаємо рядки для записів
  entries.forEach(entry => {
    const row = document.createElement('tr');
    row.dataset.id = entry.id;
    
    // ID
    const idCell = document.createElement('td');
    idCell.textContent = entry.id;
    row.appendChild(idCell);
    
    // Прізвище
    const surnameCell = document.createElement('td');
    surnameCell.textContent = entry.surname;
    row.appendChild(surnameCell);
    
    // Ім'я
    const firstnameCell = document.createElement('td');
    firstnameCell.textContent = entry.firstname;
    row.appendChild(firstnameCell);
    
    // Нікнейми
    const nicknamesCell = document.createElement('td');
    const nicknamesPills = document.createElement('div');
    nicknamesPills.className = 'nickname-pills';
    
    if (entry.nicknames && entry.nicknames.length > 0) {
      entry.nicknames.forEach(nickname => {
        if (nickname) {
          const pill = document.createElement('span');
          pill.className = 'nickname-pill';
          pill.textContent = nickname;
          nicknamesPills.appendChild(pill);
        }
      });
    }
    
    nicknamesCell.appendChild(nicknamesPills);
    row.appendChild(nicknamesCell);
    
    // Дії
    const actionsCell = document.createElement('td');
    const actions = document.createElement('div');
    actions.className = 'row-actions';
    
    // Кнопка редагування
    const editBtn = document.createElement('button');
    editBtn.className = 'edit-btn';
    editBtn.title = 'Редагувати';
    editBtn.onclick = () => editDatabaseEntry(entry.id);
    
    const editIcon = document.createElement('span');
    editIcon.className = 'material-icons';
    editIcon.textContent = 'edit';
    editBtn.appendChild(editIcon);
    
    // Кнопка видалення
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.title = 'Видалити';
    deleteBtn.onclick = () => deleteEntryWithConfirmation(entry.id);
    
    const deleteIcon = document.createElement('span');
    deleteIcon.className = 'material-icons';
    deleteIcon.textContent = 'delete';
    deleteBtn.appendChild(deleteIcon);
    
    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);
    actionsCell.appendChild(actions);
    row.appendChild(actionsCell);
    
    tableBody.appendChild(row);
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
/**
 * Модуль для роботи з таблицею бази даних
 * З оптимізаціями рендерингу DOM
 */
import { showNotification } from '../core/notification.js';
import { 
  getAllEntries, 
  deleteEntry
} from './database-service.js';
import { editDatabaseEntry } from './database-form-manager.js';
import { 
  createFragment, 
  createElement, 
  updateTable 
} from '../utils/dom-utils.js';

// Кеш останніх відображених записів для оптимізації рендерингу
let lastRenderedEntries = [];

/**
 * Відрендерити таблицю бази даних з оптимізацією оновлення DOM
 * @param {Array} filteredEntries - Відфільтровані записи (якщо є)
 */
export function renderDatabaseTable(filteredEntries) {
  const tableBody = document.getElementById('databaseList');
  if (!tableBody) return;
  
  // Визначаємо, які записи відображати
  const entries = filteredEntries || getAllEntries();
  
  // Якщо дані не змінилися, пропускаємо рендеринг
  if (areEntriesEqual(entries, lastRenderedEntries)) {
    return;
  }
  
  // Оновлюємо кеш
  lastRenderedEntries = [...entries];
  
  // Якщо таблиця порожня, показуємо повідомлення
  if (entries.length === 0) {
    renderEmptyTableMessage(tableBody);
    return;
  }
  
  // Використовуємо оптимізоване оновлення таблиці
  updateTable(tableBody, entries, renderTableRow, 'id');
}

/**
 * Перевірка, чи змінилися записи
 * @param {Array} entries1 - Перший набір записів
 * @param {Array} entries2 - Другий набір записів
 * @returns {boolean} true, якщо набори рівні
 */
function areEntriesEqual(entries1, entries2) {
  if (entries1.length !== entries2.length) return false;
  
  // Перевіряємо кожен запис за ID
  const entriesMap = new Map();
  entries2.forEach(entry => entriesMap.set(entry.id, entry));
  
  for (const entry of entries1) {
    if (!entriesMap.has(entry.id)) return false;
    
    const cachedEntry = entriesMap.get(entry.id);
    
    // Порівнюємо основні поля
    if (entry.surname !== cachedEntry.surname || 
        entry.firstname !== cachedEntry.firstname) {
      return false;
    }
    
    // Порівнюємо нікнейми
    const entryNicks = entry.nicknames || [];
    const cachedNicks = cachedEntry.nicknames || [];
    
    if (entryNicks.length !== cachedNicks.length) return false;
    
    for (let i = 0; i < entryNicks.length; i++) {
      if (entryNicks[i] !== cachedNicks[i]) return false;
    }
  }
  
  return true;
}

/**
 * Відображає повідомлення про порожню таблицю
 * @param {HTMLElement} tableBody - DOM елемент tbody таблиці
 */
function renderEmptyTableMessage(tableBody) {
  tableBody.innerHTML = '';
  
  const emptyRow = createElement('tr');
  const emptyCell = createElement('td', {
    colSpan: 5,
    style: {
      textAlign: 'center',
      padding: '20px'
    }
  }, 'База даних порожня');
  
  emptyRow.appendChild(emptyCell);
  tableBody.appendChild(emptyRow);
}

/**
 * Створює рядок таблиці для запису бази даних
 * @param {Object} entry - Запис бази даних
 * @returns {HTMLElement} DOM елемент рядка таблиці
 */
function renderTableRow(entry) {
  // Створюємо рядок
  const row = createElement('tr', { 'data-id': entry.id });
  
  // ID
  row.appendChild(createElement('td', {}, entry.id));
  
  // Прізвище
  row.appendChild(createElement('td', {}, entry.surname));
  
  // Ім'я
  row.appendChild(createElement('td', {}, entry.firstname));
  
  // Нікнейми
  const nicknamesCell = createElement('td');
  const nicknamesPills = createElement('div', { className: 'nickname-pills' });
  
  if (entry.nicknames && entry.nicknames.length > 0) {
    entry.nicknames.forEach(nickname => {
      if (nickname) {
        nicknamesPills.appendChild(
          createElement('span', { className: 'nickname-pill' }, nickname)
        );
      }
    });
  }
  
  nicknamesCell.appendChild(nicknamesPills);
  row.appendChild(nicknamesCell);
  
  // Дії
  const actionsCell = createElement('td');
  const actions = createElement('div', { className: 'row-actions' });
  
  // Кнопка редагування
  actions.appendChild(
    createElement('button', {
      className: 'edit-btn',
      title: 'Редагувати',
      onclick: () => editDatabaseEntry(entry.id)
    }, createElement('span', { className: 'material-icons' }, 'edit'))
  );
  
  // Кнопка видалення
  actions.appendChild(
    createElement('button', {
      className: 'delete-btn',
      title: 'Видалити',
      onclick: () => deleteEntryWithConfirmation(entry.id)
    }, createElement('span', { className: 'material-icons' }, 'delete'))
  );
  
  actionsCell.appendChild(actions);
  row.appendChild(actionsCell);
  
  return row;
}

/**
 * Видалити запис з підтвердженням
 * @param {string} id - ID запису для видалення
 */
export function deleteEntryWithConfirmation(id) {
  // Запитуємо підтвердження
  if (!confirm('Ви впевнені, що хочете видалити цей запис?')) {
    return;
  }
  
  // Видаляємо запис
  if (deleteEntry(id)) {
    // Оновлюємо таблицю
    renderDatabaseTable();
    showNotification('Запис видалено', 'success');
  } else {
    showNotification('Помилка видалення запису', 'error');
  }
}
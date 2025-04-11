// src/database/database-table.js
import { showNotification } from '../core/notification.js';
import { 
  getAllEntries, 
  deleteEntry
} from './database-service.js';
import { editDatabaseEntry } from './database-form-manager.js';
import { 
  sortDatabaseEntries, 
  getCurrentDbSortState 
} from '../ui/sorting.js';
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
  
  // Отримуємо поточний стан сортування
  const sortState = getCurrentDbSortState();
  
  // Встановлюємо візуальні індикатори сортування
  updateSortIndicators(sortState);
  
  // Сортуємо записи
  const sortedEntries = sortDatabaseEntries(entries, sortState.column, sortState.direction);
  
  // Якщо таблиця порожня, показуємо повідомлення
  if (sortedEntries.length === 0) {
    renderEmptyTableMessage(tableBody);
    return;
  }
  
  // Очищаємо таблицю і додаємо нові рядки
  tableBody.innerHTML = '';
  
  // Додаємо відсортовані записи
  sortedEntries.forEach(entry => {
    const row = renderTableRow(entry);
    tableBody.appendChild(row);
  });
  
  // Оновлюємо кеш
  lastRenderedEntries = [...sortedEntries];
  
  console.log(`Таблиця бази даних відсортована за ${sortState.column} (${sortState.direction})`);
}

/**
 * Оновлення візуальних індикаторів сортування
 * @param {Object} sortState - Поточний стан сортування {column, direction}
 */
function updateSortIndicators(sortState) {
  // Отримуємо елементи заголовків
  const sortById = document.getElementById('sortDbById');
  const sortBySurname = document.getElementById('sortDbBySurname');
  const sortByFirstname = document.getElementById('sortDbByFirstname');
  const sortByNicknames = document.getElementById('sortDbByNicknames');
  
  // Видаляємо класи сортування з усіх заголовків
  [sortById, sortBySurname, sortByFirstname, sortByNicknames].forEach(th => {
    if (th) {
      th.classList.remove('sorted', 'asc', 'desc');
    }
  });
  
  // Визначаємо поточний заголовок для сортування
  let currentTh = null;
  switch(sortState.column) {
    case 'id':
      currentTh = sortById;
      break;
    case 'surname':
      currentTh = sortBySurname;
      break;
    case 'firstname':
      currentTh = sortByFirstname;
      break;
    case 'nicknames':
      currentTh = sortByNicknames;
      break;
  }
  
  // Додаємо класи до поточного заголовка
  if (currentTh) {
    currentTh.classList.add('sorted');
    currentTh.classList.add(sortState.direction);
  }
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
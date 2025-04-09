/**
 * Модуль для роботи з таблицею бази даних
 */
import { showNotification } from '../core/notification.js';
import { 
  databaseData, 
  updateMappings, 
  saveDatabaseToLocalStorage, 
  updateDbStatusDisplay 
} from './database-core.js';
import { editEntry } from './database-form-modal.js'; // Оновлено шлях імпорту

/**
 * Відрендерити таблицю бази даних
 * @param {Array} filteredEntries - Відфільтровані записи (якщо є)
 */
export function renderDatabaseTable(filteredEntries) {
  const tableBody = document.getElementById('databaseList');
  if (!tableBody) return;
  
  // Очищаємо таблицю
  tableBody.innerHTML = '';
  
  // Визначаємо, які записи відображати
  const entries = filteredEntries || databaseData.entries;
  
  if (entries.length === 0) {
    // Показуємо повідомлення про порожню базу
    const emptyRow = document.createElement('tr');
    const emptyCell = document.createElement('td');
    emptyCell.colSpan = 5;
    emptyCell.textContent = 'База даних порожня';
    emptyCell.style.textAlign = 'center';
    emptyCell.style.padding = '20px';
    emptyRow.appendChild(emptyCell);
    tableBody.appendChild(emptyRow);
    return;
  }
  
  // Додаємо рядки
  entries.forEach(entry => {
    const row = document.createElement('tr');
    
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
    editBtn.innerHTML = '<span class="material-icons">edit</span>';
    editBtn.addEventListener('click', () => {
      editEntry(entry.id);
    });
    actions.appendChild(editBtn);
    
    // Кнопка видалення
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.title = 'Видалити';
    deleteBtn.innerHTML = '<span class="material-icons">delete</span>';
    deleteBtn.addEventListener('click', () => {
      deleteEntry(entry.id);
    });
    actions.appendChild(deleteBtn);
    
    actionsCell.appendChild(actions);
    row.appendChild(actionsCell);
    
    tableBody.appendChild(row);
  });
}

/**
 * Видалити запис
 * @param {string} id - ID запису для видалення
 */
export function deleteEntry(id) {
  // Запитуємо підтвердження
  if (!confirm('Ви впевнені, що хочете видалити цей запис?')) {
    return;
  }
  
  // Знаходимо індекс запису
  const index = databaseData.entries.findIndex(e => e.id === id);
  
  if (index === -1) {
    showNotification('Запис не знайдено', 'error');
    return;
  }
  
  // Видаляємо запис
  databaseData.entries.splice(index, 1);
  
  // Оновлюємо карти відповідності
  updateMappings();
  
  // Зберігаємо базу даних
  saveDatabaseToLocalStorage();
  
  // Оновлюємо таблицю
  renderDatabaseTable();
  
  // Оновлюємо статус бази даних на вкладці "Парсер"
  updateDbStatusDisplay();
  
  showNotification('Запис видалено', 'success');
}
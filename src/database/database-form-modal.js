/**
 * Модуль для роботи з модальною формою бази даних
 */
import { showNotification } from '../core/notification.js';
import { 
  databaseData, 
  getNextId, 
  updateMappings, 
  saveDatabaseToLocalStorage, 
  updateDbStatusDisplay 
} from './database-core.js';
import { renderDatabaseTable } from './database-table.js';

// ID запису, що редагується
let editingId = null;

/**
 * Ініціалізувати модальну форму бази даних
 */
export function initDatabaseFormModal() {
  const modal = document.getElementById('databaseFormModal');
  const dbForm = document.getElementById('databaseForm');
  const closeBtn = document.getElementById('closeDbFormModal');
  const clearBtn = document.getElementById('dbFormClearBtn');
  const addBtn = document.getElementById('dbAddBtn');
  
  // Додаємо новий запис - відкриваємо модальне вікно
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      clearForm();
      editingId = null;
      
      // Генеруємо новий ID
      const newId = getNextId();
      document.getElementById('dbFormId').value = newId;
      
      // Показуємо модальне вікно
      showModal();
    });
  }
  
  // Закриваємо модальне вікно при кліку на хрестик
  if (closeBtn) {
    closeBtn.addEventListener('click', hideModal);
  }
  
  // Закриваємо модальне вікно при кліку поза ним
  window.addEventListener('click', (e) => {
    if (e.target === modal) {
      hideModal();
    }
  });
  
  // Обробник відправки форми
  if (dbForm) {
    dbForm.addEventListener('submit', (e) => {
      e.preventDefault();
      saveFormData();
      hideModal();
    });
  }
  
  // Обробник очищення форми
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      clearForm();
      if (editingId === null) {
        // Якщо це новий запис, встановлюємо новий ID
        document.getElementById('dbFormId').value = getNextId();
      }
    });
  }
  
  // Додаємо обробник клавіш для закриття модального вікна
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.style.display === 'block') {
      hideModal();
    }
  });
}

/**
 * Показати модальне вікно
 */
function showModal() {
  const modal = document.getElementById('databaseFormModal');
  modal.style.display = 'block';
  
  // Фокус на першому полі введення
  setTimeout(() => {
    document.getElementById('dbFormSurname').focus();
  }, 100);
  
  // Блокуємо прокрутку основного контенту
  document.body.style.overflow = 'hidden';
}

/**
 * Сховати модальне вікно
 */
function hideModal() {
  const modal = document.getElementById('databaseFormModal');
  modal.style.display = 'none';
  
  // Розблоковуємо прокрутку основного контенту
  document.body.style.overflow = '';
}

/**
 * Очистити форму
 */
export function clearForm() {
  document.getElementById('dbFormId').value = '';
  document.getElementById('dbFormSurname').value = '';
  document.getElementById('dbFormFirstname').value = '';
  document.getElementById('dbFormNickname1').value = '';
  document.getElementById('dbFormNickname2').value = '';
}

/**
 * Зберегти дані форми
 */
function saveFormData() {
  // Отримуємо дані з форми
  const id = document.getElementById('dbFormId').value.trim();
  const surname = document.getElementById('dbFormSurname').value.trim();
  const firstname = document.getElementById('dbFormFirstname').value.trim();
  const nickname1 = document.getElementById('dbFormNickname1').value.trim();
  const nickname2 = document.getElementById('dbFormNickname2').value.trim();
  
  // Перевіряємо обов'язкові поля
  if (!surname || !firstname) {
    showNotification('Прізвище та ім\'я обов\'язкові', 'warning');
    return;
  }
  
  // Формуємо масив нікнеймів (без пустих значень)
  const nicknames = [];
  if (nickname1) nicknames.push(nickname1);
  if (nickname2) nicknames.push(nickname2);
  
  // Перевіряємо, чи редагуємо існуючий запис
  const isEditing = !!editingId;
  
  if (isEditing) {
    // Оновлюємо існуючий запис
    const index = databaseData.entries.findIndex(entry => entry.id === editingId);
    
    if (index !== -1) {
      databaseData.entries[index] = {
        id: editingId,
        surname,
        firstname,
        nicknames
      };
      
      showNotification('Запис оновлено', 'success');
    } else {
      showNotification('Запис не знайдено', 'error');
    }
  } else {
    // Додаємо новий запис
    databaseData.entries.push({
      id,
      surname,
      firstname,
      nicknames
    });
    
    showNotification('Запис додано', 'success');
  }
  
  // Оновлюємо карти відповідності
  updateMappings();
  
  // Зберігаємо базу даних
  saveDatabaseToLocalStorage();
  
  // Оновлюємо таблицю
  renderDatabaseTable();
  
  // Оновлюємо статус бази даних на вкладці "Парсер"
  updateDbStatusDisplay();
  
  // Очищаємо форму
  clearForm();
  editingId = null;
}

/**
 * Редагувати запис
 * @param {string} id - ID запису для редагування
 */
export function editEntry(id) {
  // Знаходимо запис
  const entry = databaseData.entries.find(e => e.id === id);
  
  if (!entry) {
    showNotification('Запис не знайдено', 'error');
    return;
  }
  
  // Заповнюємо форму
  document.getElementById('dbFormId').value = entry.id;
  document.getElementById('dbFormSurname').value = entry.surname;
  document.getElementById('dbFormFirstname').value = entry.firstname;
  document.getElementById('dbFormNickname1').value = entry.nicknames && entry.nicknames.length > 0 ? entry.nicknames[0] : '';
  document.getElementById('dbFormNickname2').value = entry.nicknames && entry.nicknames.length > 1 ? entry.nicknames[1] : '';
  
  // Встановлюємо режим редагування
  editingId = id;
  
  // Показуємо модальне вікно
  showModal();
}

/**
 * Отримати поточний ID для редагування
 * @returns {string|null} ID для редагування
 */
export function getEditingId() {
  return editingId;
}
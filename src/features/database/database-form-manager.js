/**
 * Модуль для управління формами роботи з базою даних
 * Об'єднує логіку звичайних форм і модальних вікон
 */
import { showNotification } from '../../core/notification.js';
import { 
  getNextId, 
  updateMappings, 
  saveDatabase, 
  getEntryById,
  addEntry,
  updateEntry,
  deleteEntry,
  updateDbStatusDisplay
} from './database-service.js';
import { renderDatabaseTable } from './database-table.js';

// Зберігаємо ID запису, що редагується
let editingId = null;

// Налаштування режиму відображення форми
let displayMode = 'modal'; // 'modal' або 'inline'

/**
 * Встановити режим відображення форми
 * @param {string} mode - Режим відображення ('modal' або 'inline')
 */
export function setDisplayMode(mode) {
  if (mode === 'modal' || mode === 'inline') {
    displayMode = mode;
  }
}

/**
 * Ініціалізувати форму бази даних
 */
export function initDatabaseForm() {
  const dbForm = document.getElementById('databaseForm');
  const modal = document.getElementById('databaseFormModal');
  const closeBtn = document.getElementById('closeDbFormModal');
  const clearBtn = document.getElementById('dbFormClearBtn');
  const addBtn = document.getElementById('dbAddBtn');
  
  // Обробник для кнопки додавання
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      clearForm();
      editingId = null;
      
      // Генеруємо новий ID
      const newId = getNextId();
      const idField = document.getElementById('dbFormId');
      if (idField) {
        idField.value = newId;
      }
      
      // Показуємо форму
      if (displayMode === 'modal') {
        showModal();
      } else {
        showInlineForm();
      }
    });
  } else {
    console.error('Кнопка додавання не знайдена');
  }
  
  // Обробник для закриття модального вікна
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      if (displayMode === 'modal') {
        hideModal();
      } else {
        hideInlineForm();
      }
    });
  } else {
    console.error('Кнопка закриття не знайдена');
  }
  
  // Закриття модального вікна при кліку поза ним
  if (modal) {
    window.addEventListener('click', (e) => {
      if (e.target === modal) {
        hideModal();
      }
    });
  }
  
  // Обробник для відправки форми
  if (dbForm) {
    dbForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const result = saveFormData();
      
      if (result) {
        if (displayMode === 'modal') {
          hideModal();
        } else {
          hideInlineForm();
        }
      }
    });
  } else {
    console.error('Форма бази даних не знайдена');
  }
  
  // Обробник для очищення форми
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      clearForm();
      if (editingId === null) {
        // Якщо це новий запис, встановлюємо новий ID
        const idField = document.getElementById('dbFormId');
        if (idField) {
          idField.value = getNextId();
        }
      }
    });
  }
  
  // Обробник клавіш для закриття модального вікна
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && displayMode === 'modal') {
      const modalElement = document.getElementById('databaseFormModal');
      if (modalElement && modalElement.style.display === 'block') {
        hideModal();
      }
    }
  });
}

/**
 * Показати модальне вікно
 */
export function showModal() {
  const modal = document.getElementById('databaseFormModal');
  if (!modal) {
    console.error('Модальне вікно не знайдено');
    return;
  }
  
  modal.style.display = 'block';
  
  // Фокус на першому полі введення
  setTimeout(() => {
    const surnameField = document.getElementById('dbFormSurname');
    if (surnameField) {
      surnameField.focus();
    } else {
      console.error('Поле прізвища не знайдено');
    }
  }, 100);
  
  // Блокуємо прокрутку основного контенту
  document.body.style.overflow = 'hidden';
}

/**
 * Сховати модальне вікно
 */
export function hideModal() {
  const modal = document.getElementById('databaseFormModal');
  if (!modal) {
    console.error('Модальне вікно не знайдено');
    return;
  }
  
  modal.style.display = 'none';
  
  // Розблоковуємо прокрутку основного контенту
  document.body.style.overflow = '';
}

/**
 * Показати вбудовану форму
 */
export function showInlineForm() {
  const formContainer = document.getElementById('databaseFormContainer');
  if (!formContainer) {
    console.error('Контейнер форми не знайдено');
    return;
  }
  
  formContainer.style.display = 'block';
  
  // Фокус на першому полі введення
  setTimeout(() => {
    const surnameField = document.getElementById('dbFormSurname');
    if (surnameField) {
      surnameField.focus();
    }
  }, 100);
}

/**
 * Сховати вбудовану форму
 */
export function hideInlineForm() {
  const formContainer = document.getElementById('databaseFormContainer');
  if (!formContainer) return;
  
  formContainer.style.display = 'none';
}

/**
 * Очистити форму
 */
export function clearForm() {
  const fields = [
    'dbFormId',
    'dbFormSurname',
    'dbFormFirstname',
    'dbFormNickname1',
    'dbFormNickname2'
  ];
  
  fields.forEach(fieldId => {
    const field = document.getElementById(fieldId);
    if (field) {
      field.value = '';
    }
  });
}

/**
 * Зберегти дані форми
 * @returns {boolean} Результат операції
 */
export function saveFormData() {
  // Отримуємо дані з форми
  const idField = document.getElementById('dbFormId');
  const surnameField = document.getElementById('dbFormSurname');
  const firstnameField = document.getElementById('dbFormFirstname');
  const nickname1Field = document.getElementById('dbFormNickname1');
  const nickname2Field = document.getElementById('dbFormNickname2');
  
  // Перевіряємо наявність полів
  if (!idField || !surnameField || !firstnameField || !nickname1Field || !nickname2Field) {
    showNotification('Помилка: не всі поля форми знайдено', 'error');
    console.error('Не всі поля форми знайдено');
    return false;
  }
  
  const id = idField.value.trim();
  const surname = surnameField.value.trim();
  const firstname = firstnameField.value.trim();
  const nickname1 = nickname1Field.value.trim();
  const nickname2 = nickname2Field.value.trim();
  
  // Перевіряємо обов'язкові поля
  if (!surname || !firstname) {
    showNotification('Прізвище та ім\'я обов\'язкові', 'warning');
    return false;
  }
  
  // Формуємо масив нікнеймів (без пустих значень)
  const nicknames = [];
  if (nickname1) nicknames.push(nickname1);
  if (nickname2) nicknames.push(nickname2);
  
  // Створюємо запис для збереження
  const entry = {
    id: editingId || id,
    surname,
    firstname,
    nicknames
  };
  
  // Перевіряємо, чи редагуємо існуючий запис
  const isEditing = !!editingId;
  
  let result = false;
  if (isEditing) {
    // Оновлюємо існуючий запис
    result = updateDatabaseEntry(entry);
    if (result) {
      showNotification('Запис оновлено', 'success');
    }
  } else {
    // Додаємо новий запис
    result = addDatabaseEntry(entry);
    if (result) {
      showNotification('Запис додано', 'success');
    }
  }
  
  // Очищаємо форму тільки якщо операція була успішною
  if (result) {
    clearForm();
    editingId = null;
  }
  
  return result;
}

/**
 * Додати новий запис до бази даних
 * @param {Object} entry - Запис для додавання
 * @returns {boolean} Успішність операції
 */
export function addDatabaseEntry(entry) {
  if (!entry || !entry.surname || !entry.firstname) {
    showNotification('Неповний запис', 'error');
    return false;
  }
  
  // Додаємо запис до бази
  const result = addEntry(entry);
  
  if (result) {
    // Оновлюємо відображення
    updateDatabaseUI();
  } else {
    showNotification('Помилка додавання запису', 'error');
  }
  
  return result;
}

/**
 * Оновити існуючий запис у базі даних
 * @param {Object} entry - Запис для оновлення
 * @returns {boolean} Успішність операції
 */
export function updateDatabaseEntry(entry) {
  if (!entry || !entry.id) {
    showNotification('Відсутній ID запису', 'error');
    return false;
  }
  
  // Оновлюємо запис
  const result = updateEntry(entry);
  
  if (result) {
    // Оновлюємо відображення
    updateDatabaseUI();
  } else {
    showNotification('Запис не знайдено', 'error');
  }
  
  return result;
}

/**
 * Видалити запис з бази даних
 * @param {string} id - ID запису для видалення
 * @returns {boolean} Успішність операції
 */
export function deleteDatabaseEntry(id) {
  if (!id) {
    showNotification('Відсутній ID запису', 'error');
    return false;
  }
  
  // Видаляємо запис
  const result = deleteEntry(id);
  
  if (result) {
    // Оновлюємо відображення
    updateDatabaseUI();
    showNotification('Запис видалено', 'success');
  } else {
    showNotification('Запис не знайдено', 'error');
  }
  
  return result;
}

/**
 * Редагувати запис
 * @param {string} id - ID запису для редагування
 */
export function editDatabaseEntry(id) {
  // Знаходимо запис
  const entry = getEntryById(id);
  
  if (!entry) {
    showNotification('Запис не знайдено', 'error');
    return;
  }
  
  // Заповнюємо форму
  const idField = document.getElementById('dbFormId');
  const surnameField = document.getElementById('dbFormSurname');
  const firstnameField = document.getElementById('dbFormFirstname');
  const nickname1Field = document.getElementById('dbFormNickname1');
  const nickname2Field = document.getElementById('dbFormNickname2');
  
  // Перевіряємо наявність полів
  if (!idField || !surnameField || !firstnameField || !nickname1Field || !nickname2Field) {
    showNotification('Помилка: не всі поля форми знайдено', 'error');
    console.error('Не всі поля форми знайдено');
    return;
  }
  
  idField.value = entry.id;
  surnameField.value = entry.surname;
  firstnameField.value = entry.firstname;
  nickname1Field.value = entry.nicknames && entry.nicknames.length > 0 ? entry.nicknames[0] : '';
  nickname2Field.value = entry.nicknames && entry.nicknames.length > 1 ? entry.nicknames[1] : '';
  
  // Встановлюємо режим редагування
  editingId = id;
  
  // Показуємо форму
  if (displayMode === 'modal') {
    showModal();
  } else {
    showInlineForm();
    // Прокручуємо до форми
    const formContainer = document.querySelector('.database-form-container');
    if (formContainer) {
      formContainer.scrollIntoView({ behavior: 'smooth' });
    }
  }
}

/**
 * Оновити відображення бази даних
 */
export function updateDatabaseUI() {
  // Оновлюємо таблицю
  renderDatabaseTable();
  
  // Оновлюємо статус бази даних на вкладці "Парсер"
  updateDbStatusDisplay();
}

/**
 * Отримати ID запису, що редагується
 * @returns {string|null} ID для редагування
 */
export function getEditingId() {
  return editingId;
}

/**
 * Встановити ID запису для редагування
 * @param {string} id - ID для редагування
 */
export function setEditingId(id) {
  editingId = id;
}
/**
 * Модуль для роботи з ядром бази даних
 */
import { showNotification } from '../core/notification.js';

// Структура бази даних
// {
//   "version": "3.0",
//   "entries": [
//     {
//       "id": "1",
//       "surname": "Іванов",
//       "firstname": "Іван",
//       "nicknames": ["ivan", "ivanoff"]
//     },
//     ...
//   ]
// }

// Зберігання даних
export let databaseData = {
  version: "3.0",
  entries: []
};

// Зберігаємо відповідність між "Прізвище Ім'я" та ID
export let nameToIdMap = {};

// Зберігаємо відповідність нікнеймів до ID
export let nicknameToIdMap = {};

/**
 * Завантажити базу даних з localStorage
 */
export function loadDatabaseFromLocalStorage() {
  try {
    const savedDb = localStorage.getItem('databaseData');
    if (savedDb) {
      databaseData = JSON.parse(savedDb);
      
      // Перевіряємо структуру
      if (!databaseData.version || !databaseData.entries) {
        // Несумісний формат, створюємо новий
        databaseData = {
          version: "3.0",
          entries: []
        };
      }
      
      // Оновлюємо карти відповідності
      updateMappings();
      
      showNotification('База даних завантажена з локального сховища', 'success');
    }
  } catch (error) {
    console.error('Помилка завантаження бази даних:', error);
    showNotification('Помилка завантаження бази даних', 'error');
    
    // Створюємо нову базу
    databaseData = {
      version: "3.0",
      entries: []
    };
  }
}

/**
 * Зберегти базу даних у localStorage
 */
export function saveDatabaseToLocalStorage() {
  try {
    localStorage.setItem('databaseData', JSON.stringify(databaseData));
  } catch (error) {
    console.error('Помилка збереження бази даних:', error);
    showNotification('Помилка збереження бази даних', 'error');
  }
}

/**
 * Оновити карти відповідності
 */
export function updateMappings() {
  nameToIdMap = {};
  nicknameToIdMap = {};
  
  databaseData.entries.forEach(entry => {
    const fullName = `${entry.surname} ${entry.firstname}`;
    nameToIdMap[fullName] = entry.id;
    
    // Додаємо нікнейми до карти
    if (entry.nicknames && Array.isArray(entry.nicknames)) {
      entry.nicknames.forEach(nickname => {
        if (nickname) {
          nicknameToIdMap[nickname.toLowerCase()] = entry.id;
        }
      });
    }
  });
}

/**
 * Оновити відображення статусу бази даних на вкладці "Парсер"
 */
export function updateDbStatusDisplay() {
  const dbStatus = document.getElementById('dbStatus');
  if (!dbStatus) return;
  
  const entriesCount = databaseData.entries.length;
  
  if (entriesCount > 0) {
    dbStatus.textContent = `База завантажена: ${entriesCount} записів`;
    dbStatus.classList.add('loaded');
  } else {
    dbStatus.textContent = 'База не завантажена';
    dbStatus.classList.remove('loaded');
  }
}

/**
 * Отримати наступний доступний ID
 * @returns {string} Наступний ID
 */
export function getNextId() {
  if (databaseData.entries.length === 0) {
    return "1";
  }
  
  // Знаходимо максимальний ID
  const maxId = Math.max(...databaseData.entries.map(entry => parseInt(entry.id, 10) || 0));
  return (maxId + 1).toString();
}
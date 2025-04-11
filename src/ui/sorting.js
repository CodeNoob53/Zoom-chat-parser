// src/ui/sorting.js
import { elements } from '../core/dom.js';
import { triggerRerender } from './render-utils.js';

// Зберігаємо поточний стан сортування
let currentSortColumn = 'id';
let currentSortDirection = 'asc';
// Додаємо стан сортування для бази даних
let currentDbSortColumn = 'id';
let currentDbSortDirection = 'asc';

/**
 * Сортування учасників за вказаним стовпцем
 * @param {Array} participants - Масив учасників
 * @param {string} column - Стовпець для сортування ('id', 'surname', 'firstname', 'nickname')
 * @param {string} direction - Напрямок сортування ('asc', 'desc')
 * @returns {Array} Відсортований масив
 */
export function sortParticipants(participants, column, direction) {
  // Логіка сортування учасників залишається без змін
  const sorted = [...participants];
  
  // Сортування за знаходженням у базі (знайдені першими)
  sorted.sort((a, b) => {
    // Спочатку за наявністю в базі
    if (a.foundInDb && !b.foundInDb) return -1;
    if (!a.foundInDb && b.foundInDb) return 1;
    
    // Потім по заданому стовпцю
    let compareResult = 0;
    
    if (column === 'id') {
      // Для ID конвертуємо в числа, якщо це можливо
      const idA = parseInt(a.id, 10);
      const idB = parseInt(b.id, 10);
      
      if (!isNaN(idA) && !isNaN(idB)) {
        compareResult = idA - idB;
      } else {
        // Якщо хоча б один ID не є числом, порівнюємо як рядки
        compareResult = a.id.localeCompare(b.id, "uk");
      }
    } else if (column === 'surname') {
      compareResult = a.surname.localeCompare(b.surname, "uk");
    } else if (column === 'firstname') {
      compareResult = a.firstname.localeCompare(b.firstname, "uk");
    } else if (column === 'nickname') {
      compareResult = a.nickname.localeCompare(b.nickname, "uk");
    }
    
    // Застосовуємо напрямок сортування
    return direction === 'asc' ? compareResult : -compareResult;
  });
  
  return sorted;
}

/**
 * Сортування записів бази даних за вказаним стовпцем
 * @param {Array} dbEntries - Масив записів бази даних
 * @param {string} column - Стовпець для сортування ('id', 'surname', 'firstname', 'nicknames')
 * @param {string} direction - Напрямок сортування ('asc', 'desc')
 * @returns {Array} Відсортований масив
 */
export function sortDatabaseEntries(dbEntries, column, direction) {
  const sorted = [...dbEntries];
  
  sorted.sort((a, b) => {
    let compareResult = 0;
    
    if (column === 'id') {
      // Для ID конвертуємо в числа, якщо це можливо
      const idA = parseInt(a.id, 10);
      const idB = parseInt(b.id, 10);
      
      if (!isNaN(idA) && !isNaN(idB)) {
        compareResult = idA - idB;
      } else {
        // Якщо хоча б один ID не є числом, порівнюємо як рядки
        compareResult = a.id.localeCompare(b.id, "uk");
      }
    } else if (column === 'surname') {
      compareResult = a.surname.localeCompare(b.surname, "uk");
    } else if (column === 'firstname') {
      compareResult = a.firstname.localeCompare(b.firstname, "uk");
    } else if (column === 'nicknames') {
      // Сортування за нікнеймами - беремо перший нікнейм, якщо є
      const nicknameA = a.nicknames && a.nicknames.length > 0 ? a.nicknames[0] : "";
      const nicknameB = b.nicknames && b.nicknames.length > 0 ? b.nicknames[0] : "";
      compareResult = nicknameA.localeCompare(nicknameB, "uk");
    }
    
    // Застосовуємо напрямок сортування
    return direction === 'asc' ? compareResult : -compareResult;
  });
  
  return sorted;
}

/**
 * Ініціалізація слухачів подій для сортування
 */
export function initSortListeners() {
  const { 
    sortById, sortBySurname, sortByFirstname, sortByNickname,
    sortDbById, sortDbBySurname, sortDbByFirstname, sortDbByNicknames 
  } = elements;
  
  // Функція обробник кліків по заголовкам стовпців таблиці учасників
  function handleSortClick(column) {
    return function() {
      // Визначаємо напрямок сортування
      if (currentSortColumn === column) {
        // Якщо натискаємо на той самий стовпець, міняємо напрямок
        currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        // Якщо на інший стовпець, починаємо з зростання
        currentSortColumn = column;
        currentSortDirection = 'asc';
      }
      
      // Оновлюємо класи заголовків
      [sortById, sortBySurname, sortByFirstname, sortByNickname].forEach(th => {
        if (th) th.classList.remove('sorted', 'asc', 'desc');
      });
      
      // Додаємо клас для поточного стовпця
      const currentTh = column === 'id' ? sortById : 
                       column === 'surname' ? sortBySurname :
                       column === 'firstname' ? sortByFirstname : sortByNickname;
      
      if (currentTh) {
        currentTh.classList.add('sorted');
        currentTh.classList.add(currentSortDirection);
      }
      
      // Повторно рендеримо з новим сортуванням
      triggerRerender();
    };
  }
  
  // Функція обробник кліків по заголовкам стовпців таблиці бази даних
  function handleDbSortClick(column) {
    return function() {
      // Визначаємо напрямок сортування
      if (currentDbSortColumn === column) {
        // Якщо натискаємо на той самий стовпець, міняємо напрямок
        currentDbSortDirection = currentDbSortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        // Якщо на інший стовпець, починаємо з зростання
        currentDbSortColumn = column;
        currentDbSortDirection = 'asc';
      }
      
      // Оновлюємо класи заголовків
      [sortDbById, sortDbBySurname, sortDbByFirstname, sortDbByNicknames].forEach(th => {
        if (th) th.classList.remove('sorted', 'asc', 'desc');
      });
      
      // Додаємо клас для поточного стовпця
      const currentTh = column === 'id' ? sortDbById : 
                       column === 'surname' ? sortDbBySurname :
                       column === 'firstname' ? sortDbByFirstname : sortDbByNicknames;
      
      if (currentTh) {
        currentTh.classList.add('sorted');
        currentTh.classList.add(currentDbSortDirection);
      }
      
      // Перерендеримо таблицю бази даних
      import('../database/database-table.js').then(module => {
        module.renderDatabaseTable();
      });
    };
  }
  
  // Додаємо слухачі до заголовків таблиці учасників
  if (sortById) sortById.addEventListener('click', handleSortClick('id'));
  if (sortBySurname) sortBySurname.addEventListener('click', handleSortClick('surname'));
  if (sortByFirstname) sortByFirstname.addEventListener('click', handleSortClick('firstname'));
  if (sortByNickname) sortByNickname.addEventListener('click', handleSortClick('nickname'));
  
  // Додаємо слухачі до заголовків таблиці бази даних
  if (sortDbById) sortDbById.addEventListener('click', handleDbSortClick('id'));
  if (sortDbBySurname) sortDbBySurname.addEventListener('click', handleDbSortClick('surname'));
  if (sortDbByFirstname) sortDbByFirstname.addEventListener('click', handleDbSortClick('firstname'));
  if (sortDbByNicknames) sortDbByNicknames.addEventListener('click', handleDbSortClick('nicknames'));
}

/**
 * Отримати поточний стан сортування таблиці учасників
 * @returns {Object} Поточний стан сортування {column, direction}
 */
export function getCurrentSortState() {
  return {
    column: currentSortColumn,
    direction: currentSortDirection
  };
}

/**
 * Отримати поточний стан сортування таблиці бази даних
 * @returns {Object} Поточний стан сортування {column, direction}
 */
export function getCurrentDbSortState() {
  return {
    column: currentDbSortColumn,
    direction: currentDbSortDirection
  };
}
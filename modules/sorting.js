import { elements } from './dom.js';
import { triggerRerender } from './render-utils.js';

// Зберігаємо поточний стан сортування
let currentSortColumn = 'id';
let currentSortDirection = 'asc';

/**
 * Сортування учасників за вказаним стовпцем
 * @param {Array} participants - Масив учасників
 * @param {string} column - Стовпець для сортування ('id', 'surname', 'firstname', 'nickname')
 * @param {string} direction - Напрямок сортування ('asc', 'desc')
 * @returns {Array} Відсортований масив
 */
export function sortParticipants(participants, column, direction) {
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
 * Ініціалізація слухачів подій для сортування
 */
export function initSortListeners() {
  const { sortById, sortBySurname, sortByFirstname, sortByNickname } = elements;
  
  // Функція обробник кліків по заголовкам стовпців
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
        th.classList.remove('sorted', 'asc', 'desc');
      });
      
      // Додаємо клас для поточного стовпця
      const currentTh = column === 'id' ? sortById : 
                       column === 'surname' ? sortBySurname :
                       column === 'firstname' ? sortByFirstname : sortByNickname;
      
      currentTh.classList.add('sorted');
      if (currentSortDirection === 'asc') {
        currentTh.classList.add('asc');
      } else {
        currentTh.classList.add('desc');
      }
      
      // Повторно рендеримо з новим сортуванням
      triggerRerender();
    };
  }
  
  // Додаємо слухачі до заголовків
  sortById.addEventListener('click', handleSortClick('id'));
  sortBySurname.addEventListener('click', handleSortClick('surname'));
  sortByFirstname.addEventListener('click', handleSortClick('firstname'));
  sortByNickname.addEventListener('click', handleSortClick('nickname'));
}

/**
 * Отримати поточний стан сортування
 * @returns {Object} Поточний стан сортування {column, direction}
 */
export function getCurrentSortState() {
  return {
    column: currentSortColumn,
    direction: currentSortDirection
  };
}
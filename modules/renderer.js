import { elements } from './dom.js';
import { getParticipantInfo } from './name-database.js';

// Зберігаємо поточний стан сортування
let currentSortColumn = 'id';
let currentSortDirection = 'asc';

/**
 * Відображення списку учасників у таблиці з покращеним інтерфейсом
 * @param {string[]} list - Масив імен для відображення
 * @param {Object} realNameMap - Карта відповідності Zoom-імені до реального імені
 * @param {boolean} useDbChk - Чи використовувати базу імен
 * @param {Object} matchedNames - Результати порівняння з базою імен
 */
export function renderNames(list, realNameMap, useDbChk, matchedNames) {
  const { participantsList, countNamesSpan, sortById } = elements;
  
  // Збираємо повну інформацію про учасників
  const participants = list.map(name => getParticipantInfo(name, realNameMap));
  
  // Сортуємо учасників
  const sortedParticipants = sortParticipants(participants, currentSortColumn, currentSortDirection);
  
  // Очищаємо таблицю
  participantsList.innerHTML = "";
  countNamesSpan.textContent = sortedParticipants.length;
  
  // Відображаємо учасників
  sortedParticipants.forEach(participant => {
    const row = document.createElement("tr");
    row.className = participant.foundInDb ? "found" : "not-found";
    
    // Додаємо класи залежно від типу співпадіння
    if (participant.matchType) {
      const matchTypes = participant.matchType.split(" ");
      matchTypes.forEach(type => {
        if (type) row.classList.add(type);
      });
    }
    
    // ID
    const idCell = document.createElement("td");
    idCell.className = "id-cell";
    idCell.textContent = participant.id;
    row.appendChild(idCell);
    
    // Прізвище
    const surnameCell = document.createElement("td");
    surnameCell.className = "surname-cell";
    surnameCell.textContent = participant.surname || "-";
    row.appendChild(surnameCell);
    
    // Ім'я
    const firstnameCell = document.createElement("td");
    firstnameCell.className = "firstname-cell";
    firstnameCell.textContent = participant.firstname || "-";
    row.appendChild(firstnameCell);
    
    // Zoom nickname
    const nicknameCell = document.createElement("td");
    nicknameCell.className = "zoom-nickname-cell";
    
    // Створюємо контейнер для основного ім'я
    const nicknameContainer = document.createElement("div");
    nicknameContainer.className = "nickname-container";
    nicknameContainer.textContent = participant.nickname;
    
    // Якщо є реальне ім'я з тегу rnm, показуємо його в дужках
    if (realNameMap[participant.nickname]) {
      const realNameSpan = document.createElement("span");
      realNameSpan.className = "real-name";
      realNameSpan.textContent = ` (${realNameMap[participant.nickname]})`;
      nicknameContainer.appendChild(realNameSpan);
    }
    
    nicknameCell.appendChild(nicknameContainer);
    
    // Додаємо альтернативні співпадіння, якщо є
    if (participant.alternativeMatches && participant.alternativeMatches.length > 0) {
      const altMatchesContainer = document.createElement("div");
      altMatchesContainer.className = "alt-matches";
      
      participant.alternativeMatches.forEach(altMatch => {
        const altMatchItem = document.createElement("div");
        altMatchItem.className = "alt-match-item";
        altMatchItem.innerHTML = `<span class="match-quality quality-${Math.floor(altMatch.quality/10)}">${altMatch.quality}%</span> ${altMatch.dbName}`;
        
        // Додаємо обробник кліку для вибору цього співпадіння
        altMatchItem.addEventListener('click', (event) => {
          event.stopPropagation();
          // Тут можна реалізувати логіку вибору альтернативного співпадіння
          // наприклад, оновити дані в matchedNames
        });
        
        altMatchesContainer.appendChild(altMatchItem);
      });
      
      nicknameCell.appendChild(altMatchesContainer);
    }
    
    // Додаємо додаткові індикатори для типів співпадіння
    if (participant.matchType.includes("translit") || 
        participant.matchType.includes("transliterated")) {
      nicknameCell.classList.add("match-by-translit");
      const translitIndicator = document.createElement("span");
      translitIndicator.className = "match-indicator translit-indicator";
      translitIndicator.title = "Знайдено через транслітерацію";
      translitIndicator.textContent = " ᴛ";
      nicknameContainer.appendChild(translitIndicator);
    }
    
    if (participant.matchType.includes("reversed") || 
        participant.matchType.includes("reverse")) {
      nicknameCell.classList.add("reversed-match");
      const reversedIndicator = document.createElement("span");
      reversedIndicator.className = "match-indicator reversed-indicator";
      reversedIndicator.title = "Знайдено в базі у зворотному порядку (Ім'я Прізвище)";
      reversedIndicator.textContent = " ↔";
      nicknameContainer.appendChild(reversedIndicator);
    }
    
    if (participant.matchType.includes("variant") || 
        participant.matchType.includes("name-variant")) {
      nicknameCell.classList.add("variant-match");
      const variantIndicator = document.createElement("span");
      variantIndicator.className = "match-indicator variant-indicator";
      variantIndicator.title = "Знайдено зменшувальну форму імені";
      variantIndicator.textContent = " ᴠ";
      nicknameContainer.appendChild(variantIndicator);
    }
    
    row.appendChild(nicknameCell);
    
    // Додаємо інтерактивність рядка, якщо є альтернативні співпадіння
    if (participant.alternativeMatches && participant.alternativeMatches.length > 0) {
      row.classList.add("has-alternatives");
      // Відображення/приховування альтернативних співпадінь при кліку
      row.addEventListener('click', () => {
        const isExpanded = row.classList.contains("expanded");
        if (isExpanded) {
          row.classList.remove("expanded");
        } else {
          // Знімаємо expanded з усіх інших рядків
          document.querySelectorAll('.expanded').forEach(el => {
            el.classList.remove("expanded");
          });
          row.classList.add("expanded");
        }
      });
    }
    
    participantsList.appendChild(row);
  });
  
  // По дефолту сортуємо за ID (якщо це перший рендер)
  if (!document.querySelector('.sorted')) {
    sortById.classList.add('sorted');
  }
}

/**
 * Сортування учасників за вказаним стовпцем
 * @param {Array} participants - Масив учасників
 * @param {string} column - Стовпець для сортування ('id', 'surname', 'firstname', 'nickname')
 * @param {string} direction - Напрямок сортування ('asc', 'desc')
 * @returns {Array} Відсортований масив
 */
function sortParticipants(participants, column, direction) {
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

// Функція, яка буде встановлена ззовні для виклику ререндерингу
let rerenderCallback = null;

/**
 * Встановлює функцію для ререндерингу
 * @param {Function} callback - Функція, яка викликатиме ререндеринг
 */
export function setRerenderCallback(callback) {
  rerenderCallback = callback;
}

/**
 * Викликає ререндеринг списку учасників
 */
function triggerRerender() {
  if (rerenderCallback) {
    rerenderCallback();
  }
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
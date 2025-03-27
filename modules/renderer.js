import { elements } from './dom.js';
import { 
  getParticipantInfo, 
  setManualMatch, 
  selectAlternativeMatch, 
  getUnrecognizedNames, 
  getRecommendations,
  getNameDatabase 
} from './name-database.js';
import { showNotification } from './notification.js';

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
  
  // Отримуємо список нерозпізнаних імен
  const unrecognizedNames = useDbChk ? getUnrecognizedNames() : [];
  
  // Отримуємо рекомендації для нерозпізнаних імен
  const recommendations = useDbChk ? getRecommendations() : {};
  
  // Відображаємо учасників
  sortedParticipants.forEach(participant => {
    const row = document.createElement("tr");
    row.className = participant.foundInDb ? "found" : "not-found";
    
    // Додаємо клас, якщо ім'я було знайдено автоматично
    if (participant.autoMatched) {
      row.classList.add("auto-matched");
    }
    
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
    
    // Якщо ім'я не знайдено в базі і увімкнено використання бази, додаємо рекомендації
    if (!participant.foundInDb && useDbChk && 
        unrecognizedNames.includes(participant.nickname) && 
        recommendations[participant.nickname]) {
      
      const recommendationsContainer = document.createElement("div");
      recommendationsContainer.className = "recommendations-container";
      
      // Додаємо заголовок
      const recommendationsTitle = document.createElement("div");
      recommendationsTitle.className = "recommendations-title";
      recommendationsTitle.textContent = "Можливі співпадіння:";
      recommendationsContainer.appendChild(recommendationsTitle);
      
      // Додаємо рекомендації
      recommendations[participant.nickname].forEach((rec, index) => {
        const recommendationItem = document.createElement("div");
        recommendationItem.className = "recommendation-item";
        
        // Відсоток схожості
        const similaritySpan = document.createElement("span");
        similaritySpan.className = "similarity";
        similaritySpan.textContent = `${Math.round(rec.similarity * 100)}%`;
        recommendationItem.appendChild(similaritySpan);
        
        // Ім'я з бази
        const dbNameSpan = document.createElement("span");
        dbNameSpan.className = "db-name";
        dbNameSpan.textContent = rec.dbName;
        recommendationItem.appendChild(dbNameSpan);
        
        // Кнопка для застосування рекомендації
        const applyButton = document.createElement("button");
        applyButton.className = "apply-recommendation";
        applyButton.textContent = "✓";
        applyButton.title = "Застосувати це співпадіння";
        applyButton.addEventListener("click", (e) => {
          e.stopPropagation();
          setManualMatch(participant.nickname, rec.id);
          triggerRerender();
        });
        recommendationItem.appendChild(applyButton);
        
        recommendationsContainer.appendChild(recommendationItem);
      });
      
      nicknameCell.appendChild(recommendationsContainer);
    }
    
    // Додаємо альтернативні співпадіння, якщо є
    if (participant.alternativeMatches && participant.alternativeMatches.length > 0) {
      const altMatchesContainer = document.createElement("div");
      altMatchesContainer.className = "alt-matches";
      
      participant.alternativeMatches.forEach((altMatch, index) => {
        const altMatchItem = document.createElement("div");
        altMatchItem.className = "alt-match-item";
        altMatchItem.innerHTML = `<span class="match-quality quality-${Math.floor(altMatch.quality/10)}">${altMatch.quality}%</span> ${altMatch.dbName}`;
        
        // Додаємо кнопку для вибору цього співпадіння
        const selectButton = document.createElement("button");
        selectButton.className = "select-alternative";
        selectButton.textContent = "✓";
        selectButton.title = "Вибрати це співпадіння";
        selectButton.addEventListener("click", (e) => {
          e.stopPropagation();
          selectAlternativeMatch(participant.nickname, index);
          triggerRerender();
        });
        altMatchItem.appendChild(selectButton);
        
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
    
    // Додаємо індикатор для автоматичного співпадіння
    if (participant.autoMatched) {
      nicknameCell.classList.add("auto-match");
      const autoIndicator = document.createElement("span");
      autoIndicator.className = "match-indicator auto-indicator";
      autoIndicator.title = "Автоматично знайдене співпадіння";
      autoIndicator.textContent = " ᴀ";
      nicknameContainer.appendChild(autoIndicator);
    }
    
    row.appendChild(nicknameCell);
    
    // Додаємо кнопку для ручного призначення, якщо ім'я не знайдено в базі
    if (!participant.foundInDb && useDbChk) {
      const actionCell = document.createElement("td");
      actionCell.className = "action-cell";
      
      const manualAssignButton = document.createElement("button");
      manualAssignButton.className = "manual-assign-btn";
      manualAssignButton.textContent = "Призначити";
      manualAssignButton.addEventListener("click", () => {
        // Створення і відображення модального вікна для вибору імені з бази
        showAssignmentModal(participant.nickname);
      });
      
      actionCell.appendChild(manualAssignButton);
      row.appendChild(actionCell);
    } else {
      // Додаємо порожню клітинку для вирівнювання таблиці
      const emptyCell = document.createElement("td");
      row.appendChild(emptyCell);
    }
    
    // Додаємо інтерактивність рядка, якщо є альтернативні співпадіння або рекомендації
    if ((participant.alternativeMatches && participant.alternativeMatches.length > 0) ||
        (!participant.foundInDb && recommendations[participant.nickname])) {
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
  
  // Додаємо додатковий стовпець для дій, якщо його ще немає
  addActionsColumnHeader();
}

/**
 * Додає заголовок стовпця для дій, якщо його ще немає
 */
function addActionsColumnHeader() {
  const headerRow = document.querySelector('.participants-table thead tr');
  if (!headerRow) return;
  
  // Перевіряємо, чи є вже стовпець для дій
  if (!document.getElementById('actionsColumn')) {
    const actionsHeader = document.createElement('th');
    actionsHeader.id = 'actionsColumn';
    actionsHeader.className = 'actions-cell';
    actionsHeader.textContent = 'Дії';
    headerRow.appendChild(actionsHeader);
  }
}

/**
 * Показує модальне вікно для ручного призначення імені з бази
 * @param {string} name - Ім'я учасника з чату
 */
function showAssignmentModal(name) {
  // Перевіряємо, чи існує вже модальне вікно
  let modal = document.getElementById('assignmentModal');
  if (!modal) {
    // Створюємо модальне вікно
    modal = document.createElement('div');
    modal.id = 'assignmentModal';
    modal.className = 'modal';
    
    // Створюємо контент модального вікна
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    
    // Заголовок
    const modalHeader = document.createElement('div');
    modalHeader.className = 'modal-header';
    const modalTitle = document.createElement('h3');
    modalTitle.textContent = 'Призначити відповідність';
    const closeButton = document.createElement('span');
    closeButton.className = 'close-modal';
    closeButton.innerHTML = '&times;';
    closeButton.addEventListener('click', () => {
      modal.style.display = 'none';
    });
    modalHeader.appendChild(modalTitle);
    modalHeader.appendChild(closeButton);
    
    // Поле пошуку
    const searchContainer = document.createElement('div');
    searchContainer.className = 'search-container';
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.id = 'searchDbInput';
    searchInput.placeholder = 'Введіть ім\'я для пошуку в базі...';
    searchContainer.appendChild(searchInput);
    
    // Список імен з бази
    const dbList = document.createElement('div');
    dbList.className = 'db-list';
    dbList.id = 'dbNamesList';
    
    // Кнопки
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'modal-buttons';
    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Скасувати';
    cancelButton.className = 'modal-button cancel';
    cancelButton.addEventListener('click', () => {
      modal.style.display = 'none';
    });
    buttonContainer.appendChild(cancelButton);
    
    // Додаємо всі елементи в модальне вікно
    modalContent.appendChild(modalHeader);
    modalContent.appendChild(searchContainer);
    modalContent.appendChild(dbList);
    modalContent.appendChild(buttonContainer);
    modal.appendChild(modalContent);
    
    // Додаємо модальне вікно на сторінку
    document.body.appendChild(modal);
    
    // Додаємо обробник події для поля пошуку
    searchInput.addEventListener('input', () => {
      const searchValue = searchInput.value.toLowerCase();
      updateDbNamesList(searchValue, name);
    });
    
    // Додаємо стилі для модального вікна
    addModalStyles();
  }
  
  // Оновлюємо заголовок
  const modalTitle = modal.querySelector('.modal-header h3');
  modalTitle.textContent = `Призначити відповідність для "${name}"`;
  
  // Очищаємо поле пошуку
  const searchInput = document.getElementById('searchDbInput');
  if (searchInput) {
    searchInput.value = '';
  }
  
  // Оновлюємо список імен з бази
  updateDbNamesList('', name);
  
  // Показуємо модальне вікно
  modal.style.display = 'block';
}

/**
 * Оновлює список імен з бази для модального вікна
 * @param {string} searchValue - Значення для пошуку
 * @param {string} chatName - Ім'я учасника з чату
 */
function updateDbNamesList(searchValue, chatName) {
  const dbList = document.getElementById('dbNamesList');
  if (!dbList) return;
  
  // Очищаємо список
  dbList.innerHTML = '';
  
  // Отримуємо всі імена з бази
  const nameDatabase = getNameDatabase();
  
  // Фільтруємо за пошуковим запитом
  const filteredNames = Object.entries(nameDatabase)
    .filter(([name, id]) => {
      if (!searchValue) return true;
      return name.toLowerCase().includes(searchValue.toLowerCase());
    })
    .sort((a, b) => {
      // Сортуємо за схожістю з пошуковим запитом
      if (!searchValue) return 0;
      
      const similarityA = getSimilarity(a[0].toLowerCase(), searchValue.toLowerCase());
      const similarityB = getSimilarity(b[0].toLowerCase(), searchValue.toLowerCase());
      
      return similarityB - similarityA;
    });
  
  // Додаємо імена в список
  filteredNames.forEach(([name, id]) => {
    const item = document.createElement('div');
    item.className = 'db-list-item';
    
    // Додаємо ID
    const idSpan = document.createElement('span');
    idSpan.className = 'db-item-id';
    idSpan.textContent = id;
    item.appendChild(idSpan);
    
    // Додаємо ім'я
    const nameSpan = document.createElement('span');
    nameSpan.className = 'db-item-name';
    nameSpan.textContent = name;
    item.appendChild(nameSpan);
    
    // Додаємо обробник кліку
    item.addEventListener('click', () => {
      // Встановлюємо відповідність
      setManualMatch(chatName, id);
      // Закриваємо модальне вікно
      const modal = document.getElementById('assignmentModal');
      if (modal) {
        modal.style.display = 'none';
      }
      // Оновлюємо відображення
      triggerRerender();
    });
    
    dbList.appendChild(item);
  });
  
  // Якщо немає результатів, показуємо повідомлення
  if (filteredNames.length === 0) {
    const noResults = document.createElement('div');
    noResults.className = 'no-results';
    noResults.textContent = 'Немає результатів';
    dbList.appendChild(noResults);
  }
}

/**
 * Додає стилі для модального вікна
 */
function addModalStyles() {
  // Перевіряємо, чи існують вже стилі
  if (document.getElementById('modalStyles')) return;
  
  const style = document.createElement('style');
  style.id = 'modalStyles';
  style.textContent = `
    .modal {
      display: none;
      position: fixed;
      z-index: 1000;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(3px);
    }
    
    .modal-content {
      background-color: #3d3d3d;
      margin: 10% auto;
      padding: 20px;
      border: 1px solid #555;
      border-radius: 8px;
      width: 80%;
      max-width: 600px;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
      max-height: 80vh;
      display: flex;
      flex-direction: column;
    }
    
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
      border-bottom: 1px solid #555;
      padding-bottom: 10px;
    }
    
    .modal-header h3 {
      margin: 0;
      color: #fff;
    }
    
    .close-modal {
      color: #aaa;
      font-size: 28px;
      font-weight: bold;
      cursor: pointer;
    }
    
    .close-modal:hover {
      color: #fff;
    }
    
    .search-container {
      margin-bottom: 15px;
    }
    
    #searchDbInput {
      width: 100%;
      padding: 8px;
      border: 1px solid #555;
      border-radius: 4px;
      background-color: #252525;
      color: #fff;
      font-size: 14px;
    }
    
    .db-list {
      flex: 1;
      overflow-y: auto;
      margin-bottom: 15px;
      border: 1px solid #555;
      border-radius: 4px;
      background-color: #252525;
      max-height: 40vh;
    }
    
    .db-list-item {
      padding: 8px 12px;
      border-bottom: 1px solid #444;
      cursor: pointer;
      display: flex;
      align-items: center;
    }
    
    .db-list-item:last-child {
      border-bottom: none;
    }
    
    .db-list-item:hover {
      background-color: #444;
    }
    
    .db-item-id {
      background-color: #4da6fa;
      color: #222;
      padding: 2px 6px;
      border-radius: 3px;
      margin-right: 10px;
      font-weight: bold;
      font-size: 12px;
    }
    
    .db-item-name {
      color: #fff;
    }
    
    .modal-buttons {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }
    
    .modal-button {
      padding: 8px 15px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: bold;
    }
    
    .modal-button.cancel {
      background-color: #555;
      color: #fff;
    }
    
    .modal-button.confirm {
      background-color: #4da6fa;
      color: #fff;
    }
    
    .no-results {
      padding: 15px;
      text-align: center;
      color: #aaa;
      font-style: italic;
    }
  `;
  
  document.head.appendChild(style);
}

/**
 * Функція для обчислення метрики схожості між двома рядками
 * @param {string} str1 - Перший рядок
 * @param {string} str2 - Другий рядок
 * @returns {number} Схожість від 0 до 1, де 1 - повний збіг
 */
function getSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  
  // Приведення до нижнього регістру
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  
  // Якщо рядки однакові, повертаємо максимальну схожість
  if (s1 === s2) return 1;
  
  // Обчислюємо відстань Левенштейна
  const distance = levenshteinDistance(s1, s2);
  
  // Нормалізуємо відстань по відношенню до довжини найдовшого рядка
  const maxLength = Math.max(s1.length, s2.length);
  return 1 - (distance / maxLength);
}

/**
 * Функція для обчислення відстані Левенштейна між двома рядками
 * @param {string} a - Перший рядок
 * @param {string} b - Другий рядок
 * @returns {number} Відстань Левенштейна
 */
function levenshteinDistance(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = [];

  // Ініціалізуємо матрицю
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // Заповнюємо матрицю
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = a[j - 1] === b[i - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // видалення
        matrix[i][j - 1] + 1,      // вставка
        matrix[i - 1][j - 1] + cost // заміна
      );
    }
  }

  return matrix[b.length][a.length];
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
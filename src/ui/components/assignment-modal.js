import { triggerRerender } from '../renderer/render-utils.js';
import { getSimilarity } from '../utils.js';

/**
 * Показує модальне вікно для ручного призначення імені з бази
 * @param {NameMatcher} nameMatcher - Екземпляр класу NameMatcher
 * @param {string} name - Ім'я учасника з чату
 */
export function showAssignmentModal(nameMatcher, name) {
  // Перевіряємо, чи передано валідний екземпляр NameMatcher
  if (!nameMatcher || typeof nameMatcher.getNameDatabase !== 'function') {
    console.error('NameMatcher не ініціалізовано');
    return;
  }

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
      updateDbNamesList(nameMatcher, searchValue, name);
    });
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
  updateDbNamesList(nameMatcher, '', name);
  
  // Показуємо модальне вікно
  modal.style.display = 'block';
}

/**
 * Оновлює список імен з бази для модального вікна
 * @param {NameMatcher} nameMatcher - Екземпляр класу NameMatcher
 * @param {string} searchValue - Значення для пошуку
 * @param {string} chatName - Ім'я учасника з чату
 */
function updateDbNamesList(nameMatcher, searchValue, chatName) {
  const dbList = document.getElementById('dbNamesList');
  if (!dbList) return;
  
  // Очищаємо список
  dbList.innerHTML = '';
  
  // Отримуємо всі імена з бази
  let nameDatabase;
  try {
    nameDatabase = nameMatcher.getNameDatabase();
  } catch (error) {
    console.error('Помилка отримання бази імен:', error);
    const noResults = document.createElement('div');
    noResults.className = 'no-results';
    noResults.textContent = 'Помилка завантаження бази';
    dbList.appendChild(noResults);
    return;
  }
  
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
      nameMatcher.setManualMatch(chatName, id);
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
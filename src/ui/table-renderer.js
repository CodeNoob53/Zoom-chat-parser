import { elements } from '../core/dom.js';
import { getParticipantInfo } from '../name-processing/name-database.js';
import { sortParticipants, getCurrentSortState } from './sorting.js';
import { showAssignmentModal } from './assignment-modal.js';
import { triggerRerender } from './render-utils.js';
import { 
  createFragment, 
  createElement, 
  updateTable 
} from '../utils/dom-utils.js';

// Зберігаємо стан відображення для оптимізації рендерингу
const renderCache = {
  participantsList: null,  // Останні відрендерені учасники
  sortState: null,         // Останній стан сортування
  expandedRows: new Set()  // Список розгорнутих рядків
};

/**
 * Відображення списку учасників у таблиці з покращеним інтерфейсом
 * і оптимізованим оновленням DOM
 * @param {string[]} list - Масив імен для відображення
 * @param {Object} realNameMap - Карта відповідності Zoom-імені до реального імені
 * @param {boolean} useDbChk - Чи використовувати базу імен
 * @param {Object} matchedNames - Результати порівняння з базою імен
 */
export function renderNames(list, realNameMap, useDbChk, matchedNames) {
  const { participantsList, countNamesSpan } = elements;
  
  // Отримуємо поточний стан сортування
  const sortState = getCurrentSortState();
  
  // Збираємо повну інформацію про учасників
  const participants = list.map(name => getParticipantInfo(name, realNameMap));
  
  // Сортуємо учасників
  const sortedParticipants = sortParticipants(
    participants,
    sortState.column,
    sortState.direction
  );
  
  // Створюємо набір унікальних ідентифікаторів
  const uniqueIdentifiers = new Set();
  
  // Фільтруємо дублікати
  const uniqueParticipants = sortedParticipants.filter(participant => {
    const uniqueId = participant.foundInDb
      ? participant.id
      : `${participant.id}_${participant.nickname}`;
    
    if (uniqueIdentifiers.has(uniqueId)) {
      return false;
    }
    
    uniqueIdentifiers.add(uniqueId);
    return true;
  });
  
  // Оновлюємо лічильник імен
  countNamesSpan.textContent = uniqueParticipants.length;
  
  // Отримуємо список нерозпізнаних імен
  const unrecognizedNames = useDbChk 
    ? getUnrecognizedNames() 
    : [];
  
  // Отримуємо рекомендації для нерозпізнаних імен
  const recommendations = useDbChk
    ? getRecommendations(unrecognizedNames, getNameDatabase(), matchedNames)
    : {};
  
  // Використовуємо оптимізований рендеринг таблиці
  updateParticipantsTable(
    participantsList,
    uniqueParticipants,
    realNameMap,
    unrecognizedNames,
    recommendations,
    renderCache.expandedRows
  );
  
  // Оновлюємо кеш рендерингу
  renderCache.participantsList = uniqueParticipants;
  renderCache.sortState = { ...sortState };
  
  // По дефолту сортуємо за ID (якщо це перший рендер)
  if (!document.querySelector('.sorted')) {
    elements.sortById.classList.add('sorted');
    elements.sortById.classList.add('asc');
  }
}

/**
 * Оптимізоване оновлення таблиці учасників
 * @param {HTMLElement} tableBody - Елемент tbody таблиці
 * @param {Array} participants - Масив учасників
 * @param {Object} realNameMap - Карта відповідності імен
 * @param {Array} unrecognizedNames - Список нерозпізнаних імен
 * @param {Object} recommendations - Рекомендації
 * @param {Set} expandedRows - Множина розгорнутих рядків
 */
function updateParticipantsTable(
  tableBody, 
  participants, 
  realNameMap, 
  unrecognizedNames, 
  recommendations,
  expandedRows
) {
  // Використовуємо документ-фрагмент для пакетного оновлення
  const fragment = createFragment();
  
  // Карта існуючих рядків для відстеження змін
  const existingRows = new Map();
  Array.from(tableBody.children).forEach(row => {
    const nickname = row.querySelector('.nickname-text')?.textContent;
    if (nickname) {
      existingRows.set(nickname, row);
    }
  });
  
  // Створюємо або оновлюємо рядки для кожного учасника
  participants.forEach(participant => {
    // Визначаємо, чи був цей рядок розгорнутий раніше
    const isExpanded = expandedRows.has(participant.nickname);
    
    // Використовуємо createElement для створення DOM елементів
    const row = renderParticipantRow(
      participant,
      realNameMap,
      unrecognizedNames,
      recommendations,
      isExpanded
    );
    
    // Встановлюємо data атрибут для ідентифікації
    row.setAttribute('data-nickname', participant.nickname);
    
    // Перевіряємо, чи існує такий рядок
    if (existingRows.has(participant.nickname)) {
      // Отримуємо існуючий рядок
      const existingRow = existingRows.get(participant.nickname);
      
      // Перевіряємо, чи рядок розгорнутий
      if (existingRow.classList.contains('expanded')) {
        row.classList.add('expanded');
        expandedRows.add(participant.nickname);
      }
      
      // Видаляємо з карти
      existingRows.delete(participant.nickname);
    }
    
    // Додаємо рядок до фрагмента
    fragment.appendChild(row);
  });
  
  // Очищаємо таблицю і додаємо фрагмент
  tableBody.innerHTML = '';
  tableBody.appendChild(fragment);
  
  // Додаємо обробники подій для розгортання/згортання рядків
  addExpandListeners(tableBody, expandedRows);
}

/**
 * Створення рядка таблиці для учасника
 * @param {Object} participant - Інформація про учасника
 * @param {Object} realNameMap - Карта відповідності імен
 * @param {Array} unrecognizedNames - Список нерозпізнаних імен
 * @param {Object} recommendations - Рекомендації
 * @param {boolean} isExpanded - Чи має бути рядок розгорнутим
 * @returns {HTMLElement} Рядок таблиці
 */
function renderParticipantRow(
  participant,
  realNameMap,
  unrecognizedNames,
  recommendations,
  isExpanded
) {
  // Визначаємо класи рядка
  const rowClasses = [
    participant.foundInDb ? 'found' : 'not-found'
  ];
  
  // Додаємо додаткові класи
  if (participant.autoMatched) {
    rowClasses.push('auto-matched');
  }
  
  // Додаємо класи залежно від типу співпадіння
  if (participant.matchType) {
    participant.matchType.split(' ').forEach(type => {
      if (type) rowClasses.push(type);
    });
  }
  
  // Додаємо клас "has-alternatives", якщо є альтернативи
  const hasAlternatives = !participant.foundInDb && 
    (participant.alternativeMatches || 
     recommendations[participant.nickname]);
  
  if (hasAlternatives) {
    rowClasses.push('has-alternatives');
  }
  
  // Додаємо клас "expanded", якщо рядок має бути розгорнутим
  if (isExpanded) {
    rowClasses.push('expanded');
  }
  
  // Створюємо елементи рядка
  const row = createElement('tr', { className: rowClasses.join(' ') });
  
  // Додаємо комірку ID
  row.appendChild(
    createElement('td', { className: 'id-cell' }, participant.id)
  );
  
  // Додаємо комірку Прізвище
  row.appendChild(
    createElement('td', { className: 'surname-cell' }, participant.surname || '-')
  );
  
  // Додаємо комірку Ім'я
  row.appendChild(
    createElement('td', { className: 'firstname-cell' }, participant.firstname || '-')
  );
  
  // Створюємо комірку нікнейму
  const nicknameCell = createElement('td', { className: 'zoom-nickname-cell' });
  
  // Контейнер нікнейму
  const nicknameContainer = createElement('div', { className: 'nickname-container' });
  
  // Текст нікнейму
  nicknameContainer.appendChild(
    createElement('span', { className: 'nickname-text' }, participant.nickname)
  );
  
  // Додаємо реальне ім'я, якщо є
  if (realNameMap[participant.nickname]) {
    nicknameContainer.appendChild(
      createElement('span', { className: 'real-name' }, 
        ` (${realNameMap[participant.nickname]})`)
    );
  }
  
  // Додаємо індикатори для типів співпадіння
  addMatchTypeIndicators(participant, nicknameContainer);
  
  // Додаємо іконку розгортання, якщо є альтернативи
  if (hasAlternatives) {
    nicknameContainer.appendChild(
      createElement('span', { 
        className: 'expand-icon',
        title: 'Натисніть, щоб показати варіанти'
      }, isExpanded ? '▲' : '▼')
    );
  }
  
  nicknameCell.appendChild(nicknameContainer);
  
  // Додаємо контейнер для дій і альтернатив
  if (!participant.foundInDb) {
    const actionsContainer = createElement('div', { className: 'actions-container' });
    
    // Додаємо альтернативи або кнопку ручного призначення
    if (hasAlternatives) {
      const alternativesContainer = createAlternativesContainer(
        participant, 
        recommendations[participant.nickname] || []
      );
      actionsContainer.appendChild(alternativesContainer);
    } else {
      // Кнопка ручного призначення
      const manualButton = createElement('button', {
        className: 'manual-assign-btn',
        onclick: (e) => {
          e.stopPropagation();
          showAssignmentModal(participant.nickname);
        }
      }, 'Призначити вручну');
      
      actionsContainer.appendChild(manualButton);
    }
    
    nicknameCell.appendChild(actionsContainer);
  }
  
  row.appendChild(nicknameCell);
  
  return row;
}

/**
 * Додає індикатори для різних типів співпадіння
 * @param {Object} participant - Інформація про учасника
 * @param {HTMLElement} container - Контейнер для індикаторів
 */
function addMatchTypeIndicators(participant, container) {
  // Додаємо індикатор транслітерації
  if (
    participant.matchType.includes('translit') ||
    participant.matchType.includes('transliterated')
  ) {
    container.appendChild(
      createElement('span', {
        className: 'match-indicator translit-indicator',
        title: 'Знайдено через транслітерацію'
      }, ' ᴛ')
    );
  }
  
  // Додаємо індикатор розпізнавання склеєних імен
  if (participant.matchType.includes('split-name-match')) {
    container.appendChild(
      createElement('span', {
        className: 'match-indicator split-name-indicator',
        title: 'Автоматично розпізнане склеєне ім\'я'
      }, ' ｓ')
    );
  }
  
  // Додаємо індикатор зворотного порядку
  if (
    participant.matchType.includes('reversed') ||
    participant.matchType.includes('reverse')
  ) {
    container.appendChild(
      createElement('span', {
        className: 'match-indicator reversed-indicator',
        title: 'Знайдено в базі у зворотному порядку (Ім\'я Прізвище)'
      }, ' ↔')
    );
  }
  
  // Додаємо індикатор варіанту імені
  if (
    participant.matchType.includes('variant') ||
    participant.matchType.includes('name-variant')
  ) {
    container.appendChild(
      createElement('span', {
        className: 'match-indicator variant-indicator',
        title: 'Знайдено зменшувальну форму імені'
      }, ' ᴠ')
    );
  }
  
  // Додаємо індикатор автоматичного співпадіння
  if (participant.autoMatched) {
    container.appendChild(
      createElement('span', {
        className: 'match-indicator auto-indicator',
        title: 'Автоматично знайдене співпадіння'
      }, ' ᴀ')
    );
  }
}

/**
 * Створює контейнер з альтернативними варіантами
 * @param {Object} participant - Інформація про учасника
 * @param {Array} recsList - Список рекомендацій
 * @returns {HTMLElement} Контейнер з альтернативами
 */
function createAlternativesContainer(participant, recsList) {
  const alternativesContainer = createElement('div', { className: 'alternatives-container' });
  
  // Додаємо заголовок
  alternativesContainer.appendChild(
    createElement('div', { className: 'alternatives-title' }, 'Виберіть співпадіння:')
  );
  
  // Збираємо всі альтернативи
  const alternativesList = [];
  
  // Додаємо альтернативи з учасника
  if (participant.alternativeMatches && participant.alternativeMatches.length > 0) {
    alternativesList.push(...participant.alternativeMatches);
  }
  
  // Додаємо рекомендації
  if (recsList.length > 0) {
    const recsAsAlternatives = recsList.map(rec => ({
      dbName: rec.dbName,
      id: rec.id,
      quality: Math.round(rec.similarity * 100)
    }));
    alternativesList.push(...recsAsAlternatives);
  }
  
  // Усуваємо дублікати за ID
  const uniqueAlternatives = [];
  const seenIds = new Set();
  
  for (const alt of alternativesList) {
    if (alt && alt.id && !seenIds.has(alt.id)) {
      uniqueAlternatives.push(alt);
      seenIds.add(alt.id);
    }
  }
  
  // Сортуємо за якістю
  uniqueAlternatives.sort((a, b) => (b.quality || 0) - (a.quality || 0));
  
  // Створюємо елементи для альтернатив
  uniqueAlternatives.forEach(alt => {
    const item = createElement('div', { className: 'alternative-item' });
    
    // Якість співпадіння
    item.appendChild(
      createElement('span', { 
        className: `match-quality quality-${Math.floor((alt.quality || 0) / 10)}`
      }, `${alt.quality || 0}%`)
    );
    
    // Ім'я з бази
    item.appendChild(
      createElement('span', { className: 'db-name' }, alt.dbName)
    );
    
    // Кнопка для вибору
    item.appendChild(
      createElement('button', {
        className: 'select-alternative',
        title: 'Вибрати це співпадіння',
        onclick: (e) => {
          e.stopPropagation();
          setManualMatch(participant.nickname, alt.id);
          triggerRerender();
        }
      }, '✓')
    );
    
    alternativesContainer.appendChild(item);
  });
  
  return alternativesContainer;
}

/**
 * Додає обробники подій для розгортання/згортання рядків
 * @param {HTMLElement} tableBody - Тіло таблиці
 * @param {Set} expandedRows - Множина розгорнутих рядків
 */
function addExpandListeners(tableBody, expandedRows) {
  // Знаходимо всі рядки з альтернативами
  const rowsWithAlternatives = tableBody.querySelectorAll('tr.has-alternatives');
  
  rowsWithAlternatives.forEach(row => {
    // Додаємо обробник кліку
    row.addEventListener('click', () => {
      // Отримуємо нікнейм з рядка
      const nickname = row.getAttribute('data-nickname');
      
      // Змінюємо стан розгортання
      const isExpanded = row.classList.contains('expanded');
      
      if (isExpanded) {
        row.classList.remove('expanded');
        expandedRows.delete(nickname);
        
        // Оновлюємо іконку
        const expandIcon = row.querySelector('.expand-icon');
        if (expandIcon) expandIcon.textContent = '▼';
      } else {
        // Згортаємо інші рядки
        document.querySelectorAll('tr.expanded').forEach(el => {
          el.classList.remove('expanded');
          const otherNickname = el.getAttribute('data-nickname');
          if (otherNickname) expandedRows.delete(otherNickname);
          
          const icon = el.querySelector('.expand-icon');
          if (icon) icon.textContent = '▼';
        });
        
        // Розгортаємо поточний рядок
        row.classList.add('expanded');
        if (nickname) expandedRows.add(nickname);
        
        // Оновлюємо іконку
        const expandIcon = row.querySelector('.expand-icon');
        if (expandIcon) expandIcon.textContent = '▲';
      }
    });
  });
}

// Імпорт необхідних функцій з інших модулів
import {
  getUnrecognizedNames,
  getRecommendations,
  getNameDatabase,
  setManualMatch
} from '../name-processing/name-database.js';
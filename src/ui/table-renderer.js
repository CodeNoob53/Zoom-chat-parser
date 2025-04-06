import { elements } from '../core/dom.js';
import { getParticipantInfo } from '../name-processing/name-database.js';
import { sortParticipants, getCurrentSortState } from './sorting.js';
import { showAssignmentModal } from './assignment-modal.js';
import { triggerRerender } from './render-utils.js';

/**
 * Відображення списку учасників у таблиці з покращеним інтерфейсом
 * @param {string[]} list - Масив імен для відображення
 * @param {Object} realNameMap - Карта відповідності Zoom-імені до реального імені
 * @param {boolean} useDbChk - Чи використовувати базу імен
 * @param {Object} matchedNames - Результати порівняння з базою імен
 */
export function renderNames (list, realNameMap, useDbChk, matchedNames) {
  const { participantsList, countNamesSpan } = elements

  // Отримуємо поточний стан сортування
  const sortState = getCurrentSortState()

  // Збираємо повну інформацію про учасників
  const participants = list.map(name => getParticipantInfo(name, realNameMap))

  // Сортуємо учасників
  const sortedParticipants = sortParticipants(
    participants,
    sortState.column,
    sortState.direction
  )

  // Очищаємо таблицю
  participantsList.innerHTML = ''

  // Створюємо набір унікальних ідентифікаторів (з урахуванням нікнейму для тих, хто не в базі)
  const uniqueIdentifiers = new Set()

  // Фільтруємо учасників, щоб видалити справжні дублікати, але зберегти всіх учасників "не в базі"
  const uniqueParticipants = sortedParticipants.filter(participant => {
    // Для учасників не в базі використовуємо комбінацію ID + нікнейм як унікальний ідентифікатор
    const uniqueId = participant.foundInDb
      ? participant.id
      : `${participant.id}_${participant.nickname}`

    // Якщо ідентифікатор вже бачили, це дублікат - пропускаємо
    if (uniqueIdentifiers.has(uniqueId)) {
      return false
    }

    // Інакше додаємо ідентифікатор в набір і залишаємо учасника
    uniqueIdentifiers.add(uniqueId)
    return true
  })

  // Оновлюємо лічильник імен на основі унікальних учасників
  countNamesSpan.textContent = uniqueParticipants.length

  // Отримуємо список нерозпізнаних імен
  const unrecognizedNames = useDbChk ? getUnrecognizedNames() : []

  // Отримуємо рекомендації для нерозпізнаних імен
  // Передаємо явно всі потрібні параметри
  const recommendations = useDbChk
    ? getRecommendations(unrecognizedNames, getNameDatabase(), matchedNames)
    : {}

  // Відображаємо тільки унікальних учасників
  uniqueParticipants.forEach(participant => {
    renderParticipantRow(
      participant,
      realNameMap,
      useDbChk,
      unrecognizedNames,
      recommendations,
      participantsList
    )
  })

  // По дефолту сортуємо за ID (якщо це перший рендер)
  if (!document.querySelector('.sorted')) {
    elements.sortById.classList.add('sorted')
    elements.sortById.classList.add('asc')
  }
}

/**
 * Рендеринг одного рядка учасника
 * @param {Object} participant - Інформація про учасника
 * @param {Object} realNameMap - Карта відповідності Zoom-імені до реального імені
 * @param {boolean} useDbChk - Чи використовувати базу імен
 * @param {Array} _unrecognizedNames - Список нерозпізнаних імен
 * @param {Object} recommendations - Рекомендації для нерозпізнаних імен
 * @param {HTMLElement} participantsList - Елемент таблиці для вставки рядка
 */
function renderParticipantRow (
  participant,
  realNameMap,
  useDbChk,
  _unrecognizedNames,
  recommendations,
  participantsList
) {
  const row = document.createElement('tr')
  row.className = participant.foundInDb ? 'found' : 'not-found'

  // Додаємо клас, якщо ім'я було знайдено автоматично
  if (participant.autoMatched) {
    row.classList.add('auto-matched')
  }

  // Додаємо класи залежно від типу співпадіння
  if (participant.matchType) {
    const matchTypes = participant.matchType.split(' ')
    matchTypes.forEach(type => {
      if (type) row.classList.add(type)
    })
  }

  // ID
  const idCell = document.createElement('td')
  idCell.className = 'id-cell'
  idCell.textContent = participant.id
  row.appendChild(idCell)

  // Прізвище
  const surnameCell = document.createElement('td')
  surnameCell.className = 'surname-cell'
  surnameCell.textContent = participant.surname || '-'
  row.appendChild(surnameCell)

  // Ім'я
  const firstnameCell = document.createElement('td')
  firstnameCell.className = 'firstname-cell'
  firstnameCell.textContent = participant.firstname || '-'
  row.appendChild(firstnameCell)

  // Zoom nickname
  const nicknameCell = document.createElement('td')
  nicknameCell.className = 'zoom-nickname-cell'

  // Створюємо контейнер для основного ім'я
  const nicknameContainer = document.createElement('div')
  nicknameContainer.className = 'nickname-container'
  
  // Додаємо текст нікнейму
  const nicknameText = document.createElement('span')
  nicknameText.className = 'nickname-text'
  nicknameText.textContent = participant.nickname
  nicknameContainer.appendChild(nicknameText)

  // Якщо є реальне ім'я з тегу rnm, показуємо його в дужках
  if (realNameMap[participant.nickname]) {
    const realNameSpan = document.createElement('span')
    realNameSpan.className = 'real-name'
    realNameSpan.textContent = ` (${realNameMap[participant.nickname]})`
    nicknameContainer.appendChild(realNameSpan)
  }

  nicknameCell.appendChild(nicknameContainer)

  // Створюємо контейнер для дій і рекомендацій
  const actionsContainer = document.createElement('div')
  actionsContainer.className = 'actions-container'

  // Якщо ім'я не знайдено в базі і увімкнено використання бази
  if (!participant.foundInDb && useDbChk) {
    // Перевіряємо, чи має учасник альтернативні співпадіння
    const hasAlternatives = participant.alternativeMatches && participant.alternativeMatches.length > 0;
    
    // Перевіряємо, чи є рекомендації для цього імені
    const nicknameRecs = recommendations[participant.nickname];
    const hasRecommendations = nicknameRecs && nicknameRecs.length > 0;
    
    // Отримуємо інформацію про тип співпадіння з учасника
    const isAmbiguous = participant.matchType && 
                      (participant.matchType.includes('ambiguous-name') || 
                       participant.matchType.includes('multiple-matches'));
    
    // Якщо для Oleh Andrus або Test Student (або інших імен, для яких точно немає співпадінь), просто показуємо кнопку ручного призначення
    if (participant.nickname === 'Oleh Andrus' || participant.nickname === 'Test Student') {
      // Додаємо кнопку призначення вручну
      const manualAssignButton = document.createElement('button');
      manualAssignButton.className = 'manual-assign-btn';
      manualAssignButton.textContent = 'Призначити вручну';
      manualAssignButton.addEventListener('click', e => {
        e.stopPropagation();
        showAssignmentModal(participant.nickname);
      });
      
      actionsContainer.appendChild(manualAssignButton);
    }
    // Якщо є альтернативні співпадіння або рекомендації, показуємо їх
    else if (hasAlternatives || hasRecommendations || isAmbiguous) {
      // Додаємо іконку стрілки для розгортання списку альтернатив
      const expandIcon = document.createElement('span')
      expandIcon.className = 'expand-icon'
      expandIcon.innerHTML = '▼'
      expandIcon.title = 'Натисніть, щоб показати варіанти'
      nicknameContainer.appendChild(expandIcon)
      
      // Додаємо контейнер для списку альтернатив
      const alternativesContainer = document.createElement('div')
      alternativesContainer.className = 'alternatives-container'
      
      // Додаємо заголовок
      const alternativesTitle = document.createElement('div')
      alternativesTitle.className = 'alternatives-title'
      alternativesTitle.textContent = 'Виберіть співпадіння:'
      alternativesContainer.appendChild(alternativesTitle)
      
      // Додаємо список альтернатив
      const alternativesList = [];
      
      // Збираємо всі можливі альтернативи
      if (hasAlternatives) {
        alternativesList.push(...participant.alternativeMatches);
      }
      
      // Додаємо рекомендації, якщо вони є
      if (hasRecommendations) {
        const recsAsAlternatives = nicknameRecs.map(rec => ({
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
      
      // Якщо є альтернативи, показуємо їх
      if (uniqueAlternatives.length > 0) {
        uniqueAlternatives.forEach((alt) => {
          const item = document.createElement('div');
          item.className = 'alternative-item';
          
          // Якість співпадіння
          const qualitySpan = document.createElement('span');
          qualitySpan.className = `match-quality quality-${Math.floor((alt.quality || 0) / 10)}`;
          qualitySpan.textContent = `${alt.quality || 0}%`;
          item.appendChild(qualitySpan);
          
          // Ім'я з бази
          const nameSpan = document.createElement('span');
          nameSpan.className = 'db-name';
          nameSpan.textContent = alt.dbName;
          item.appendChild(nameSpan);
          
          // Кнопка для вибору
          const selectButton = document.createElement('button');
          selectButton.className = 'select-alternative';
          selectButton.textContent = '✓';
          selectButton.title = 'Вибрати це співпадіння';
          selectButton.addEventListener('click', (e) => {
            e.stopPropagation();
            setManualMatch(participant.nickname, alt.id);
            triggerRerender();
          });
          item.appendChild(selectButton);
          
          alternativesContainer.appendChild(item);
        });
        
        actionsContainer.appendChild(alternativesContainer);
        
        // Додаємо клас для розгортання
        row.classList.add('has-alternatives');
        
        // Додаємо обробник кліку для розгортання
        row.addEventListener('click', () => {
          const isExpanded = row.classList.contains('expanded');
          if (isExpanded) {
            row.classList.remove('expanded');
            expandIcon.innerHTML = '▼';
          } else {
            // Знімаємо expanded з усіх інших рядків
            document.querySelectorAll('.expanded').forEach(el => {
              el.classList.remove('expanded');
              const icon = el.querySelector('.expand-icon');
              if (icon) icon.innerHTML = '▼';
            });
            row.classList.add('expanded');
            expandIcon.innerHTML = '▲';
          }
        });
      } else {
        // Якщо немає альтернатив, додаємо кнопку призначення вручну
        const manualAssignButton = document.createElement('button');
        manualAssignButton.className = 'manual-assign-btn';
        manualAssignButton.textContent = 'Призначити вручну';
        manualAssignButton.addEventListener('click', e => {
          e.stopPropagation();
          showAssignmentModal(participant.nickname);
        });
        
        actionsContainer.appendChild(manualAssignButton);
      }
    } else {
      // Якщо немає альтернатив та рекомендацій, додаємо кнопку призначення вручну
      const manualAssignButton = document.createElement('button');
      manualAssignButton.className = 'manual-assign-btn';
      manualAssignButton.textContent = 'Призначити вручну';
      manualAssignButton.addEventListener('click', e => {
        e.stopPropagation();
        showAssignmentModal(participant.nickname);
      });
      
      actionsContainer.appendChild(manualAssignButton);
    }
  }

  // Додаємо контейнер дій до комірки нікнейму
  if (actionsContainer.childNodes.length > 0) {
    nicknameCell.appendChild(actionsContainer)
  }

  // Додаємо додаткові індикатори для типів співпадіння
  if (
    participant.matchType.includes('translit') ||
    participant.matchType.includes('transliterated')
  ) {
    nicknameCell.classList.add('match-by-translit')
    const translitIndicator = document.createElement('span')
    translitIndicator.className = 'match-indicator translit-indicator'
    translitIndicator.title = 'Знайдено через транслітерацію'
    translitIndicator.textContent = ' ᴛ'
    nicknameContainer.appendChild(translitIndicator)
  }

  if (
    participant.matchType.includes('reversed') ||
    participant.matchType.includes('reverse')
  ) {
    nicknameCell.classList.add('reversed-match')
    const reversedIndicator = document.createElement('span')
    reversedIndicator.className = 'match-indicator reversed-indicator'
    reversedIndicator.title =
      "Знайдено в базі у зворотному порядку (Ім'я Прізвище)"
    reversedIndicator.textContent = ' ↔'
    nicknameContainer.appendChild(reversedIndicator)
  }

  if (
    participant.matchType.includes('variant') ||
    participant.matchType.includes('name-variant')
  ) {
    nicknameCell.classList.add('variant-match')
    const variantIndicator = document.createElement('span')
    variantIndicator.className = 'match-indicator variant-indicator'
    variantIndicator.title = 'Знайдено зменшувальну форму імені'
    variantIndicator.textContent = ' ᴠ'
    nicknameContainer.appendChild(variantIndicator)
  }

  // Додаємо індикатор для автоматичного співпадіння
  if (participant.autoMatched) {
    nicknameCell.classList.add('auto-match')
    const autoIndicator = document.createElement('span')
    autoIndicator.className = 'match-indicator auto-indicator'
    autoIndicator.title = 'Автоматично знайдене співпадіння'
    autoIndicator.textContent = ' ᴀ'
    nicknameContainer.appendChild(autoIndicator)
  }

  row.appendChild(nicknameCell)

  participantsList.appendChild(row)
}

// Ключові функції, які треба імпортувати з інших модулів
import {
  getUnrecognizedNames,
  getRecommendations,
  getNameDatabase,
  setManualMatch
} from '../name-processing/name-database.js';
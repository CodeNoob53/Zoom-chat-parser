import { elements } from './dom.js'
import { getParticipantInfo } from './name-database.js'
import { sortParticipants, getCurrentSortState } from './sorting.js'
import { showAssignmentModal } from './assignment-modal.js'
import { triggerRerender } from './render-utils.js'

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
 * Рендеринг одного рядка учасника (винесено в окрему функцію)
 * @param {Object} participant - Інформація про учасника
 * @param {Object} realNameMap - Карта відповідності Zoom-імені до реального імені
 * @param {boolean} useDbChk - Чи використовувати базу імен
 * @param {Array} unrecognizedNames - Список нерозпізнаних імен
 * @param {Object} recommendations - Рекомендації для нерозпізнаних імен
 * @param {HTMLElement} participantsList - Елемент таблиці для вставки рядка
 */
function renderParticipantRow (
  participant,
  realNameMap,
  useDbChk,
  unrecognizedNames,
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
  nicknameContainer.textContent = participant.nickname

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
    // Перевіряємо, чи є рекомендації для цього імені
    const nicknameRecs = recommendations[participant.nickname]

    // ЗМІНЕНО: Додаємо додаткову перевірку якості рекомендацій
    // Фільтруємо рекомендації з якістю 50% і вище
    const qualityRecs = nicknameRecs
      ? nicknameRecs.filter(rec => rec.similarity * 100 >= 50)
      : []

    // Показуємо рекомендації тільки якщо є якісні співпадіння
    if (qualityRecs && qualityRecs.length > 0) {
      const recommendationsContainer = document.createElement('div')
      recommendationsContainer.className = 'recommendations-container'

      // Додаємо заголовок
      const recommendationsTitle = document.createElement('div')
      recommendationsTitle.className = 'recommendations-title'
      recommendationsTitle.textContent = 'Можливі співпадіння:'
      recommendationsContainer.appendChild(recommendationsTitle)

      // Додаємо рекомендації
      qualityRecs.forEach((rec, index) => {
        const recommendationItem = document.createElement('div')
        recommendationItem.className = 'recommendation-item'

        // Відсоток схожості
        const similaritySpan = document.createElement('span')
        similaritySpan.className = 'similarity'
        similaritySpan.textContent = `${Math.round(rec.similarity * 100)}%`
        recommendationItem.appendChild(similaritySpan)

        // Ім'я з бази
        const dbNameSpan = document.createElement('span')
        dbNameSpan.className = 'db-name'
        dbNameSpan.textContent = rec.dbName
        recommendationItem.appendChild(dbNameSpan)

        // Кнопка для застосування рекомендації
        const applyButton = document.createElement('button')
        applyButton.className = 'apply-recommendation'
        applyButton.textContent = '✓'
        applyButton.title = 'Застосувати це співпадіння'
        applyButton.addEventListener('click', e => {
          e.stopPropagation()
          setManualMatch(participant.nickname, rec.id)
          triggerRerender()
        })
        recommendationItem.appendChild(applyButton)

        recommendationsContainer.appendChild(recommendationItem)
      })

      actionsContainer.appendChild(recommendationsContainer)
    } else {
      // Якщо немає якісних рекомендацій, додаємо кнопку призначення
      const manualAssignButton = document.createElement('button')
      manualAssignButton.className = 'manual-assign-btn'
      manualAssignButton.textContent = 'Призначити вручну'
      manualAssignButton.addEventListener('click', e => {
        e.stopPropagation()
        showAssignmentModal(participant.nickname)
      })

      actionsContainer.appendChild(manualAssignButton)
    }
  }

  // Додаємо альтернативні співпадіння, якщо є
  if (
    participant.alternativeMatches &&
    participant.alternativeMatches.length > 0
  ) {
    const altMatchesContainer = document.createElement('div')
    altMatchesContainer.className = 'alt-matches'

    const altMatchesTitle = document.createElement('div')
    altMatchesTitle.className = 'alt-matches-title'
    altMatchesTitle.textContent = 'Виберіть співпадіння:'
    altMatchesContainer.appendChild(altMatchesTitle)

    participant.alternativeMatches.forEach((altMatch, index) => {
      const altMatchItem = document.createElement('div')
      altMatchItem.className = 'alt-match-item'
      altMatchItem.innerHTML = `<span class="match-quality quality-${Math.floor(
        altMatch.quality / 10
      )}">${altMatch.quality}%</span> ${altMatch.dbName}`

      // Додаємо кнопку для вибору цього співпадіння
      const selectButton = document.createElement('button')
      selectButton.className = 'select-alternative'
      selectButton.textContent = '✓'
      selectButton.title = 'Вибрати це співпадіння'
      selectButton.addEventListener('click', e => {
        e.stopPropagation()
        selectAlternativeMatch(participant.nickname, index)
        triggerRerender()
      })
      altMatchItem.appendChild(selectButton)

      altMatchesContainer.appendChild(altMatchItem)
    })

    actionsContainer.appendChild(altMatchesContainer)
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

  // Додаємо інтерактивність рядка, якщо є альтернативні співпадіння або рекомендації
  if (actionsContainer.childNodes.length > 0) {
    row.classList.add('has-alternatives')
    // Відображення/приховування альтернативних співпадінь при кліку
    row.addEventListener('click', () => {
      const isExpanded = row.classList.contains('expanded')
      if (isExpanded) {
        row.classList.remove('expanded')
      } else {
        // Знімаємо expanded з усіх інших рядків
        document.querySelectorAll('.expanded').forEach(el => {
          el.classList.remove('expanded')
        })
        row.classList.add('expanded')
      }
    })
  }

  participantsList.appendChild(row)
}

// Ключові функції, які треба імпортувати з інших модулів
import {
  getUnrecognizedNames,
  getRecommendations,
  getNameDatabase,
  setManualMatch,
  selectAlternativeMatch
} from './name-database.js'

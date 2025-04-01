import { elements } from './dom.js'
import { matchNames } from './name-matcher.js'
import { showNotification } from './notification.js'
import { splitName } from './name-utils.js'

// Зберігаємо базу імен
let nameDatabase = {} // Формат: {name: id, ...}
// Зберігаємо знайдені співпадіння
let matchedNames = {} // Формат: {name: id, ...} для знайдених співпадінь
// Зберігаємо ручні призначення
let manualAssignments = {} // Формат: {id: [name1, name2, ...], ...}
// Зберігаємо нерозпізнані імена
let unrecognizedNames = new Set() // Set з імен, які не були знайдені в базі

/**
 * Парсинг бази імен з тексту
 * @param {string} content - Вміст файлу бази імен
 */
export function parseNameDatabase (content) {
  const { dbStatus } = elements

  nameDatabase = {} // Очищуємо попередню базу
  const lines = content.split(/\r?\n/).filter(line => line.trim())

  let validEntries = 0

  lines.forEach((line, index) => {
    // Формат рядка: "Ім'я Прізвище: ID" або просто "Ім'я Прізвище"
    const match = line.match(/^(.*?)(?::|\s+)(\d+)$/)

    if (match) {
      const name = match[1].trim()
      const id = match[2].trim()
      nameDatabase[name] = id
      validEntries++
    } else if (line.trim()) {
      // Якщо немає ID, але рядок не пустий, присвоюємо автоматичний ID
      nameDatabase[line.trim()] = (index + 1).toString()
      validEntries++
    }
  })

  if (validEntries > 0) {
    dbStatus.textContent = `База завантажена: ${validEntries} записів`
    dbStatus.classList.add('loaded')
  } else {
    dbStatus.textContent = 'Помилка завантаження бази'
    dbStatus.classList.remove('loaded')
  }
}

/**
 * Запуск процесу порівняння імен
 * @param {string[]} displayedNames - Масив відображуваних імен
 * @param {Object} realNameMap - Карта відповідності реальних імен до імен Zoom
 * @returns {Object} Об'єкт з результатами порівняння
 */
export function compareNames(displayedNames, realNameMap) {
  // Скидаємо поточний стан
  matchedNames = {}
  unrecognizedNames.clear()
  
  // Запускаємо процес співпадіння імен
  const results = matchNames(
    displayedNames, 
    realNameMap, 
    nameDatabase, 
    manualAssignments,
    unrecognizedNames
  )
  
  // Оновлюємо глобальні змінні після співпадіння
  matchedNames = results.matchedNames
  
  return matchedNames
}

/**
 * Отримати поточні співпадіння
 * @returns {Object} Об'єкт співпадінь
 */
export function getMatchedNames () {
  return matchedNames
}

/**
 * Отримати список нерозпізнаних імен
 * @returns {Array} Масив нерозпізнаних імен
 */
export function getUnrecognizedNames () {
  return [...unrecognizedNames]
}

/**
 * Отримати поточну базу імен
 * @returns {Object} Об'єкт бази імен
 */
export function getNameDatabase () {
  return nameDatabase
}

/**
 * Отримати повну інформацію про учасника з бази
 * @param {string} name - Ім'я учасника з чату
 * @param {Object} realNameMap - Карта реальних імен
 * @returns {Object} Об'єкт з інформацією про учасника
 */
export function getParticipantInfo (name, realNameMap) {
  const info = {
    id: '?',
    surname: '',
    firstname: '',
    nickname: name,
    foundInDb: false,
    matchType: 'not-found',
    alternativeMatches: [],
    autoMatched: false
  }

  // Якщо знайшли співпадіння в базі
  if (matchedNames[name] && matchedNames[name] !== 'not-in-db') {
    info.id = matchedNames[name]
    info.foundInDb = true

    // Отримуємо додаткову інформацію про тип співпадіння
    const matchInfo = matchedNames[name + '_matchInfo'] || {}
    info.matchType = matchInfo.matchType || 'found'

    // Додаємо інформацію про автоматичне співпадіння
    if (matchInfo.autoMatched) {
      info.autoMatched = true
    }

    // Додаємо альтернативні співпадіння, якщо є
    if (matchInfo.allMatches && matchInfo.allMatches.length > 1) {
      info.alternativeMatches = matchInfo.allMatches.slice(1)
    }

    // Шукаємо ім'я в базі даних за ID
    const dbName =
      matchInfo.dbName ||
      Object.keys(nameDatabase).find(key => nameDatabase[key] === info.id)

    if (dbName) {
      const nameParts = splitName(dbName)

      // Визначаємо, який порядок використовувати (прямий чи зворотний)
      if (matchInfo.reversed) {
        // Якщо співпадіння було зі зворотним порядком (Ім'я Прізвище)
        if (nameParts.standard) {
          info.surname = nameParts.standard.surname
          info.firstname = nameParts.standard.firstname
        }
      } else {
        // Стандартний порядок (Прізвище Ім'я)
        if (nameParts.standard) {
          info.surname = nameParts.standard.surname
          info.firstname = nameParts.standard.firstname
        }
      }

      // Якщо в базі тільки одне слово
      if (nameParts.onlyOneWord) {
        if (info.matchType && info.matchType.includes('surname')) {
          info.surname = nameParts.word
        } else if (info.matchType && info.matchType.includes('firstname')) {
          info.firstname = nameParts.word
        } else {
          // За замовчуванням вважаємо прізвищем
          info.surname = nameParts.word
        }
      }
    }

    // Якщо це реальне ім'я (з тегу rnm:)
    if (realNameMap[name]) {
      info.nickname = name
      if (info.matchType !== 'real-name-tag') {
        info.matchType += ' real-name-tag'
      }
    }
  } else {
    // Не знайдено в базі
    if (realNameMap[name]) {
      const nameParts = splitName(realNameMap[name])
      if (nameParts.standard) {
        info.surname = nameParts.standard.surname
        info.firstname = nameParts.standard.firstname
      } else if (nameParts.onlyOneWord) {
        // Якщо тільки одне слово, вважаємо його прізвищем
        info.surname = nameParts.word
      }
      info.nickname = name
      info.matchType = 'real-name-tag'
    }
  }

  return info
}

/**
 * Вручну встановити співпадіння імені з бази
 * @param {string} name - Ім'я учасника з чату
 * @param {string} dbNameOrId - Ім'я з бази або ID запису
 * @returns {boolean} Успішність операції
 */
export function setManualMatch (name, dbNameOrId) {
  if (!name) return false

  // Шукаємо ID, якщо передано ім'я з бази
  let id = dbNameOrId
  if (nameDatabase[dbNameOrId]) {
    id = nameDatabase[dbNameOrId]
  }

  // Перевіряємо, чи існує такий ID в базі
  const existsInDb = Object.values(nameDatabase).includes(id)
  if (!existsInDb) return false

  // Зберігаємо ручне призначення
  manualAssignments[name] = id

  // Зберігаємо співпадіння
  matchedNames[name] = id
  matchedNames[name + '_matchInfo'] = {
    matchType: 'manual-match',
    quality: 100,
    dbName: Object.keys(nameDatabase).find(key => nameDatabase[key] === id)
  }

  // Видаляємо з нерозпізнаних, якщо було там
  unrecognizedNames.delete(name)

  // Показуємо сповіщення про успішне призначення
  showNotification('Ручне призначення встановлено успішно!', 'success')

  return true
}

/**
 * Вибрати альтернативне співпадіння з наявних
 * @param {string} name - Ім'я учасника з чату
 * @param {number} altIndex - Індекс альтернативного співпадіння
 * @returns {boolean} Успішність операції
 */
export function selectAlternativeMatch (name, altIndex) {
  if (
    !name ||
    !matchedNames[name + '_matchInfo'] ||
    !matchedNames[name + '_matchInfo'].allMatches
  )
    return false

  const allMatches = matchedNames[name + '_matchInfo'].allMatches
  if (altIndex < 0 || altIndex >= allMatches.length) return false

  const selectedMatch = allMatches[altIndex]

  matchedNames[name] = selectedMatch.id
  matchedNames[name + '_matchInfo'] = {
    matchType: selectedMatch.matchType + '-selected',
    quality: selectedMatch.quality,
    reversed: selectedMatch.reversed || false,
    dbName: selectedMatch.dbName,
    allMatches: allMatches // Зберігаємо всі альтернативи
  }

  // Видаляємо з нерозпізнаних, якщо було там
  unrecognizedNames.delete(name)

  // Показуємо сповіщення
  showNotification('Альтернативне співпадіння вибрано!', 'success')

  return true
}

// Експортуємо функції з інших модулів для зворотної сумісності
export { 
  findBestMatches, 
  getRecommendations 
} from './name-recommendation.js'
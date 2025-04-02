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
    console.log(`Базу імен завантажено: ${validEntries} записів`)
  } else {
    dbStatus.textContent = 'Помилка завантаження бази'
    dbStatus.classList.remove('loaded')
    console.log("Помилка завантаження бази імен")
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
  unrecognizedNames.clear() // Важливо очистити перед заповненням
  
  console.log(`Порівнюємо ${displayedNames.length} імен з базою даних...`)
  
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
  
  // Додаємо додаткову перевірку, щоб переконатися що unrecognizedNames заповнено правильно
  // Перевіряємо всі імена, і якщо їх немає в базі, додаємо в unrecognizedNames
  displayedNames.forEach(name => {
    if (matchedNames[name] === 'not-in-db') {
      unrecognizedNames.add(name)
    }
  })
  
  console.log(`Порівняння завершено: ${unrecognizedNames.size} імен не знайдено в базі`)
  
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
  const namesArray = [...unrecognizedNames];
  console.log(`getUnrecognizedNames: Повертає ${namesArray.length} нерозпізнаних імен`);
  return namesArray;
}

/**
 * Отримати поточну базу імен
 * @returns {Object} Об'єкт бази імен
 */
export function getNameDatabase () {
  console.log(`getNameDatabase: Повертає базу з ${Object.keys(nameDatabase).length} записів`);
  return nameDatabase;
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
  console.log(`Встановлено ручне призначення для ${name} -> ${id}`)

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
  console.log(`Вибрано альтернативне співпадіння для ${name}`)

  return true
}

/**
 * Отримати рекомендації для нерозпізнаних імен
 * @param {Array|Set} unrecognizedNames - Список нерозпізнаних імен
 * @param {Object} nameDatabase - База імен
 * @param {Object} matchedNames - Співпадіння, що вже знайдені
 * @returns {Object} Об'єкт з рекомендаціями у форматі {name: [{id, dbName, similarity}, ...], ...}
 */
export function getRecommendations(unrecognizedNames = [], nameDatabase = {}, matchedNames = {}) {
  const recommendations = {};
  
  // Переконаємося, що працюємо з масивом
  const namesArray = Array.isArray(unrecognizedNames) 
    ? unrecognizedNames 
    : [...unrecognizedNames];
  
  console.log(`getRecommendations отримав ${namesArray.length} імен для пошуку рекомендацій`);
  console.log(`База імен має ${Object.keys(nameDatabase).length} записів`);

  // Для кожного нерозпізнаного імені шукаємо рекомендації
  let recommendationsCount = 0;
  
  namesArray.forEach(name => {
    // Отримуємо інформацію про співпадіння
    const matchInfo = matchedNames[name + '_matchInfo'] || {};
    
    // Якщо це неоднозначне ім'я (ambiguous-name), використовуємо вже знайдені варіанти
    if (matchInfo.matchType === 'ambiguous-name' && matchInfo.allMatches) {
      // Конвертуємо allMatches у формат рекомендацій
      const allMatchesArray = matchInfo.allMatches
        .filter(match => match && match.id) // Фільтруємо неповні співпадіння
        .map(match => ({
          id: match.id,
          dbName: match.dbName,
          similarity: match.quality ? match.quality / 100 : 0.7
        }));
      
      // Перевіряємо, чи є дійсні співпадіння
      if (allMatchesArray.length > 0) {
        recommendations[name] = allMatchesArray;
        recommendationsCount++;
      }
    } else {
      // Інакше шукаємо найкращі співпадіння - використовуємо низький поріг для збільшення кількості співпадінь
      const bestMatches = findBestMatches(name, 3, nameDatabase, matchedNames);
      
      // Зберігаємо рекомендації лише якщо вони мають прийнятну схожість і є непустими
      if (bestMatches && bestMatches.length > 0) {
        recommendations[name] = bestMatches;
        recommendationsCount++;
      }
    }
  });
  
  console.log(`Знайдено рекомендації для ${recommendationsCount} імен`);

  return recommendations;
}

/**
 * Знайти найкращі співпадіння для імені
 * @param {string} name - Ім'я для пошуку
 * @param {number} limit - Максимальна кількість співпадінь
 * @param {Object} nameDatabase - База імен для пошуку
 * @param {Object} matchedNames - Співпадіння, що вже знайдені
 * @returns {Array} Масив об'єктів з інформацією про співпадіння
 */
export function findBestMatches(name, limit = 3, nameDatabase = {}, matchedNames = {}) {
  const matches = [];
  
  // Якщо ім'я порожнє або бази немає, повертаємо пустий масив
  if (!name || !nameDatabase || Object.keys(nameDatabase).length === 0) {
    console.log(`findBestMatches: Немає бази для пошуку або ім'я пусте: ${name}`);
    return matches;
  }

  // Збираємо всі використані ID з matchedNames
  const usedIds = new Set();
  Object.entries(matchedNames).forEach(([key, id]) => {
    if (id !== 'not-in-db' && !key.endsWith('_matchInfo')) {
      usedIds.add(id);
    }
  });
  
  // Обчислюємо різні варіанти транслітерації для імені
  const nameVariants = [
    name, 
    transliterateToLatin(name), 
    transliterateToCyrillic(name)
  ].filter(Boolean); // Видаляємо null/undefined значення

  // Перебираємо всі імена в базі
  for (const [dbName, dbId] of Object.entries(nameDatabase)) {
    // Пропускаємо вже використані ID
    if (usedIds.has(dbId)) {
      continue;
    }

    // Обчислюємо варіанти транслітерації для імені з бази
    const dbNameVariants = [
      dbName,
      transliterateToLatin(dbName),
      transliterateToCyrillic(dbName)
    ].filter(Boolean);

    // Обчислюємо найкращу схожість між всіма варіантами
    let bestSimilarity = 0;

    for (const nameVar of nameVariants) {
      for (const dbNameVar of dbNameVariants) {
        const similarity = getSimilarity(nameVar, dbNameVar);
        if (similarity > bestSimilarity) {
          bestSimilarity = similarity;
        }
      }
    }

    // Знижуємо поріг схожості для отримання більшої кількості рекомендацій
    // Було 0.5, тепер 0.3
    if (bestSimilarity > 0.3) {
      matches.push({
        id: dbId,
        dbName,
        similarity: bestSimilarity
      });
    }
  }

  // Сортуємо за схожістю і обмежуємо кількість
  const sortedMatches = matches.sort((a, b) => b.similarity - a.similarity).slice(0, limit);
  
  return sortedMatches;
}

// Експортуємо функції з інших модулів для зворотної сумісності
import { 
  findAllPossibleMatches, 
  hasAmbiguousNameMatch,
  tryAutoMatchUnrecognized
} from './name-recommendation.js'

import {
  transliterateToLatin,
  transliterateToCyrillic,
  areNamesTransliteratedMatches
} from './transliteration.js'

import { getSimilarity } from './name-utils.js'
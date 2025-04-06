import { 
  transliterateToLatin,
  transliterateToCyrillic,
  areNamesTransliteratedMatches
} from './transliteration.js';
import {
  getStandardNameForm,
  isVariantOf,
  getAllPossibleStandardNames
} from './name-variants.js';
import {
  fuzzyMatch,
  splitName
} from './name-utils.js';
import { findAllPossibleMatches, hasAmbiguousNameMatch } from './name-recommendation.js';
import { tryAutoMatchUnrecognized } from './name-recommendation.js';

  /**
   * Порівняння імен з базою даних з покращеним алгоритмом
   * @param {string[]} displayedNames - Масив відображуваних імен
   * @param {Object} realNameMap - Карта відповідності реальних імен до імен Zoom
   * @param {Object} nameDatabase - База імен для порівняння
   * @param {Object} manualAssignments - Ручні призначення
   * @param {Set} unrecognizedNames - Множина нерозпізнаних імен
   * @returns {Object} Об'єкт з результатами порівняння
   */
  export function matchNames(
    displayedNames,
    realNameMap,
    nameDatabase,
    manualAssignments = {},
    unrecognizedNames = new Set()
  ) {
    const matchedNames = {} // Зберігаємо результати співпадінь
  
    // Перебираємо всі відображувані імена
    displayedNames.forEach(name => {
      // Зберігаємо потенційні співпадіння
      let potentialMatches = []
  
      // Перевіряємо ручні призначення
      if (manualAssignments[name]) {
        matchedNames[name] = manualAssignments[name]
        matchedNames[name + '_matchInfo'] = {
          matchType: 'manual-assignment',
          quality: 100
        }
        return // Далі не шукаємо
      }
  
      // Перевіряємо, чи це однослівний нікнейм з кількома можливими співпадіннями
      if (hasAmbiguousNameMatch(name, nameDatabase)) {
        // Якщо так, позначаємо як "не знайдено в базі"
        matchedNames[name] = 'not-in-db'
        matchedNames[name + '_matchInfo'] = {
          matchType: 'ambiguous-name',
          quality: 0,
          allMatches: findAllPossibleMatches(name, nameDatabase)
        }
        // Додаємо до списку нерозпізнаних імен
        unrecognizedNames.add(name)
        return // Далі не шукаємо
      }
  
      // 1. Перевірка точного співпадіння
      if (nameDatabase[name]) {
        matchedNames[name] = nameDatabase[name]
        matchedNames[name + '_matchInfo'] = {
          matchType: 'exact-match',
          quality: 100
        }
        return // Далі не шукаємо
      }
  
      // 2. Перевірка реального імені з тегу rnm:
      if (realNameMap[name] && nameDatabase[realNameMap[name]]) {
        matchedNames[name] = nameDatabase[realNameMap[name]]
        matchedNames[name + '_matchInfo'] = {
          matchType: 'real-name-tag',
          quality: 99
        }
        return // Далі не шукаємо
      }
  
      // 3. Аналіз імені з чату
      let chatNameToCheck = realNameMap[name] || name
      const chatNameParts = splitName(chatNameToCheck)
  
      // 4. Перебираємо базу імен і шукаємо схожі
      for (const dbName in nameDatabase) {
        const dbNameParts = splitName(dbName)
  
        // 4.1 Перевірка на однаковий порядок (Прізвище Ім'я)
        if (chatNameParts.standard && dbNameParts.standard) {
          // Точне співпадіння
          if (
            chatNameParts.standard.surname.toLowerCase() ===
              dbNameParts.standard.surname.toLowerCase() &&
            chatNameParts.standard.firstname.toLowerCase() ===
              dbNameParts.standard.firstname.toLowerCase()
          ) {
            potentialMatches.push({
              dbName,
              id: nameDatabase[dbName],
              quality: 98,
              matchType: 'standard-order-exact'
            })
            continue
          }
  
          // Точне співпадіння прізвища, нечітке ім'я
          if (
            chatNameParts.standard.surname.toLowerCase() ===
              dbNameParts.standard.surname.toLowerCase() &&
            fuzzyMatch(
              chatNameParts.standard.firstname,
              dbNameParts.standard.firstname,
              0.25
            )
          ) {
            potentialMatches.push({
              dbName,
              id: nameDatabase[dbName],
              quality: 90,
              matchType: 'surname-exact-firstname-fuzzy'
            })
            continue
          }
  
          // Співпадіння через транслітерацію (однаковий порядок)
          if (
            areNamesTransliteratedMatches(
              chatNameParts.standard.surname,
              dbNameParts.standard.surname,
              0.75
            ) &&
            areNamesTransliteratedMatches(
              chatNameParts.standard.firstname,
              dbNameParts.standard.firstname,
              0.75
            )
          ) {
            potentialMatches.push({
              dbName,
              id: nameDatabase[dbName],
              quality: 85,
              matchType: 'standard-order-translit'
            })
            continue
          }
  
          // Перевірка варіантів імен (для зменшувальних форм, наприклад "Саша" -> "Олександр")
          if (
            chatNameParts.standard.surname.toLowerCase() ===
              dbNameParts.standard.surname.toLowerCase() &&
            isVariantOf(
              chatNameParts.standard.firstname,
              dbNameParts.standard.firstname
            )
          ) {
            potentialMatches.push({
              dbName,
              id: nameDatabase[dbName],
              quality: 88,
              matchType: 'standard-order-name-variant'
            })
            continue
          }
        }
  
        // 4.2 Перевірка на зворотний порядок (Ім'я Прізвище)
        if (chatNameParts.reversed && dbNameParts.standard) {
          // Зворотний порядок, точне співпадіння
          if (
            chatNameParts.reversed.surname.toLowerCase() ===
              dbNameParts.standard.surname.toLowerCase() &&
            chatNameParts.reversed.firstname.toLowerCase() ===
              dbNameParts.standard.firstname.toLowerCase()
          ) {
            potentialMatches.push({
              dbName,
              id: nameDatabase[dbName],
              quality: 92,
              matchType: 'reversed-order-exact',
              reversed: true
            })
            continue
          }
  
          // Зворотний порядок, точне прізвище, нечітке ім'я
          if (
            chatNameParts.reversed.surname.toLowerCase() ===
              dbNameParts.standard.surname.toLowerCase() &&
            fuzzyMatch(
              chatNameParts.reversed.firstname,
              dbNameParts.standard.firstname,
              0.25
            )
          ) {
            potentialMatches.push({
              dbName,
              id: nameDatabase[dbName],
              quality: 85,
              matchType: 'reversed-surname-exact-firstname-fuzzy',
              reversed: true
            })
            continue
          }
  
          // Зворотний порядок, співпадіння через транслітерацію
          if (
            areNamesTransliteratedMatches(
              chatNameParts.reversed.surname,
              dbNameParts.standard.surname,
              0.75
            ) &&
            areNamesTransliteratedMatches(
              chatNameParts.reversed.firstname,
              dbNameParts.standard.firstname,
              0.75
            )
          ) {
            potentialMatches.push({
              dbName,
              id: nameDatabase[dbName],
              quality: 80,
              matchType: 'reversed-order-translit',
              reversed: true
            })
            continue
          }
  
          // Зворотний порядок, перевірка варіантів імен
          if (
            chatNameParts.reversed.surname.toLowerCase() ===
              dbNameParts.standard.surname.toLowerCase() &&
            isVariantOf(
              chatNameParts.reversed.firstname,
              dbNameParts.standard.firstname
            )
          ) {
            potentialMatches.push({
              dbName,
              id: nameDatabase[dbName],
              quality: 82,
              matchType: 'reversed-order-name-variant',
              reversed: true
            })
            continue
          }
        }
  
        // 4.3 Для випадків, коли в чаті тільки одне слово
        if (chatNameParts.onlyOneWord) {
          // Співпадіння однослівного імені з прізвищем
          if (
            areNamesTransliteratedMatches(
              chatNameParts.word,
              dbNameParts.standard.surname,
              0.75
            )
          ) {
            potentialMatches.push({
              dbName,
              id: nameDatabase[dbName],
              quality: 70,
              matchType: 'single-word-surname-match'
            })
            continue
          }
  
          // Співпадіння однослівного імені з ім'ям
          if (
            areNamesTransliteratedMatches(
              chatNameParts.word,
              dbNameParts.standard.firstname,
              0.75
            )
          ) {
            potentialMatches.push({
              dbName,
              id: nameDatabase[dbName],
              quality: 65,
              matchType: 'single-word-firstname-match'
            })
            continue
          }
  
          // Перевірка варіантів імен для однослівного імені
          // Перевіряємо, чи є слово зменшувальною формою імені в базі
          const possibleFullNames = getAllPossibleStandardNames(
            chatNameParts.word
          )
          for (const possibleName of possibleFullNames) {
            if (possibleName === dbNameParts.standard.firstname.toLowerCase()) {
              potentialMatches.push({
                dbName,
                id: nameDatabase[dbName],
                quality: 75,
                matchType: 'single-word-variant-match'
              })
              break
            }
          }
        }
  
        // 4.4 Загальне нечітке співпадіння через повне ім'я
        if (areNamesTransliteratedMatches(chatNameToCheck, dbName, 0.7)) {
          potentialMatches.push({
            dbName,
            id: nameDatabase[dbName],
            quality: 60,
            matchType: 'full-name-translit'
          })
        }
      }
  
      // 5. Сортуємо потенційні співпадіння за якістю (від кращих до гірших)
      potentialMatches.sort((a, b) => b.quality - a.quality)

      // 6. Беремо найкраще співпадіння, якщо є
      if (potentialMatches.length > 0) {
        // Перевіряємо, чи є більше одного потенційного співпадіння
        if (potentialMatches.length >= 2) {
          // Якщо є два або більше співпадінь, відмічаємо як "не знайдено в базі"
          matchedNames[name] = 'not-in-db'
          matchedNames[name + '_matchInfo'] = {
            matchType: 'multiple-matches',
            quality: 0,
            allMatches: potentialMatches.slice(0, 3) // Зберігаємо до 3-х найкращих співпадінь
          }
          // Додаємо до списку нерозпізнаних імен
          unrecognizedNames.add(name)
        } else {
          // Якщо є лише одне співпадіння, використовуємо його
          const bestMatch = potentialMatches[0]
          matchedNames[name] = bestMatch.id
          matchedNames[name + '_matchInfo'] = {
            matchType: bestMatch.matchType,
            quality: bestMatch.quality,
            reversed: bestMatch.reversed || false,
            dbName: bestMatch.dbName,
            allMatches: potentialMatches.slice(0, 3) // Зберігаємо до 3-х найкращих співпадінь
          }
        }
      } else {
        // Не знайдено співпадінь
        matchedNames[name] = 'not-in-db'
        matchedNames[name + '_matchInfo'] = {
          matchType: 'not-found',
          quality: 0
        }
        // Додаємо до списку нерозпізнаних імен
        unrecognizedNames.add(name)
      }
    })
  
    // Спроба автоматично знайти найкращі співпадіння для нерозпізнаних імен
    tryAutoMatchUnrecognized(matchedNames, unrecognizedNames, nameDatabase);
  
    return { matchedNames, unrecognizedNames };
  }
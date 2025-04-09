import {
  transliterateToLatin,
  transliterateToCyrillic,
  areNamesTransliteratedMatches
} from './transliteration.js'
import { areStringSimilar, getSimilarity } from './name-utils.js'
import { processCombinedName } from './advanced-name-processing.js'

/**
 * Перевірка, чи існує кілька можливих співпадінь для імені
 * @param {string} name - Ім'я для перевірки (нікнейм)
 * @param {Object} nameDatabase - База імен для перевірки
 * @returns {Array} Масив знайдених співпадінь з бази даних
 */
export function findAllPossibleMatches (name, nameDatabase) {
  const possibleMatches = []

  // Якщо ім'я порожнє, повертаємо пустий масив
  if (!name || name.trim() === '') return possibleMatches

  // Перевіряємо, чи це однослівне ім'я
  const isOneWordName =
    name.split(/\s+/).length === 1 && /^[A-Za-zА-Яа-яІіЇїЄєҐґ']+$/.test(name)

  // Переводимо ім'я в нижній регістр для пошуку
  const nameLower = name.toLowerCase()

  // Перевіряємо, чи це можливе склеєне ім'я
  if (isOneWordName && name.length >= 6) {
    const possibleSplits = processCombinedName(name, nameDatabase)
    if (possibleSplits.length > 0) {
      // Додаємо результати розбиття як можливі співпадіння
      possibleSplits.forEach(split => {
        possibleMatches.push({
          dbName: split.dbFullName,
          id: split.id,
          part: 'split-name-' + split.combined,
          quality: Math.round(split.quality * 100),
          splitName: true
        })
      })
      
      // Якщо знайдено якісні розбиття, повертаємо їх
      if (possibleMatches.length > 0 && possibleMatches[0].quality > 85) {
        console.log(`Знайдено ${possibleMatches.length} співпадінь для склеєного імені ${name}`)
        return possibleMatches
      }
    }
  }

  // Отримуємо можливі кириличні варіанти імені
  let nameVariants = []

  // Якщо ім'я містить латиницю
  if (/[a-zA-Z]/.test(name)) {
    // Отримуємо основний кириличний варіант
    try {
      const mainCyrillicVariant = transliterateToCyrillic(name)
      if (mainCyrillicVariant) {
        nameVariants.push(mainCyrillicVariant.toLowerCase())
      }

      // Додаємо точні варіації для поширених імен (без використання нечіткої транслітерації)
      if (
        nameLower === 'serhiy' ||
        nameLower === 'sergiy' ||
        nameLower === 'serge' ||
        nameLower === 'sergey'
      ) {
        nameVariants.push('сергій')
      } else if (nameLower === 'taras') {
        nameVariants.push('тарас')
      } else if (
        nameLower.includes('oleksandr') ||
        nameLower.includes('alexander') ||
        nameLower.includes('alex')
      ) {
        nameVariants.push('олександр')
      } else if (
        nameLower.includes('liza') ||
        nameLower.includes('lisa') ||
        nameLower.includes('elizaveta')
      ) {
        nameVariants.push('єлизавета')
        nameVariants.push('елизавета')
        nameVariants.push('лізавета')
      }
    } catch (e) {
      console.log(`Помилка транслітерації для ${name}:`, e)
    }
  } else {
    // Якщо ім'я вже написане кирилицею, використовуємо його як є
    nameVariants.push(nameLower)
  }

  // Додаємо оригінальне ім'я також
  if (!nameVariants.includes(nameLower)) {
    nameVariants.push(nameLower)
  }

  console.log(`Точні варіанти імені для ${name}:`, nameVariants)

  // Масив для підрахунку співпадінь по іменах
  const nameMatchCounts = {}

  // Спочатку шукаємо точні співпадіння (для підвищення точності)
  for (const dbName in nameDatabase) {
    const dbNameLower = dbName.toLowerCase()
    const dbNameParts = dbNameLower.split(' ')

    // Перевіряємо, чи є пряме співпадіння з повним іменем або його частинами
    for (const variant of nameVariants) {
      // Повне співпадіння з іменем у базі
      if (dbNameLower === variant) {
        possibleMatches.push({
          dbName: dbName,
          id: nameDatabase[dbName],
          part: 'full-name-exact',
          quality: 100
        })
        continue
      }

      // Перевіряємо, чи є точне співпадіння з частиною імені
      for (const part of dbNameParts) {
        if (part === variant) {
          // Якщо знайдено співпадіння з іменем, додаємо лічильник
          if (dbNameParts.indexOf(part) !== 0) {
            // Це ім'я, а не прізвище
            const firstname = part
            if (!nameMatchCounts[firstname]) {
              nameMatchCounts[firstname] = 0
            }
            nameMatchCounts[firstname]++
          }

          possibleMatches.push({
            dbName: dbName,
            id: nameDatabase[dbName],
            part:
              dbNameParts.indexOf(part) === 0
                ? 'surname-exact'
                : 'firstname-exact',
            quality: 90
          })
        }
      }
    }
  }

  // Додаткова перевірка для однослівних імен
  if (isOneWordName) {
    // Перевіряємо, чи є співпадіння за іменем з кількома записами
    for (const [firstname, count] of Object.entries(nameMatchCounts)) {
      if (count > 1) {
        console.log(
          `Для імені "${name}" знайдено ${count} записів з ім'ям "${firstname}"`
        )
      }
    }
  }

  // Якщо знайдено точні співпадіння, не шукаємо приблизні
  if (possibleMatches.length > 0) {
    console.log(
      `Знайдено ${possibleMatches.length} точних співпадінь для ${name}`
    )
    return possibleMatches
  }

  // Шукаємо приблизні співпадіння по частинам імені
  for (const dbName in nameDatabase) {
    const dbNameLower = dbName.toLowerCase()
    const dbNameParts = dbNameLower.split(' ')

    // Перевіряємо схожість по частинам
    for (const variant of nameVariants) {
      for (const part of dbNameParts) {
        // Використовуємо вищий поріг схожості для зменшення хибних спрацювань
        const similarity = getSimilarity(variant, part)

        if (similarity > 0.9) {
          // Підвищуємо поріг з 0.85 до 0.9
          // Якщо знайдено співпадіння з іменем, додаємо лічильник
          if (dbNameParts.indexOf(part) !== 0) {
            // Це ім'я, а не прізвище
            const firstname = part
            if (!nameMatchCounts[firstname]) {
              nameMatchCounts[firstname] = 0
            }
            nameMatchCounts[firstname]++
          }

          possibleMatches.push({
            dbName: dbName,
            id: nameDatabase[dbName],
            part:
              dbNameParts.indexOf(part) === 0
                ? 'surname-similar'
                : 'firstname-similar',
            similarity: similarity,
            quality: Math.round(similarity * 90)
          })
        }
      }
    }
  }

  // Перевіряємо схожість за повним іменем (нижчий пріоритет)
  if (possibleMatches.length < 2) {
    // Шукаємо за повним іменем, тільки якщо мало співпадінь за частинами
    for (const dbName in nameDatabase) {
      const dbNameLower = dbName.toLowerCase()

      for (const variant of nameVariants) {
        // Використовуємо високий поріг для повного імені
        const similarity = getSimilarity(variant, dbNameLower)

        // Додаємо тільки достатньо схожі варіанти
        if (
          similarity > 0.75 &&
          !possibleMatches.some(match => match.dbName === dbName)
        ) {
          possibleMatches.push({
            dbName: dbName,
            id: nameDatabase[dbName],
            part: 'full-name',
            similarity: similarity,
            quality: Math.round(similarity * 80)
          })
        }
      }
    }
  }

  // Додаткова перевірка для однослівних імен
  if (isOneWordName) {
    // Додаємо всі співпадіння з іменами для однослівних імен
    // Наприклад, для "Serhiy" додаємо всіх людей з іменем "Сергій"
    for (const dbName in nameDatabase) {
      const dbNameParts = dbName.toLowerCase().split(' ')
      const firstname = dbNameParts.length > 1 ? dbNameParts[1] : ''

      // Перевіряємо, чи це ім'я вже є в наших варіантах
      if (
        firstname &&
        nameVariants.includes(firstname) &&
        !possibleMatches.some(match => match.dbName === dbName)
      ) {
        possibleMatches.push({
          dbName: dbName,
          id: nameDatabase[dbName],
          part: 'firstname-match',
          quality: 85
        })
      }
    }
  }

  // Сортуємо за якістю співпадіння
  possibleMatches.sort((a, b) => {
    // Пріоритет точним співпадінням
    if (a.part.includes('exact') && !b.part.includes('exact')) return -1
    if (!a.part.includes('exact') && b.part.includes('exact')) return 1

    // Для приблизних співпадінь сортуємо за якістю
    const qualityA = a.quality || 0
    const qualityB = b.quality || 0
    return qualityB - qualityA
  })

  // Видаляємо дублікати за ID
  const uniqueMatches = []
  const ids = new Set()
  for (const match of possibleMatches) {
    if (!ids.has(match.id)) {
      uniqueMatches.push(match)
      ids.add(match.id)
    }
  }

  console.log(
    `Знайдено ${uniqueMatches.length} можливих співпадінь для ${name}`
  )
  return uniqueMatches.slice(0, 4) // Обмежуємо до 4 найкращих співпадінь
}

/**
 * Перевірка, чи співпадає однослівний нікнейм з кількома записами в базі
 * @param {string} name - Ім'я для перевірки (нікнейм)
 * @param {Object} nameDatabase - База імен для перевірки
 * @returns {boolean} true, якщо є кілька можливих співпадінь
 */
export function hasAmbiguousNameMatch(name, nameDatabase) {
  // Перевіряємо, чи це однослівний нікнейм
  const isOneWordName = name.split(/\s+/).length === 1 && 
                         /^[A-Za-zА-Яа-яІіЇїЄєҐґ']+$/.test(name);
  
  if (!isOneWordName) return false;
  
  // НОВА ФУНКЦІОНАЛЬНІСТЬ: Перевіряємо, чи може це бути склеєне ім'я
  const possibleSplits = processCombinedName(name, nameDatabase);
  
  // Якщо знайдено однозначне високоякісне співпадіння склеєного імені, це не неоднозначне ім'я
  if (possibleSplits.length === 1 && possibleSplits[0].quality > 0.9) {
    console.log(`Знайдено однозначне співпадіння для склеєного імені ${name} -> ${possibleSplits[0].dbFullName}`);
    return false;
  }
  
  // Якщо знайдено кілька можливих варіантів, це неоднозначне ім'я
  if (possibleSplits.length > 1) {
    console.log(`Знайдено ${possibleSplits.length} варіантів розбиття для склеєного імені ${name}`);
    return true;
  }
  
  // Знаходимо всі можливі варіанти імені (кирилицею і латиницею)
  const nameVariants = [];
  const nameLower = name.toLowerCase();
  
  // Додаємо оригінальне ім'я
  nameVariants.push(nameLower);
  
  // Якщо ім'я містить латиницю, додаємо кириличний варіант
  if (/[a-zA-Z]/.test(name)) {
    try {
      const cyrillicVariant = transliterateToCyrillic(name);
      if (cyrillicVariant) nameVariants.push(cyrillicVariant.toLowerCase());
      
      // Додаємо спеціальні варіанти для поширених імен
      if (nameLower === 'serhiy' || nameLower === 'sergiy') nameVariants.push('сергій');
      if (nameLower === 'taras') nameVariants.push('тарас');
    } catch (e) {
      console.log(`Помилка транслітерації: ${e}`);
    }
  } else if (/[А-Яа-яІіЇїЄєҐґ']/.test(name)) {
    // Якщо ім'я кирилицею, додаємо латинську транслітерацію
    try {
      const latinVariant = transliterateToLatin(name);
      if (latinVariant) nameVariants.push(latinVariant.toLowerCase());
    } catch (e) {
      console.log(`Помилка транслітерації: ${e}`);
    }
  }
  
  // Лічильник співпадінь за іменами
  const firstnameMatches = {};
  
  // Перебираємо базу імен і шукаємо співпадіння
  for (const dbName in nameDatabase) {
    const dbNameParts = dbName.toLowerCase().split(' ');
    
    // Якщо в базі тільки одне слово, пропускаємо
    if (dbNameParts.length < 2) continue;
    
    // Перевіряємо, чи є співпадіння з іменем
    const firstname = dbNameParts[1]; // Припускаємо, що друге слово - це ім'я
    
    for (const variant of nameVariants) {
      // Перевіряємо точне співпадіння або схожість
      if (firstname === variant || getSimilarity(firstname, variant) > 0.9) {
        if (!firstnameMatches[firstname]) {
          firstnameMatches[firstname] = [];
        }
        firstnameMatches[firstname].push(dbName);
      }
    }
  }
  
  // Перевіряємо, чи є кілька можливих співпадінь за іменем
  for (const [firstname, matches] of Object.entries(firstnameMatches)) {
    if (matches.length > 1) {
      console.log(`Для "${name}" знайдено ${matches.length} записів з іменем "${firstname}"`);
      return true;
    }
  }
  
  // Знаходимо всі можливі співпадіння
  const matches = findAllPossibleMatches(name, nameDatabase);
  
  // Якщо знайдено більше одного співпадіння, вважаємо ім'я неоднозначним
  return matches.length > 1;
}

/**
 * Спроба автоматично знайти найкращі співпадіння для нерозпізнаних імен
 * використовуючи загальну схожість
 * @param {Object} matchedNames - Об'єкт з інформацією про вже знайдені співпадіння
 * @param {Set} unrecognizedNames - Множина нерозпізнаних імен
 * @param {Object} nameDatabase - База імен для пошуку співпадінь
 */
export function tryAutoMatchUnrecognized (
  matchedNames,
  unrecognizedNames,
  nameDatabase
) {
  // Якщо нема нерозпізнаних імен або бази імен, виходимо
  if (unrecognizedNames.size === 0 || Object.keys(nameDatabase).length === 0) {
    console.log(
      'Немає нерозпізнаних імен або бази для автоматичного співпадіння'
    )
    return
  }

  console.log(
    `Спроба автоматичного співпадіння для ${unrecognizedNames.size} нерозпізнаних імен`
  )

  // Збираємо всі використані ID з matchedNames
  const usedIds = new Set()
  Object.entries(matchedNames).forEach(([key, id]) => {
    if (id !== 'not-in-db' && !key.endsWith('_matchInfo')) {
      usedIds.add(id)
    }
  })

  // Обробляємо кожне нерозпізнане ім'я
  for (const unrecognizedName of unrecognizedNames) {
    // Перевіряємо, чи це однослівне ім'я
    const isOneWordName =
      unrecognizedName.split(/\s+/).length === 1 &&
      /^[A-Za-zА-Яа-яІіЇїЄєҐґ']+$/.test(unrecognizedName)

    if (isOneWordName) {
      // НОВА ФУНКЦІОНАЛЬНІСТЬ: Обробка склеєних імен
      const possibleSplits = processCombinedName(unrecognizedName, nameDatabase);
      
      // Якщо знайдено високоякісне співпадіння, використовуємо його
      if (possibleSplits.length > 0 && possibleSplits[0].quality > 0.85 && !usedIds.has(possibleSplits[0].id)) {
        const bestMatch = possibleSplits[0];
        
        matchedNames[unrecognizedName] = bestMatch.id;
        matchedNames[unrecognizedName + '_matchInfo'] = {
          matchType: 'split-name-match',
          quality: Math.round(bestMatch.quality * 100),
          dbName: bestMatch.dbFullName,
          allMatches: possibleSplits.map(split => ({
            id: split.id,
            dbName: split.dbFullName,
            quality: Math.round(split.quality * 100)
          })),
          autoMatched: true
        };
        
        // Додаємо ID до використаних
        usedIds.add(bestMatch.id);
        
        // Видаляємо з нерозпізнаних
        unrecognizedNames.delete(unrecognizedName);
        console.log(
          `Автоматично знайдено співпадіння для склеєного імені ${unrecognizedName}: ${bestMatch.dbFullName} (${Math.round(bestMatch.quality * 100)}%)`
        );
        
        continue; // Переходимо до наступного імені
      }

      // Якщо імена не склеєні або немає надійного співпадіння для склеєного імені,
      // пропускаємо автоматичне співпадіння для однослівних імен без точного співпадіння
      console.log(
        `Пропускаємо автоматичне співпадіння для однослівного імені: ${unrecognizedName}`
      )
      continue
    }

    // Перевіряємо, чи вже має інформацію про можливі співпадіння
    if (
      matchedNames[unrecognizedName + '_matchInfo'] &&
      (matchedNames[unrecognizedName + '_matchInfo'].matchType ===
        'multiple-matches' ||
        matchedNames[unrecognizedName + '_matchInfo'].matchType ===
          'ambiguous-name')
    ) {
      console.log(
        `Пропускаємо автоматичне співпадіння для імені з кількома варіантами: ${unrecognizedName}`
      )
      continue
    }

    // Шукаємо найкращі співпадіння
    const possibleMatches = findAllPossibleMatches(
      unrecognizedName,
      nameDatabase
    )
      .filter(match => !usedIds.has(match.id)) // Фільтруємо вже використані ID
      .sort((a, b) => (b.quality || 0) - (a.quality || 0)) // Сортуємо за якістю

    // Якщо є кілька можливих співпадінь, пропускаємо автоматичне призначення
    if (possibleMatches.length > 1) {
      console.log(
        `Знайдено ${possibleMatches.length} потенційних співпадінь для ${unrecognizedName}, потрібен ручний вибір`
      )
      continue
    }

    // Якщо є хороші співпадіння, використовуємо найкраще
    if (possibleMatches.length === 1 && possibleMatches[0].quality >= 90) {
      // Висока якість співпадіння
      const bestMatch = possibleMatches[0]
      matchedNames[unrecognizedName] = bestMatch.id
      matchedNames[unrecognizedName + '_matchInfo'] = {
        matchType: 'auto-match',
        quality: bestMatch.quality,
        dbName: bestMatch.dbName,
        allMatches: possibleMatches.slice(0, 3),
        autoMatched: true
      }

      // Додаємо ID до використаних
      usedIds.add(bestMatch.id)

      // Видаляємо з нерозпізнаних
      unrecognizedNames.delete(unrecognizedName)
      console.log(
        `Автоматично знайдено співпадіння для ${unrecognizedName}: ${bestMatch.dbName} (${bestMatch.quality}%)`
      )
    } else {
      console.log(`Не знайдено надійних співпадінь для ${unrecognizedName}`)
    }
  }
}

/**
 * Знайти найкращі співпадіння для імені
 * @param {string} name - Ім'я для пошуку
 * @param {number} limit - Максимальна кількість співпадінь
 * @param {Object} nameDatabase - База імен для пошуку
 * @param {Object} matchedNames - Співпадіння, що вже знайдені
 * @returns {Array} Масив об'єктів з інформацією про співпадіння
 */
export function findBestMatches (
  name,
  limit = 3,
  nameDatabase = {},
  matchedNames = {}
) {
  // Перевіряємо, чи є це склеєне однослівне ім'я
  const isOneWordName = name.split(/\s+/).length === 1 && /^[A-Za-zА-Яа-яІіЇїЄєҐґ']+$/.test(name);
  
  if (isOneWordName && name.length >= 6) {
    // Спробуємо розбити склеєне ім'я
    const possibleSplits = processCombinedName(name, nameDatabase);
    
    // Якщо знайдено високоякісні співпадіння, використовуємо їх
    if (possibleSplits.length > 0) {
      const matchQualityThreshold = 0.7; // 70% мінімальна якість
      
      const goodSplits = possibleSplits
        .filter(split => split.quality >= matchQualityThreshold)
        .map(split => ({
          id: split.id,
          dbName: split.dbFullName,
          similarity: split.quality,
          matchType: 'split-name-match'
        }));
      
      if (goodSplits.length > 0) {
        console.log(`Знайдено ${goodSplits.length} можливих співпадінь для склеєного імені ${name}`);
        
        // Збираємо всі використані ID з matchedNames
        const usedIds = new Set();
        Object.entries(matchedNames).forEach(([key, id]) => {
          if (id !== 'not-in-db' && !key.endsWith('_matchInfo')) {
            usedIds.add(id);
          }
        });
        
        // Фільтруємо вже використані ID
        const availableSplits = goodSplits.filter(match => !usedIds.has(match.id));
        
        return availableSplits.slice(0, limit);
      }
    }
  }

  // Використовуємо покращену функцію для пошуку всіх можливих співпадінь
  const possibleMatches = findAllPossibleMatches(name, nameDatabase)

  // Фільтруємо вже використані ID
  const usedIds = new Set()
  Object.entries(matchedNames).forEach(([key, id]) => {
    if (id !== 'not-in-db' && !key.endsWith('_matchInfo')) {
      usedIds.add(id)
    }
  })

  // Відфільтровуємо вже використані ID та низькоякісні співпадіння
  let availableMatches = possibleMatches
    .filter(match => !usedIds.has(match.id))
    .filter(match => {
      const quality = match.quality || 0
      return quality >= 50 // Показуємо тільки якісні співпадіння (від 50% і вище)
    })

  // Конвертуємо в формат, який очікує функція getRecommendations
  return availableMatches
    .map(match => ({
      id: match.id,
      dbName: match.dbName,
      similarity: match.quality ? match.quality / 100 : match.similarity || 0.7
    }))
    .slice(0, limit)
}

/**
 * Отримати рекомендації для нерозпізнаних імен
 * @param {Array|Set} unrecognizedNames - Список нерозпізнаних імен
 * @param {Object} nameDatabase - База імен
 * @param {Object} matchedNames - Співпадіння, що вже знайдені
 * @returns {Object} Об'єкт з рекомендаціями у форматі {name: [{id, dbName, similarity}, ...], ...}
 */
export function getRecommendations (
  unrecognizedNames = [],
  nameDatabase = {},
  matchedNames = {}
) {
  const recommendations = {}

  // Переконаємося, що працюємо з масивом
  const namesArray = Array.isArray(unrecognizedNames)
    ? unrecognizedNames
    : [...unrecognizedNames]

  console.log(
    `getRecommendations отримав ${namesArray.length} імен:`,
    namesArray
  )
  console.log(`База імен має ${Object.keys(nameDatabase).length} записів`)

  // Для кожного нерозпізнаного імені шукаємо рекомендації
  namesArray.forEach(name => {
    // Отримуємо інформацію про співпадіння
    const matchInfo = matchedNames[name + '_matchInfo'] || {}

    // Якщо це неоднозначне ім'я (ambiguous-name) або є множинні співпадіння (multiple-matches), 
    // використовуємо вже знайдені варіанти
    if (
      (matchInfo.matchType === 'ambiguous-name' ||
       matchInfo.matchType === 'multiple-matches' ||
       matchInfo.matchType === 'split-name-match') &&
      matchInfo.allMatches
    ) {
      // Конвертуємо allMatches у формат рекомендацій
      // Фільтруємо тільки варіанти з високою якістю (від 50%)
      const filteredMatches = matchInfo.allMatches
        .filter(match => (match.quality || 0) >= 50)
        .map(match => ({
          id: match.id,
          dbName: match.dbName,
          similarity: match.quality ? match.quality / 100 : 0.7
        }));

      if (filteredMatches.length > 0) {
        recommendations[name] = filteredMatches;
        console.log(
          `Використано ${filteredMatches.length} якісних варіантів для імені з кількома співпадіннями ${name}`
        );
      } else {
        console.log(
          `Немає якісних варіантів для імені з кількома співпадіннями ${name}`
        );
      }
    } else {
      // Інакше шукаємо найкращі співпадіння з покращеним алгоритмом
      const bestMatches = findBestMatches(name, 3, nameDatabase, matchedNames);

      // Зберігаємо рекомендації лише якщо вони є і мають високу якість
      if (bestMatches && bestMatches.length > 0) {
        recommendations[name] = bestMatches;
        console.log(`Знайдено ${bestMatches.length} рекомендацій для ${name}`);
      } else {
        console.log(`Не знайдено якісних рекомендацій для ${name}`);
      }
    }
  })

  return recommendations
}
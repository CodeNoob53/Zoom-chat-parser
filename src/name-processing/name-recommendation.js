import {
  transliterateToLatin,
  transliterateToCyrillic,
} from './transliteration.js'
import {  getSimilarity } from './name-utils.js'
import { processCombinedName } from './advanced-name-processing.js'
import { getStandardNameForm, getAllPossibleStandardNames, isVariantOf } from './name-variants.js';

/**
 * Перевірка, чи існує кілька можливих співпадінь для імені
 * @param {string} name - Ім'я для перевірки (нікнейм)
 * @param {Object} nameDatabase - База імен для перевірки
 * @returns {Array} Масив знайдених співпадінь з бази даних
 */
export function findAllPossibleMatches(name, nameDatabase) {
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
      
      // Спробуємо отримати стандартну форму імені з словника варіантів
      const standardName = getStandardNameForm(nameLower)
      if (standardName !== nameLower) {
        nameVariants.push(standardName)
      }
      
      // Отримуємо всі можливі стандартні форми для цього варіанту
      const possibleStandardNames = getAllPossibleStandardNames(nameLower)
      if (possibleStandardNames.length > 0) {
        nameVariants.push(...possibleStandardNames)
      }
    } catch (e) {
      console.log(`Помилка транслітерації для ${name}:`, e)
    }
  } else {
    // Якщо ім'я вже написане кирилицею, використовуємо його як є
    nameVariants.push(nameLower)
    
    // Спробуємо отримати стандартну форму імені з словника варіантів
    const standardName = getStandardNameForm(nameLower)
    if (standardName !== nameLower) {
      nameVariants.push(standardName)
    }
  }

  // Додаємо оригінальне ім'я також
  if (!nameVariants.includes(nameLower)) {
    nameVariants.push(nameLower)
  }

  // Видаляємо дублікати
  nameVariants = [...new Set(nameVariants)]

  console.log(`Варіанти імені для ${name}:`, nameVariants)

  // Масив для підрахунку співпадінь по іменах
  const nameMatchCounts = {}
  const exactMatchedNames = new Set()

  // Спочатку шукаємо точні співпадіння по всьому імені або імені (не прізвищу)
  for (const dbName in nameDatabase) {
    const dbNameLower = dbName.toLowerCase()
    const dbNameParts = dbNameLower.split(' ')

    // Перевіряємо, чи є пряме співпадіння з повним іменем або ПЕРШИМ іменем (не прізвищем)
    for (const variant of nameVariants) {
      // Повне співпадіння з іменем у базі
      if (dbNameLower === variant) {
        possibleMatches.push({
          dbName: dbName,
          id: nameDatabase[dbName],
          part: 'full-name-exact',
          quality: 100
        })
        exactMatchedNames.add(dbName)
        continue
      }

      // Співпадіння з іменем (не прізвищем) - зазвичай для однослівних імен
      if (dbNameParts.length > 1 && dbNameParts[1] === variant) {
        // Знайдено точне співпадіння по імені (не прізвищу)
        const firstname = dbNameParts[1]
        if (!nameMatchCounts[firstname]) {
          nameMatchCounts[firstname] = []
        }
        nameMatchCounts[firstname].push({
          dbName: dbName,
          id: nameDatabase[dbName],
          part: 'firstname-exact',
          quality: 95
        })
        continue
      }
    }
  }

  // Додаємо єдине точне співпадіння за іменем, якщо воно одне
  for (const [firstname, matches] of Object.entries(nameMatchCounts)) {
    if (matches.length === 1) {
      const match = matches[0]
      // Додаємо тільки якщо ще не додано точніше співпадіння
      if (!exactMatchedNames.has(match.dbName)) {
        possibleMatches.push(match)
        exactMatchedNames.add(match.dbName)
        console.log(`Додано єдине точне співпадіння для імені "${firstname}": ${match.dbName}`)
      }
    } else if (matches.length > 1) {
      console.log(`Для імені "${name}" знайдено ${matches.length} записів з ім'ям "${firstname}"`)
    }
  }

  // Якщо знайдено точні співпадіння, не шукаємо приблизні
  if (possibleMatches.length > 0) {
    console.log(`Знайдено ${possibleMatches.length} точних співпадінь для ${name}`)
    return possibleMatches
  }

  // Шукаємо приблизні співпадіння по частинам імені, але з урахуванням порядку символів
  for (const dbName in nameDatabase) {
    const dbNameLower = dbName.toLowerCase()
    const dbNameParts = dbNameLower.split(' ')

    // Перевіряємо схожість по частинам з врахуванням порядку символів
    for (const variant of nameVariants) {
      for (const part of dbNameParts) {
        // Перевіряємо чи варіант імені є зменшувальною формою частини імені в базі
        if (isVariantOf(variant, part)) {
          // Визначаємо тип співпадіння
          const matchType = dbNameParts.indexOf(part) === 0 ? 'surname-variant' : 'firstname-variant'
          
          // Додаємо до рекомендацій з високою якістю
          possibleMatches.push({
            dbName: dbName,
            id: nameDatabase[dbName],
            part: matchType,
            quality: 90
          })
          continue;
        }
      
        // Перевіряємо не лише схожість, але й нормальний порядок символів
        const similarity = sequenceSensitiveSimilarity(variant, part)

        // Збільшуємо поріг для вищої точності і перевіряємо мінімальну довжину
        if (similarity > 0.85 && variant.length >= 3 && part.length >= 3) {
          // Перевірка: відхиляємо співпадіння де перші літери імен зовсім різні
          if (variant[0] !== part[0] && !(variant.length < 4 || part.length < 4)) {
            continue;
          }
          
          // Визначаємо тип співпадіння
          const matchType = dbNameParts.indexOf(part) === 0 ? 'surname-similar' : 'firstname-similar'
          
          // Додаємо до рекомендацій
          possibleMatches.push({
            dbName: dbName,
            id: nameDatabase[dbName],
            part: matchType,
            similarity: similarity,
            quality: Math.round(similarity * 90)
          })
        }
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

  console.log(`Знайдено ${uniqueMatches.length} можливих співпадінь для ${name}`)
  return uniqueMatches.slice(0, 4) // Обмежуємо до 4 найкращих співпадінь
}

/**
 * Функція для порівняння рядків, чутлива до порядку символів
 * @param {string} str1 - Перший рядок
 * @param {string} str2 - Другий рядок
 * @returns {number} Значення схожості від 0 до 1, враховуючи порядок символів
 */
function sequenceSensitiveSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  
  // Для однакових рядків повертаємо 1
  if (s1 === s2) return 1;
  
  // Довжина найдовшої спільної підпослідовності (LCS)
  const lcsLength = longestCommonSubsequence(s1, s2);
  
  // Оцінка на основі відношення LCS до довжини рядків
  const maxLen = Math.max(s1.length, s2.length);
  const minLen = Math.min(s1.length, s2.length);
  
  // Додаємо штраф за різницю в довжині
  const lengthRatio = minLen / maxLen;
  
  // Остаточна оцінка
  return (lcsLength / maxLen) * lengthRatio;
}

/**
 * Знаходить довжину найдовшої спільної підпослідовності
 * @param {string} s1 - Перший рядок
 * @param {string} s2 - Другий рядок
 * @returns {number} Довжина найдовшої спільної підпослідовності
 */
function longestCommonSubsequence(s1, s2) {
  const m = s1.length;
  const n = s2.length;
  
  // Створюємо двовимірний масив для динамічного програмування
  const dp = Array(m + 1).fill().map(() => Array(n + 1).fill(0));
  
  // Заповнюємо таблицю
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  
  return dp[m][n];
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
      
      // Додаємо стандартну форму імені, якщо існує
      const standardName = getStandardNameForm(nameLower);
      if (standardName !== nameLower) {
        nameVariants.push(standardName);
      }
    } catch (e) {
      console.log(`Помилка транслітерації: ${e}`);
    }
  } else if (/[А-Яа-яІіЇїЄєҐґ']/.test(name)) {
    // Якщо ім'я кирилицею, додаємо стандартну форму
    const standardName = getStandardNameForm(nameLower);
    if (standardName !== nameLower) {
      nameVariants.push(standardName);
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
      if (firstname === variant || 
         (isVariantOf && isVariantOf(variant, firstname)) || 
         getSimilarity(firstname, variant) > 0.95) {
        if (!firstnameMatches[firstname]) {
          firstnameMatches[firstname] = [];
        }
        
        // Не додаємо дублікати імен
        if (!firstnameMatches[firstname].includes(dbName)) {
          firstnameMatches[firstname].push(dbName);
        }
      }
    }
  }
  
  // Перевіряємо, чи є кілька можливих співпадінь за іменем
  let foundMultiple = false;
  
  for (const [firstname, matches] of Object.entries(firstnameMatches)) {
    if (matches.length > 1) {
      // Додаткова перевірка: чи відрізняються прізвища?
      const surnames = new Set();
      matches.forEach(fullName => {
        const parts = fullName.split(' ');
        if (parts.length > 0) {
          surnames.add(parts[0]);
        }
      });
      
      // Якщо знайдено кілька різних прізвищ для одного імені, це неоднозначне співпадіння
      if (surnames.size > 1) {
        console.log(`Для "${name}" знайдено ${matches.length} записів з іменем "${firstname}" і ${surnames.size} різними прізвищами`);
        foundMultiple = true;
      }
    }
  }
  
  if (foundMultiple) {
    return true;
  }
  
  // Знаходимо всі можливі співпадіння
  const matches = findAllPossibleMatches(name, nameDatabase);
  
  // Якщо знайдено більше одного співпадіння, вважаємо ім'я неоднозначним
  return matches.length > 1;
}

/**
 * Спроба автоматично знайти найкращі співпадіння для нерозпізнаних імен
 * @param {Object} matchedNames - Об'єкт з інформацією про вже знайдені співпадіння
 * @param {Set} unrecognizedNames - Множина нерозпізнаних імен
 * @param {Object} nameDatabase - База імен для пошуку співпадінь
 */
export function tryAutoMatchUnrecognized(matchedNames, unrecognizedNames, nameDatabase) {
  // Якщо нема нерозпізнаних імен або бази імен, виходимо
  if (unrecognizedNames.size === 0 || Object.keys(nameDatabase).length === 0) {
    console.log('Немає нерозпізнаних імен або бази для автоматичного співпадіння')
    return
  }

  console.log(`Спроба автоматичного співпадіння для ${unrecognizedNames.size} нерозпізнаних імен`)

  // Збираємо всі використані ID з matchedNames
  const usedIds = new Set()
  Object.entries(matchedNames).forEach(([key, id]) => {
    if (id !== 'not-in-db' && !key.endsWith('_matchInfo')) {
      usedIds.add(id)
    }
  })

  // Обробляємо кожне нерозпізнане ім'я
  for (const unrecognizedName of unrecognizedNames) {
    // Перевіряємо, чи це однослівне ім'я або рядок без пробілів
    const isOneWordName = unrecognizedName.split(/\s+/).length === 1;

    // Шукаємо точні співпадіння по імені (для однослівних імен)
    if (isOneWordName) {
      const nameLower = unrecognizedName.toLowerCase();
      const exactMatches = [];
      
      // Перевіряємо наявність імені в базі
      for (const dbName in nameDatabase) {
        const dbNameParts = dbName.toLowerCase().split(/\s+/);
        
        // Перевіряємо, чи це саме ім'я (друге слово) співпадає з нашим однослівним
        if (dbNameParts.length > 1 && dbNameParts[1] === nameLower) {
          // Якщо ID ще не використано
          if (!usedIds.has(nameDatabase[dbName])) {
            exactMatches.push({
              dbName,
              id: nameDatabase[dbName],
              quality: 95
            });
          }
        }
      }
      
      // Якщо знайдено ЛИШЕ ОДНЕ точне співпадіння за іменем, використовуємо його
      if (exactMatches.length === 1) {
        const match = exactMatches[0];
        
        matchedNames[unrecognizedName] = match.id;
        matchedNames[unrecognizedName + '_matchInfo'] = {
          matchType: 'auto-match-single-name',
          quality: match.quality,
          dbName: match.dbName,
          autoMatched: true
        };
        
        // Додаємо ID до використаних
        usedIds.add(match.id);
        
        // Видаляємо з нерозпізнаних
        unrecognizedNames.delete(unrecognizedName);
        console.log(`Автоматично знайдено єдине співпадіння для ${unrecognizedName}: ${match.dbName} (${match.quality}%)`);
        
        continue;
      }
    }

    // НОВА ФУНКЦІОНАЛЬНІСТЬ: Обробка склеєних імен
    if (isOneWordName && unrecognizedName.length >= 6) {
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
      // переходимо до наступних перевірок
      console.log(`Перевіряємо додаткові варіанти для імені: ${unrecognizedName}`)
    }

    // Перевіряємо, чи вже має інформацію про можливі співпадіння
    if (
      matchedNames[unrecognizedName + '_matchInfo'] &&
      (matchedNames[unrecognizedName + '_matchInfo'].matchType === 'multiple-matches' ||
       matchedNames[unrecognizedName + '_matchInfo'].matchType === 'ambiguous-name')
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
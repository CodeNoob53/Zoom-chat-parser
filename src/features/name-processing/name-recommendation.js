/**
 * Модуль рекомендацій для нерозпізнаних імен
 */
import { transliterateToLatin, transliterateToCyrillic, areNamesTransliteratedMatches } from './transliteration.js';
import { processCombinedName } from './advanced-name-processing.js';
import {
  getStandardNameForm,
  getAllPossibleStandardNames,
  isVariantOf,
} from './name-variants.js';
import { splitName } from './name-utils.js';
import { evaluateNameSimilarity } from '../../utils/string/string-utils.js';
import { Logger } from '../../utils/string/logger.js';
import { NameMatchingConfig } from '../../config.js';
import { getSimilarity } from '../../utils/string/string-utils.js';

/**
 * Перевірка, чи існує кілька можливих співпадінь для імені
 * @param {string} name - Ім'я для перевірки
 * @param {Object} nameDatabase - База імен
 * @returns {boolean} true, якщо є кілька співпадінь
 */
export function hasAmbiguousNameMatch(name, nameDatabase) {
  const isOneWordName =
    name.split(/\s+/).length === 1 &&
    /^[A-Za-zА-Яа-яІіЇїЄєҐґ']+$/.test(name);

  if (!isOneWordName) return false;

  const possibleSplits = processCombinedName(name, nameDatabase);
  if (possibleSplits.length === 1 && possibleSplits[0].quality > 0.9) {
    Logger.info(
      `Однозначне співпадіння для склеєного імені ${name} -> ${possibleSplits[0].dbFullName}`
    );
    return false;
  }

  if (possibleSplits.length > 1) {
    Logger.info(
      `Знайдено ${possibleSplits.length} варіантів розбиття для ${name}`
    );
    return true;
  }

  const nameVariants = [name.toLowerCase()];
  if (/[a-zA-Z]/.test(name)) {
    const cyrillicVariant = transliterateToCyrillic(name);
    if (cyrillicVariant) nameVariants.push(cyrillicVariant.toLowerCase());
    const standardName = getStandardNameForm(name.toLowerCase());
    if (standardName !== name.toLowerCase()) nameVariants.push(standardName);
  } else if (/[А-Яа-яІіЇїЄєҐґ']/.test(name)) {
    const standardName = getStandardNameForm(name.toLowerCase());
    if (standardName !== name.toLowerCase()) nameVariants.push(standardName);
  }

  const firstnameMatches = {};
  for (const dbName in nameDatabase) {
    const dbParts = splitName(dbName);
    if (!dbParts.standard || dbParts.standard.firstname === '') continue;

    const firstname = dbParts.standard.firstname.toLowerCase();
    for (const variant of nameVariants) {
      const sim = evaluateNameSimilarity(variant, firstname);
      if (
        sim.type === 'exact-match' ||
        isVariantOf(variant, firstname) ||
        sim.quality > 0.95
      ) {
        if (!firstnameMatches[firstname]) firstnameMatches[firstname] = [];
        if (!firstnameMatches[firstname].includes(dbName)) {
          firstnameMatches[firstname].push(dbName);
        }
      }
    }
  }

  for (const [firstname, matches] of Object.entries(firstnameMatches)) {
    if (matches.length > 1) {
      const surnames = new Set(
        matches.map((fullName) => splitName(fullName).standard.surname)
      );
      if (surnames.size > 1) {
        Logger.info(
          `Для "${name}" знайдено ${matches.length} записів з іменем "${firstname}"`
        );
        return true;
      }
    }
  }

  const matches = findAllPossibleMatches(name, nameDatabase);
  return matches.length > 1;
}

/**
 * Знайти всі можливі співпадіння для імені з покращеним алгоритмом
 * @param {string} name - Ім'я
 * @param {Object} nameDatabase - База імен
 * @returns {Array} Масив співпадінь
 */
export function findAllPossibleMatches(name, nameDatabase) {
  const possibleMatches = [];
  if (!name || name.trim() === '') return possibleMatches;

  // Перевірка склеєних імен
  const isOneWordName =
    name.split(/\s+/).length === 1 &&
    /^[A-Za-zА-Яа-яІіЇїЄєҐґ']+$/.test(name);

  if (isOneWordName && name.length >= 6) {
    const possibleSplits = processCombinedName(name, nameDatabase);
    possibleSplits.forEach((split) => {
      possibleMatches.push({
        dbName: split.dbFullName,
        id: split.id,
        part: 'split-name-' + split.combined,
        quality: Math.round(split.quality * 100),
        splitName: true,
      });
    });

    if (possibleMatches.length > 0 && possibleMatches[0].quality > 85) {
      Logger.info(
        `Знайдено ${possibleMatches.length} співпадінь для склеєного імені ${name}`
      );
      return possibleMatches;
    }
  }

  // Генеруємо варіанти імені для пошуку
  const nameVariants = generateNameVariants(name);

  // Поділ імені на частини (якщо це повне ім'я)
  const nameParts = splitName(name);
  const hasMultipleParts = nameParts.standard && !nameParts.onlyOneWord;

  // Пріоритетні збіги в першу чергу
  // 1. Пошук точних співпадінь по повному імені
  for (const dbName in nameDatabase) {
    const dbNameLower = dbName.toLowerCase();
    const dbId = nameDatabase[dbName];

    for (const variant of nameVariants) {
      if (dbNameLower === variant.toLowerCase()) {
        possibleMatches.push({
          dbName,
          id: dbId,
          part: 'full-name-exact',
          quality: 100,
        });
        break;
      }
    }
  }

  // Якщо знайшли точне співпадіння, не шукаємо далі
  if (possibleMatches.length > 0) {
    return possibleMatches;
  }

  // 2. Пошук співпадінь по частинах імені
  if (hasMultipleParts) {
    const standardOrder = findStandardOrderMatches(nameParts.standard, nameDatabase);
    const reversedOrder = findReversedOrderMatches(nameParts.standard, nameDatabase);
    
    possibleMatches.push(...standardOrder);
    possibleMatches.push(...reversedOrder);
  }

  // 3. Пошук унікальних імен або прізвищ
  if (hasMultipleParts) {
    const uniqueMatches = findUniqueMatches(nameParts.standard, nameDatabase);
    possibleMatches.push(...uniqueMatches);
  }
  
  // 4. Для однослівних імен - шукаємо точні співпадіння імені або прізвища
  if (isOneWordName) {
    const singleWordMatches = findSingleWordMatches(name, nameDatabase);
    possibleMatches.push(...singleWordMatches);
  }

  // 5. Нечіткі співпадіння
  const fuzzyMatches = findFuzzyMatches(name, nameDatabase);
  possibleMatches.push(...fuzzyMatches);

  // Видаляємо дублікати за ID
  const uniqueMatches = [];
  const seenIds = new Set();

  // Сортуємо за якістю перед видаленням дублікатів
  possibleMatches.sort((a, b) => b.quality - a.quality);

  for (const match of possibleMatches) {
    if (!seenIds.has(match.id)) {
      uniqueMatches.push(match);
      seenIds.add(match.id);
    }
  }

  Logger.info(`Знайдено ${uniqueMatches.length} співпадінь для ${name}`);
  return uniqueMatches.slice(0, NameMatchingConfig.limits.maxAlternatives);
}

/**
 * Генерує варіанти імені (оригінал, транслітерація, стандартна форма)
 * @param {string} name - Вхідне ім'я
 * @returns {string[]} Масив варіантів імені
 */
function generateNameVariants(name) {
  const nameVariants = [];
  const nameLower = name.toLowerCase();
  nameVariants.push(nameLower);

  // Транслітерація кирилиця <-> латиниця
  if (/[a-zA-Z]/.test(name)) {
    const mainCyrillicVariant = transliterateToCyrillic(name);
    if (mainCyrillicVariant) nameVariants.push(mainCyrillicVariant.toLowerCase());
  } else if (/[а-яА-ЯіІїЇєЄґҐ']/.test(name)) {
    const mainLatinVariant = transliterateToLatin(name);
    if (mainLatinVariant) nameVariants.push(mainLatinVariant.toLowerCase());
  }

  // Додаємо стандартні форми імен
  const standardName = getStandardNameForm(nameLower);
  if (standardName !== nameLower) nameVariants.push(standardName);
  
  // Додаємо можливі стандартні імена
  const possibleStandardNames = getAllPossibleStandardNames(nameLower);
  nameVariants.push(...possibleStandardNames);

  // Видаляємо дублікати
  return [...new Set(nameVariants)];
}

/**
 * Знаходить співпадіння у стандартному порядку (Прізвище Ім'я)
 * @param {Object} nameParts - Частини імені {surname, firstname}
 * @param {Object} nameDatabase - База імен
 * @returns {Array} Масив співпадінь
 */
function findStandardOrderMatches(nameParts, nameDatabase) {
  const matches = [];
  
  for (const dbName in nameDatabase) {
    const dbParts = splitName(dbName);
    if (!dbParts.standard) continue;
    
    const surnameSim = evaluateNameSimilarity(nameParts.surname, dbParts.standard.surname);
    const firstnameSim = evaluateNameSimilarity(nameParts.firstname, dbParts.standard.firstname);
    
    // Точне співпадіння обох частин
    if (surnameSim.type === 'exact-match' && firstnameSim.type === 'exact-match') {
      matches.push({
        dbName,
        id: nameDatabase[dbName],
        part: 'standard-order-exact',
        quality: 98,
      });
      continue;
    }
    
    // Точне прізвище, нечітке ім'я
    if (surnameSim.type === 'exact-match' && firstnameSim.quality >= 0.7) {
      matches.push({
        dbName,
        id: nameDatabase[dbName],
        part: 'surname-exact-firstname-fuzzy',
        quality: 90,
      });
      continue;
    }
    
    // Транслітерація обох частин
    if (surnameSim.type.includes('translit') && firstnameSim.type.includes('translit')) {
      matches.push({
        dbName,
        id: nameDatabase[dbName],
        part: 'standard-order-translit',
        quality: 85,
      });
      continue;
    }
    
    // Точне прізвище, варіант імені
    if (surnameSim.type === 'exact-match' && 
        (isVariantOf(nameParts.firstname, dbParts.standard.firstname) ||
         isVariantOf(dbParts.standard.firstname, nameParts.firstname))) {
      matches.push({
        dbName,
        id: nameDatabase[dbName],
        part: 'standard-order-name-variant',
        quality: 88,
      });
      continue;
    }
  }
  
  return matches;
}

/**
 * Знаходить співпадіння у зворотному порядку (Ім'я Прізвище)
 * @param {Object} nameParts - Частини імені {surname, firstname}
 * @param {Object} nameDatabase - База імен
 * @returns {Array} Масив співпадінь
 */
function findReversedOrderMatches(nameParts, nameDatabase) {
  const matches = [];
  
  for (const dbName in nameDatabase) {
    const dbParts = splitName(dbName);
    if (!dbParts.standard) continue;
    
    // Зворотній порядок: ім'я як прізвище, прізвище як ім'я
    const reversedSurnameSim = evaluateNameSimilarity(nameParts.surname, dbParts.standard.firstname);
    const reversedFirstnameSim = evaluateNameSimilarity(nameParts.firstname, dbParts.standard.surname);
    
    // Точне співпадіння обох частин у зворотному порядку
    if (reversedSurnameSim.type === 'exact-match' && reversedFirstnameSim.type === 'exact-match') {
      matches.push({
        dbName,
        id: nameDatabase[dbName],
        part: 'reversed-order-exact',
        quality: 92,
        reversed: true,
      });
      continue;
    }
    
    // Точне ім'я, нечітке прізвище
    if (reversedSurnameSim.type === 'exact-match' && reversedFirstnameSim.quality >= 0.7) {
      matches.push({
        dbName,
        id: nameDatabase[dbName],
        part: 'reversed-surname-exact-firstname-fuzzy',
        quality: 85,
        reversed: true,
      });
      continue;
    }
    
    // Транслітерація обох частин
    if (reversedSurnameSim.type.includes('translit') && reversedFirstnameSim.type.includes('translit')) {
      matches.push({
        dbName,
        id: nameDatabase[dbName],
        part: 'reversed-order-translit',
        quality: 80,
        reversed: true,
      });
      continue;
    }
    
    // Точне ім'я, варіант прізвища
    if (reversedSurnameSim.type === 'exact-match' && 
        (isVariantOf(nameParts.firstname, dbParts.standard.surname) ||
         isVariantOf(dbParts.standard.surname, nameParts.firstname))) {
      matches.push({
        dbName,
        id: nameDatabase[dbName],
        part: 'reversed-order-name-variant',
        quality: 82,
        reversed: true,
      });
      continue;
    }
  }
  
  return matches;
}

/**
 * Знаходить співпадіння для унікальних імен або прізвищ
 * @param {Object} nameParts - Частини імені {surname, firstname}
 * @param {Object} nameDatabase - База імен
 * @returns {Array} Масив співпадінь
 */
function findUniqueMatches(nameParts, nameDatabase) {
  const matches = [];
  const { surname, firstname } = nameParts;
  
  // Рахуємо, скільки разів зустрічається це прізвище в базі
  const matchingSurnames = [];
  for (const dbName in nameDatabase) {
    const dbParts = splitName(dbName);
    if (dbParts.standard && 
        dbParts.standard.surname.toLowerCase() === surname.toLowerCase()) {
      matchingSurnames.push({
        id: nameDatabase[dbName],
        dbName: dbName
      });
    }
  }
  
  // Якщо прізвище унікальне (зустрічається лише раз)
  if (matchingSurnames.length === 1) {
    matches.push({
      id: matchingSurnames[0].id,
      dbName: matchingSurnames[0].dbName,
      part: 'unique-surname-match',
      quality: 98
    });
  }
  
  // Рахуємо, скільки разів зустрічається це ім'я в базі
  const matchingFirstnames = [];
  for (const dbName in nameDatabase) {
    const dbParts = splitName(dbName);
    if (dbParts.standard && 
        dbParts.standard.firstname.toLowerCase() === firstname.toLowerCase()) {
      matchingFirstnames.push({
        id: nameDatabase[dbName],
        dbName: dbName
      });
    }
  }
  
  // Якщо ім'я унікальне (зустрічається лише раз)
  if (matchingFirstnames.length === 1) {
    matches.push({
      id: matchingFirstnames[0].id,
      dbName: matchingFirstnames[0].dbName,
      part: 'unique-firstname-match',
      quality: 97
    });
  }
  
  return matches;
}

/**
 * Знаходить співпадіння для однослівного імені
 * @param {string} word - Слово для пошуку
 * @param {Object} nameDatabase - База імен
 * @returns {Array} Масив співпадінь
 */
function findSingleWordMatches(word, nameDatabase) {
  const matches = [];
  const wordLower = word.toLowerCase();
  
  // Генеруємо варіанти слова
  const wordVariants = generateNameVariants(word);
  
  for (const dbName in nameDatabase) {
    const dbParts = splitName(dbName);
    if (!dbParts.standard) continue;
    
    // Перевіряємо точні співпадіння з прізвищем
    if (dbParts.standard.surname.toLowerCase() === wordLower) {
      matches.push({
        dbName,
        id: nameDatabase[dbName],
        part: 'single-word-surname-exact',
        quality: 75,
      });
      continue;
    }
    
    // Перевіряємо точні співпадіння з ім'ям
    if (dbParts.standard.firstname.toLowerCase() === wordLower) {
      matches.push({
        dbName,
        id: nameDatabase[dbName],
        part: 'single-word-firstname-exact',
        quality: 70,
      });
      continue;
    }
    
    // Перевіряємо варіанти слова
    for (const variant of wordVariants) {
      // Перевіряємо транслітерацію прізвища
      if (areNamesTransliteratedMatches(variant, dbParts.standard.surname, 0.8)) {
        matches.push({
          dbName,
          id: nameDatabase[dbName],
          part: 'single-word-surname-translit',
          quality: 70,
        });
        break;
      }
      
      // Перевіряємо транслітерацію імені
      if (areNamesTransliteratedMatches(variant, dbParts.standard.firstname, 0.8)) {
        matches.push({
          dbName,
          id: nameDatabase[dbName],
          part: 'single-word-firstname-translit',
          quality: 65,
        });
        break;
      }
      
      // Перевіряємо варіанти імені
      if (isVariantOf(variant, dbParts.standard.firstname) || 
          isVariantOf(dbParts.standard.firstname, variant)) {
        matches.push({
          dbName,
          id: nameDatabase[dbName],
          part: 'single-word-variant-match',
          quality: 75,
        });
        break;
      }
    }
  }
  
  return matches;
}

/**
 * Знаходить нечіткі співпадіння
 * @param {string} name - Ім'я для пошуку
 * @param {Object} nameDatabase - База імен
 * @returns {Array} Масив співпадінь
 */
function findFuzzyMatches(name, nameDatabase) {
  const matches = [];
  const nameVariants = generateNameVariants(name);
  
  for (const dbName in nameDatabase) {
    // Пропускаємо, якщо вже знайдено співпадіння з цим dbName у попередніх стратегіях
    if (matches.some(m => m.dbName === dbName)) continue;
    
    let bestSimilarity = 0;
    for (const variant of nameVariants) {
      const similarity = getSimilarity(variant.toLowerCase(), dbName.toLowerCase());
      bestSimilarity = Math.max(bestSimilarity, similarity);
    }
    
    if (bestSimilarity >= 0.65) {
      matches.push({
        dbName,
        id: nameDatabase[dbName],
        part: 'fuzzy-match',
        quality: Math.round(bestSimilarity * 60),
      });
    }
  }
  
  return matches;
}

/**
 * Спроба автоматичного співпадіння з покращеною логікою
 * @param {Object} matchedNames - Співпадіння
 * @param {Set} unrecognizedNames - Нерозпізнані імена
 * @param {Object} nameDatabase - База імен
 */
export function tryAutoMatchUnrecognized(
  matchedNames,
  unrecognizedNames,
  nameDatabase
) {
  if (unrecognizedNames.size === 0 || Object.keys(nameDatabase).length === 0) {
    Logger.info('Немає нерозпізнаних імен або бази');
    return;
  }

  Logger.info(
    `Автоматичне співпадіння для ${unrecognizedNames.size} імен`
  );

  // Вже використані ID, щоб не призначати одну людину двічі
  const usedIds = new Set();
  Object.entries(matchedNames).forEach(([key, id]) => {
    if (id !== 'not-in-db' && !key.endsWith('_matchInfo')) {
      usedIds.add(id);
    }
  });

  // Для кожного нерозпізнаного імені
  const remainingUnrecognized = new Set(unrecognizedNames);
  
  for (const name of unrecognizedNames) {
    const isOneWordName = name.split(/\s+/).length === 1;

    // Особлива обробка для однослівних імен - шукаємо точний збіг
    if (isOneWordName) {
      const nameLower = name.toLowerCase();
      const exactMatches = [];

      // Шукаємо точні співпадіння з іменами
      for (const dbName in nameDatabase) {
        const dbParts = splitName(dbName);
        if (
          dbParts.standard &&
          dbParts.standard.firstname.toLowerCase() === nameLower &&
          !usedIds.has(nameDatabase[dbName])
        ) {
          exactMatches.push({
            dbName,
            id: nameDatabase[dbName],
            quality: 95,
            matchType: 'auto-match-single-firstname-exact'
          });
        }
      }

      // Якщо знайшли єдине точне співпадіння імені
      if (exactMatches.length === 1) {
        const match = exactMatches[0];
        matchedNames[name] = match.id;
        matchedNames[name + '_matchInfo'] = {
          matchType: match.matchType,
          quality: match.quality,
          dbName: match.dbName,
          autoMatched: true,
        };
        usedIds.add(match.id);
        remainingUnrecognized.delete(name);
        Logger.info(
          `Автоматичне співпадіння для однослівного імені ${name}: ${match.dbName}`
        );
        continue;
      }
      
      // Шукаємо точні співпадіння з прізвищами
      const exactSurnameMatches = [];
      for (const dbName in nameDatabase) {
        const dbParts = splitName(dbName);
        if (
          dbParts.standard &&
          dbParts.standard.surname.toLowerCase() === nameLower &&
          !usedIds.has(nameDatabase[dbName])
        ) {
          exactSurnameMatches.push({
            dbName,
            id: nameDatabase[dbName],
            quality: 95,
            matchType: 'auto-match-single-surname-exact'
          });
        }
      }
      
      // Якщо знайшли єдине точне співпадіння прізвища
      if (exactSurnameMatches.length === 1) {
        const match = exactSurnameMatches[0];
        matchedNames[name] = match.id;
        matchedNames[name + '_matchInfo'] = {
          matchType: match.matchType,
          quality: match.quality,
          dbName: match.dbName,
          autoMatched: true,
        };
        usedIds.add(match.id);
        remainingUnrecognized.delete(name);
        Logger.info(
          `Автоматичне співпадіння для однослівного прізвища ${name}: ${match.dbName}`
        );
        continue;
      }
    }

    // Обробка склеєних імен
    if (isOneWordName && name.length >= 6) {
      const possibleSplits = processCombinedName(name, nameDatabase);
      // Шукаємо тільки невикористані ID
      const unusedSplits = possibleSplits.filter(split => !usedIds.has(split.id));
      
      if (
        unusedSplits.length > 0 &&
        unusedSplits[0].quality > 0.85
      ) {
        const bestMatch = unusedSplits[0];
        matchedNames[name] = bestMatch.id;
        matchedNames[name + '_matchInfo'] = {
          matchType: 'split-name-match',
          quality: Math.round(bestMatch.quality * 100),
          dbName: bestMatch.dbFullName,
          allMatches: possibleSplits.map((split) => ({
            id: split.id,
            dbName: split.dbFullName,
            quality: Math.round(split.quality * 100),
          })),
          autoMatched: true,
        };
        usedIds.add(bestMatch.id);
        remainingUnrecognized.delete(name);
        Logger.info(
          `Автоматичне співпадіння для склеєного імені ${name}: ${bestMatch.dbFullName}`
        );
        continue;
      }
    }

    // Пошук загальних співпадінь
    const possibleMatches = findAllPossibleMatches(name, nameDatabase)
      .filter((match) => !usedIds.has(match.id))
      .sort((a, b) => b.quality - a.quality);

    if (possibleMatches.length > 0) {
      // Беремо найкраще співпадіння, якщо його якість висока
      const bestMatch = possibleMatches[0];
      
      // Перевіряємо умови для прийняття автоматичного співпадіння
      const isHighQuality = bestMatch.quality >= 85;
      const hasSignificantAdvantage = possibleMatches.length === 1 || 
          (possibleMatches.length > 1 && 
          (bestMatch.quality - possibleMatches[1].quality) >= 10);
      
      if (isHighQuality && hasSignificantAdvantage) {
        matchedNames[name] = bestMatch.id;
        matchedNames[name + '_matchInfo'] = {
          matchType: 'auto-match',
          quality: bestMatch.quality,
          dbName: bestMatch.dbName,
          allMatches: possibleMatches.slice(0, NameMatchingConfig.limits.maxAlternatives),
          autoMatched: true,
        };
        usedIds.add(bestMatch.id);
        remainingUnrecognized.delete(name);
        Logger.info(
          `Автоматичне співпадіння для ${name}: ${bestMatch.dbName}`
        );
      }
    }
  }
  
  // Оновлюємо множину нерозпізнаних імен
  unrecognizedNames.clear();
  for (const name of remainingUnrecognized) {
    unrecognizedNames.add(name);
  }
}
/**
 * Отримати рекомендації для нерозпізнаних імен
 * @param {Array|Set} unrecognizedNames - Нерозпізнані імена
 * @param {Object} nameDatabase - База імен
 * @param {Object} matchedNames - Співпадіння
 * @returns {Object} Рекомендації
 */
export function getRecommendations(
  unrecognizedNames = [],
  nameDatabase = {},
  matchedNames = {}
) {
  const recommendations = {};
  const namesArray = Array.isArray(unrecognizedNames)
    ? unrecognizedNames
    : [...unrecognizedNames];

  Logger.info(`Отримання рекомендацій для ${namesArray.length} імен`);

  namesArray.forEach((name) => {
    if (
      name.toLowerCase() === 'veronika' ||
      name.toLowerCase() === 'вероніка'
    ) {
      const veronikaMatches = [];
      for (const dbName in nameDatabase) {
        if (dbName.toLowerCase().includes('вероніка')) {
          veronikaMatches.push({
            id: nameDatabase[dbName],
            dbName,
            similarity: 0.95,
          });
        }
      }
      if (veronikaMatches.length > 0) {
        recommendations[name] = veronikaMatches;
        Logger.info(
          `Знайдено ${veronikaMatches.length} записів для ${name}`
        );
        return;
      }
    }

    const matchInfo = matchedNames[name + '_matchInfo'] || {};
    if (
      ['ambiguous-name', 'multiple-matches', 'split-name-match'].includes(
        matchInfo.matchType
      ) &&
      matchInfo.allMatches
    ) {
      const filteredMatches = matchInfo.allMatches
        .filter((match) => (match.quality || 0) >= 50)
        .map((match) => ({
          id: match.id,
          dbName: match.dbName,
          similarity: match.quality ? match.quality / 100 : 0.7,
        }));

      if (filteredMatches.length > 0) {
        recommendations[name] = filteredMatches;
        Logger.info(
          `Використано ${filteredMatches.length} варіантів для ${name}`
        );
      }
      return;
    }

    const isOneWordName = name.split(/\s+/).length === 1;
    if (isOneWordName) {
      const exactMatches = findExactNameMatches(name, nameDatabase);
      if (exactMatches.length === 1) {
        recommendations[name] = [
          {
            id: exactMatches[0].id,
            dbName: exactMatches[0].dbName,
            similarity: 0.95,
          },
        ];
        Logger.info(
          `Точне співпадіння для ${name}: ${exactMatches[0].dbName}`
        );
        return;
      } else if (exactMatches.length > 1) {
        recommendations[name] = exactMatches.map((match) => ({
          id: match.id,
          dbName: match.dbName,
          similarity: 0.9,
        }));
        Logger.info(
          `Знайдено ${exactMatches.length} співпадінь для ${name}`
        );
        return;
      }
    }

    const bestMatches = findBestMatches(name, nameDatabase, matchedNames);
    const qualityMatches = bestMatches.filter(
      (match) => match.similarity >= 0.6
    );

    if (qualityMatches.length > 0) {
      recommendations[name] = qualityMatches;
      Logger.info(`Знайдено ${qualityMatches.length} рекомендацій для ${name}`);
    }
  });

  Logger.info(
    `Знайдено рекомендації для ${Object.keys(recommendations).length} імен`
  );
  return recommendations;
}

/**
 * Знайти точні співпадіння за іменем
 * @param {string} name - Ім'я
 * @param {Object} nameDatabase - База імен
 * @returns {Array} Співпадіння
 */
function findExactNameMatches(name, nameDatabase) {
  const results = [];
  const nameLower = name.toLowerCase();

  for (const dbName in nameDatabase) {
    const dbParts = splitName(dbName);
    if (
      dbParts.standard &&
      dbParts.standard.firstname.toLowerCase() === nameLower
    ) {
      results.push({
        dbName,
        id: nameDatabase[dbName],
      });
    }
  }

  return results;
}

/**
 * Знайти найкращі співпадіння
 * @param {string} name - Ім'я
 * @param {Object} nameDatabase - База імен
 * @param {Object} matchedNames - Співпадіння
 * @returns {Array} Найкращі співпадіння
 */
function findBestMatches(name, nameDatabase, matchedNames) {
  const isOneWordName =
    name.split(/\s+/).length === 1 &&
    /^[A-Za-zА-Яа-яІіЇїЄєҐґ']+$/.test(name);

  if (isOneWordName && name.length >= 6) {
    const possibleSplits = processCombinedName(name, nameDatabase);
    if (possibleSplits.length > 0) {
      const goodSplits = possibleSplits
        .filter((split) => split.quality >= 0.7)
        .map((split) => ({
          id: split.id,
          dbName: split.dbFullName,
          similarity: split.quality,
          matchType: 'split-name-match',
        }));

      if (goodSplits.length > 0) {
        const usedIds = new Set(
          Object.entries(matchedNames)
            .filter(([key, id]) => id !== 'not-in-db' && !key.endsWith('_matchInfo'))
            .map(([, id]) => id)
        );

        return goodSplits
          .filter((match) => !usedIds.has(match.id))
          .slice(0, NameMatchingConfig.limits.maxAlternatives);
      }
    }
  }

  const matches = [];
  if (!name || !nameDatabase || Object.keys(nameDatabase).length === 0) {
    Logger.info(`Немає бази або ім'я пусте: ${name}`);
    return matches;
  }

  const usedIds = new Set(
    Object.entries(matchedNames)
      .filter(([key, id]) => id !== 'not-in-db' && !key.endsWith('_matchInfo'))
      .map(([, id]) => id)
  );

  const nameVariants = [
    name,
    transliterateToLatin(name),
    transliterateToCyrillic(name),
  ].filter(Boolean);

  for (const [dbName, dbId] of Object.entries(nameDatabase)) {
    if (usedIds.has(dbId)) continue;

    const dbNameVariants = [
      dbName,
      transliterateToLatin(dbName),
      transliterateToCyrillic(dbName),
    ].filter(Boolean);

    let bestSimilarity = 0;
    for (const nameVar of nameVariants) {
      for (const dbNameVar of dbNameVariants) {
        const sim = evaluateNameSimilarity(nameVar, dbNameVar);
        if (sim.quality > bestSimilarity) {
          bestSimilarity = sim.quality;
        }
      }
    }

    if (bestSimilarity > 0.3) {
      matches.push({
        id: dbId,
        dbName,
        similarity: bestSimilarity,
      });
    }
  }

  return matches
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, NameMatchingConfig.limits.maxAlternatives);
}
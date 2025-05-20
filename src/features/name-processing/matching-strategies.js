/**
 * Модуль стратегій порівняння імен
 * Реалізує патерн "Стратегія" для модульного порівняння імен
 */
import { nicknameToIdMap } from '../database/database-service.js';
import { splitName } from './name-utils.js';
import { areNamesTransliteratedMatches } from './transliteration.js';
import { isVariantOf } from './name-variants.js';
import { evaluateNameSimilarity } from '../../utils/string/string-utils.js';
import { NameMatchingConfig, getQuality, getThreshold } from '../../config.js';

/**
 * Стратегія точного співпадіння
 */
const exactMatchStrategy = {
  priority: 100,
  match(name, nameDatabase, realNameMap) {
    if (nameDatabase[name]) {
      return {
        id: nameDatabase[name],
        dbName: name,
        matchType: 'exact-match',
        quality: getQuality('exactMatch'),
      };
    }
    return null;
  },
};

/**
 * Стратегія співпадіння за тегом реального імені
 */
const realNameTagStrategy = {
  priority: 99,
  match(name, nameDatabase, realNameMap) {
    if (realNameMap[name] && nameDatabase[realNameMap[name]]) {
      return {
        id: nameDatabase[realNameMap[name]],
        dbName: realNameMap[name],
        matchType: 'real-name-tag',
        quality: getQuality('realNameTag'),
      };
    }
    return null;
  },
};

/**
 * Стратегія унікальних імен
 * Шукає унікальні імена або прізвища в базі даних
 */
const uniqueNameStrategy = {
  priority: 98, // Ставимо вище за nicknameMatch, але нижче за realNameTag
  match(name, nameDatabase, realNameMap) {
    // Розбиваємо ім'я на частини
    const nameParts = splitName(name);
    if (!nameParts.standard) return null;
    
    const { surname, firstname } = nameParts.standard;
    
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
      return {
        id: matchingSurnames[0].id,
        dbName: matchingSurnames[0].dbName,
        matchType: 'unique-surname-match',
        quality: getQuality('uniqueSurnameMatch'),
      };
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
      return {
        id: matchingFirstnames[0].id,
        dbName: matchingFirstnames[0].dbName,
        matchType: 'unique-firstname-match',
        quality: getQuality('uniqueFirstnameMatch'),
      };
    }
    
    return null;
  },
};


/**
 * Стратегія співпадіння за нікнеймом
 */
const nicknameMatchStrategy = {
  priority: 97,
  match(name, nameDatabase, realNameMap) {
    const chatName = (realNameMap[name] || name).toLowerCase();
    if (nicknameToIdMap[chatName]) {
      const id = nicknameToIdMap[chatName];
      const dbName = Object.keys(nameDatabase).find(
        (key) => nameDatabase[key] === id
      );
      return {
        id,
        dbName,
        matchType: 'nickname-match',
        quality: getQuality('nicknameMatch'),
      };
    }
    return null;
  },
};

/**
 * Стратегія порівняння частин імені
 */
const namePartsStrategy = {
  priority: 95,
  match(name, nameDatabase, realNameMap) {
    const chatName = realNameMap[name] || name;
    const chatParts = splitName(chatName);
    const potentialMatches = [];

    for (const dbName in nameDatabase) {
      const dbParts = splitName(dbName);
      let match = null;

      // Стандартний порядок
      if (chatParts.standard && dbParts.standard) {
        match = compareStandardOrder(
          chatParts.standard,
          dbParts.standard,
          dbName,
          nameDatabase[dbName]
        );
        if (match) potentialMatches.push(match);
      }

      // Зворотний порядок
      if (chatParts.reversed && dbParts.standard) {
        match = compareReversedOrder(
          chatParts.reversed,
          dbParts.standard,
          dbName,
          nameDatabase[dbName]
        );
        if (match) potentialMatches.push({ ...match, reversed: true });
      }

      // Однослівне ім'я
      if (chatParts.onlyOneWord) {
        match = compareSingleWord(
          chatParts.word,
          dbParts,
          dbName,
          nameDatabase[dbName]
        );
        if (match) potentialMatches.push(match);
      }
    }

    if (potentialMatches.length === 0) return null;

    // Сортуємо за якістю
    potentialMatches.sort((a, b) => b.quality - a.quality);

    // Перевіряємо на неоднозначність
    if (
      potentialMatches.length >= 2 &&
      potentialMatches[0].quality - potentialMatches[1].quality <
        NameMatchingConfig.thresholds.similarQualityDiff
    ) {
      return {
        id: 'not-in-db',
        matchType: 'multiple-matches',
        quality: 0,
        allMatches: potentialMatches.slice(0, NameMatchingConfig.limits.maxAlternatives),
      };
    }

    return {
      ...potentialMatches[0],
      allMatches: potentialMatches.slice(0, NameMatchingConfig.limits.maxAlternatives),
    };
  },
};

/**
 * Удосконалене порівняння в стандартному порядку
 */
function compareStandardOrder(chatParts, dbParts, dbName, id) {
  // Попереднє швидке порівняння (case-insensitive)
  if (chatParts.surname.toLowerCase() === dbParts.surname.toLowerCase() &&
      chatParts.firstname.toLowerCase() === dbParts.firstname.toLowerCase()) {
    return {
      id,
      dbName,
      matchType: 'standard-order-exact',
      quality: getQuality('standardOrderExact'),
    };
  }

  // Тепер перевіряємо більш детально
  const surnameSim = evaluateNameSimilarity(
    chatParts.surname,
    dbParts.surname
  );
  const firstnameSim = evaluateNameSimilarity(
    chatParts.firstname,
    dbParts.firstname
  );

  if (
    surnameSim.type === 'exact-match' &&
    firstnameSim.type === 'exact-match'
  ) {
    return {
      id,
      dbName,
      matchType: 'standard-order-exact',
      quality: getQuality('standardOrderExact'),
    };
  }

  if (
    surnameSim.type === 'exact-match' &&
    firstnameSim.type === 'fuzzy-match'
  ) {
    return {
      id,
      dbName,
      matchType: 'surname-exact-firstname-fuzzy',
      quality: getQuality('surnameExactFirstnameFuzzy'),
    };
  }

  if (
    surnameSim.type === 'translit-match' &&
    firstnameSim.type === 'translit-match'
  ) {
    return {
      id,
      dbName,
      matchType: 'standard-order-translit',
      quality: getQuality('standardOrderTranslit'),
    };
  }

  if (
    surnameSim.type === 'exact-match' &&
    (isVariantOf(chatParts.firstname, dbParts.firstname) ||
      isVariantOf(dbParts.firstname, chatParts.firstname))
  ) {
    return {
      id,
      dbName,
      matchType: 'standard-order-name-variant',
      quality: getQuality('standardOrderNameVariant'),
    };
  }

  return null;
}

/**
 * Порівняння в зворотному порядку
 */
function compareReversedOrder(chatParts, dbParts, dbName, id) {
  const surnameSim = evaluateNameSimilarity(
    chatParts.surname,
    dbParts.surname
  );
  const firstnameSim = evaluateNameSimilarity(
    chatParts.firstname,
    dbParts.firstname
  );

  if (
    surnameSim.type === 'exact-match' &&
    firstnameSim.type === 'exact-match'
  ) {
    return {
      id,
      dbName,
      matchType: 'reversed-order-exact',
      quality: getQuality('reversedOrderExact'),
    };
  }

  if (
    surnameSim.type === 'exact-match' &&
    firstnameSim.type === 'fuzzy-match'
  ) {
    return {
      id,
      dbName,
      matchType: 'reversed-surname-exact-firstname-fuzzy',
      quality: getQuality('reversedSurnameExactFirstnameFuzzy'),
    };
  }

  if (
    surnameSim.type === 'translit-match' &&
    firstnameSim.type === 'translit-match'
  ) {
    return {
      id,
      dbName,
      matchType: 'reversed-order-translit',
      quality: getQuality('reversedOrderTranslit'),
    };
  }

  if (
    surnameSim.type === 'exact-match' &&
    (isVariantOf(chatParts.firstname, dbParts.firstname) ||
      isVariantOf(dbParts.firstname, chatParts.firstname))
  ) {
    return {
      id,
      dbName,
      matchType: 'reversed-order-name-variant',
      quality: getQuality('reversedOrderNameVariant'),
    };
  }

  return null;
}

/**
 * Покращене порівняння однослівного імені
 */
function compareSingleWord(word, dbParts, dbName, id) {
  if (!dbParts.standard) return null;
  
  // Спочатку перевіряємо точні співпадіння з прізвищем або ім'ям
  if (word.toLowerCase() === dbParts.standard.surname.toLowerCase()) {
    return {
      id,
      dbName,
      matchType: 'single-word-surname-exact-match',
      quality: getQuality('singleWordSurnameMatch') + 5, // Збільшуємо якість для точного співпадіння
    };
  }
  
  if (word.toLowerCase() === dbParts.standard.firstname.toLowerCase()) {
    return {
      id,
      dbName,
      matchType: 'single-word-firstname-exact-match',
      quality: getQuality('singleWordFirstnameMatch') + 5, // Збільшуємо якість для точного співпадіння
    };
  }

  // Перевіряємо транслітерацію
  if (
    areNamesTransliteratedMatches(
      word,
      dbParts.standard.surname,
      getThreshold('translitMatch')
    )
  ) {
    return {
      id,
      dbName,
      matchType: 'single-word-surname-match',
      quality: getQuality('singleWordSurnameMatch'),
    };
  }

  if (
    areNamesTransliteratedMatches(
      word,
      dbParts.standard.firstname,
      getThreshold('translitMatch')
    )
  ) {
    return {
      id,
      dbName,
      matchType: 'single-word-firstname-match',
      quality: getQuality('singleWordFirstnameMatch'),
    };
  }

  // Перевіряємо варіанти імені (зменшувальні форми)
  if (
    isVariantOf(word, dbParts.standard.firstname) ||
    isVariantOf(dbParts.standard.firstname, word)
  ) {
    return {
      id,
      dbName,
      matchType: 'single-word-variant-match',
      quality: getQuality('singleWordVariantMatch'),
    };
  }

  // Нечітке співпадіння як останній ресурс
  const similarity = evaluateNameSimilarity(word, dbName);
  if (similarity.type === 'fuzzy-match') {
    return {
      id,
      dbName,
      matchType: 'full-name-translit',
      quality: getQuality('fullNameTranslit'),
    };
  }

  return null;
}

export const matchingStrategies = {
  exactMatch: exactMatchStrategy,
  realNameTag: realNameTagStrategy,
  uniqueName: uniqueNameStrategy, // Додана нова стратегія
  nicknameMatch: nicknameMatchStrategy,
  nameParts: namePartsStrategy,
};
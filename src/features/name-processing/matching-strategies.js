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
 * Порівняння в стандартному порядку
 */
function compareStandardOrder(chatParts, dbParts, dbName, id) {
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
 * Порівняння однослівного імені
 */
function compareSingleWord(word, dbParts, dbName, id) {
  if (dbParts.standard) {
    if (
      areNamesTransliteratedMatches(
        word,
        dbParts.standard.surname,
        NameMatchingConfig.thresholds.translitMatch
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
        NameMatchingConfig.thresholds.translitMatch
      )
    ) {
      return {
        id,
        dbName,
        matchType: 'single-word-firstname-match',
        quality: getQuality('singleWordFirstnameMatch'),
      };
    }

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
  }

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
  nicknameMatch: nicknameMatchStrategy,
  nameParts: namePartsStrategy,
};
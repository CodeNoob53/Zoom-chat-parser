/**
 * Модуль рекомендацій для нерозпізнаних імен
 */
import { transliterateToLatin, transliterateToCyrillic } from './transliteration.js';
import { processCombinedName } from './advanced-name-processing.js';
import {
  getStandardNameForm,
  getAllPossibleStandardNames,
  isVariantOf,
} from './name-variants.js';
import { splitName } from './name-utils.js';
import { evaluateNameSimilarity } from '../../utils/string/string-utils.js';
import { Logger } from '../../utils/string/logger.js';
import { NameMatchingConfig, getQuality } from '../../config.js';

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
 * Знайти всі можливі співпадіння для імені
 * @param {string} name - Ім'я
 * @param {Object} nameDatabase - База імен
 * @returns {Array} Масив співпадінь
 */
export function findAllPossibleMatches(name, nameDatabase) {
  const possibleMatches = [];
  if (!name || name.trim() === '') return possibleMatches;

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

  const nameVariants = [];
  const nameLower = name.toLowerCase();
  nameVariants.push(nameLower);

  if (/[a-zA-Z]/.test(name)) {
    const mainCyrillicVariant = transliterateToCyrillic(name);
    if (mainCyrillicVariant) nameVariants.push(mainCyrillicVariant.toLowerCase());
    const standardName = getStandardNameForm(nameLower);
    if (standardName !== nameLower) nameVariants.push(standardName);
    const possibleStandardNames = getAllPossibleStandardNames(nameLower);
    nameVariants.push(...possibleStandardNames);
  } else {
    nameVariants.push(nameLower);
    const standardName = getStandardNameForm(nameLower);
    if (standardName !== nameLower) nameVariants.push(standardName);
  }

  nameVariants.push(...new Set(nameVariants));

  const nameMatchCounts = {};
  const exactMatchedNames = new Set();

  for (const dbName in nameDatabase) {
    const dbNameLower = dbName.toLowerCase();
    const dbParts = splitName(dbName);

    for (const variant of nameVariants) {
      if (dbNameLower === variant) {
        possibleMatches.push({
          dbName,
          id: nameDatabase[dbName],
          part: 'full-name-exact',
          quality: getQuality('exactMatch'),
        });
        exactMatchedNames.add(dbName);
        continue;
      }

      if (dbParts.standard && dbParts.standard.firstname) {
        const firstname = dbParts.standard.firstname.toLowerCase();
        const sim = evaluateNameSimilarity(variant, firstname);
        if (sim.type === 'exact-match') {
          if (!nameMatchCounts[firstname]) nameMatchCounts[firstname] = [];
          nameMatchCounts[firstname].push({
            dbName,
            id: nameDatabase[dbName],
            part: 'firstname-exact',
            quality: getQuality('standardOrderExact') - 5,
          });
        }
      }
    }
  }

  for (const [firstname, matches] of Object.entries(nameMatchCounts)) {
    if (matches.length === 1 && !exactMatchedNames.has(matches[0].dbName)) {
      possibleMatches.push(matches[0]);
      exactMatchedNames.add(matches[0].dbName);
      Logger.info(
        `Єдине точне співпадіння для імені "${firstname}": ${matches[0].dbName}`
      );
    }
  }

  if (possibleMatches.length > 0) {
    Logger.info(`Знайдено ${possibleMatches.length} точних співпадінь для ${name}`);
    return possibleMatches;
  }

  for (const dbName in nameDatabase) {
    const dbParts = splitName(dbName);
    if (!dbParts.standard) continue;

    for (const variant of nameVariants) {
      const surnameSim = evaluateNameSimilarity(
        variant,
        dbParts.standard.surname
      );
      const firstnameSim = evaluateNameSimilarity(
        variant,
        dbParts.standard.firstname
      );

      if (surnameSim.quality >= NameMatchingConfig.thresholds.variantMatch) {
        possibleMatches.push({
          dbName,
          id: nameDatabase[dbName],
          part: 'surname-' + surnameSim.type,
          quality: Math.round(surnameSim.quality * 90),
        });
      } else if (
        firstnameSim.quality >= NameMatchingConfig.thresholds.variantMatch
      ) {
        possibleMatches.push({
          dbName,
          id: nameDatabase[dbName],
          part: 'firstname-' + firstnameSim.type,
          quality: Math.round(firstnameSim.quality * 90),
        });
      }
    }
  }

  possibleMatches.sort((a, b) => {
    if (a.part.includes('exact') && !b.part.includes('exact')) return -1;
    if (!a.part.includes('exact') && b.part.includes('exact')) return 1;
    return b.quality - a.quality;
  });

  const uniqueMatches = [];
  const ids = new Set();
  for (const match of possibleMatches) {
    if (!ids.has(match.id)) {
      uniqueMatches.push(match);
      ids.add(match.id);
    }
  }

  Logger.info(`Знайдено ${uniqueMatches.length} співпадінь для ${name}`);
  return uniqueMatches.slice(0, NameMatchingConfig.limits.maxAlternatives);
}

/**
 * Спроба автоматичного співпадіння
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

  const usedIds = new Set();
  Object.entries(matchedNames).forEach(([key, id]) => {
    if (id !== 'not-in-db' && !key.endsWith('_matchInfo')) {
      usedIds.add(id);
    }
  });

  for (const name of unrecognizedNames) {
    const isOneWordName = name.split(/\s+/).length === 1;

    if (isOneWordName) {
      const nameLower = name.toLowerCase();
      const exactMatches = [];

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
          });
        }
      }

      if (exactMatches.length === 1) {
        const match = exactMatches[0];
        matchedNames[name] = match.id;
        matchedNames[name + '_matchInfo'] = {
          matchType: 'auto-match-single-name',
          quality: match.quality,
          dbName: match.dbName,
          autoMatched: true,
        };
        usedIds.add(match.id);
        unrecognizedNames.delete(name);
        Logger.info(
          `Автоматичне співпадіння для ${name}: ${match.dbName}`
        );
        continue;
      }
    }

    if (isOneWordName && name.length >= 6) {
      const possibleSplits = processCombinedName(name, nameDatabase);
      if (
        possibleSplits.length > 0 &&
        possibleSplits[0].quality > 0.85 &&
        !usedIds.has(possibleSplits[0].id)
      ) {
        const bestMatch = possibleSplits[0];
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
        unrecognizedNames.delete(name);
        Logger.info(
          `Автоматичне співпадіння для склеєного імені ${name}: ${bestMatch.dbFullName}`
        );
        continue;
      }
    }

    const possibleMatches = findAllPossibleMatches(name, nameDatabase)
      .filter((match) => !usedIds.has(match.id))
      .sort((a, b) => b.quality - a.quality);

    if (possibleMatches.length === 1 && possibleMatches[0].quality >= 90) {
      const bestMatch = possibleMatches[0];
      matchedNames[name] = bestMatch.id;
      matchedNames[name + '_matchInfo'] = {
        matchType: 'auto-match',
        quality: bestMatch.quality,
        dbName: bestMatch.dbName,
        allMatches: possibleMatches.slice(0, NameMatchingConfig.limits.maxAlternatives),
        autoMatched: true,
      };
      usedIds.add(bestMatch.id);
      unrecognizedNames.delete(name);
      Logger.info(
        `Автоматичне співпадіння для ${name}: ${bestMatch.dbName}`
      );
    }
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
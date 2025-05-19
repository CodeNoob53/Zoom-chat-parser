/**
 * Модуль порівняння імен з базою даних
 */
import { matchingStrategies } from './matching-strategies.js';
import { tryAutoMatchUnrecognized, hasAmbiguousNameMatch } from './name-recommendation.js';
import { Logger } from '../../utils/string/logger.js';
import { NameMatchingConfig } from '../../config.js';

/**
 * Порівняння імен з базою даних з використанням стратегій
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
  const matchedNames = {};
  const strategies = Object.values(matchingStrategies).sort(
    (a, b) => b.priority - a.priority
  );

  Logger.info(`Початок порівняння ${displayedNames.length} імен`);

  for (const name of displayedNames) {
    // Ранній вихід для ручних призначень
    if (manualAssignments[name]) {
      matchedNames[name] = manualAssignments[name];
      matchedNames[name + '_matchInfo'] = {
        matchType: 'manual-assignment',
        quality: NameMatchingConfig.qualities.manualAssignment,
      };
      Logger.debug(`Ранній вихід для ${name}: використано ручне призначення`);
      continue;
    }

    // Ранній вихід для неоднозначних імен
    if (hasAmbiguousNameMatch(name, nameDatabase)) {
      matchedNames[name] = 'not-in-db';
      matchedNames[name + '_matchInfo'] = {
        matchType: 'ambiguous-name',
        quality: 0,
        allMatches: [],
      };
      unrecognizedNames.add(name);
      Logger.debug(`Ранній вихід для ${name}: неоднозначне ім'я`);
      continue;
    }

    // Застосовуємо стратегії
    let bestMatch = null;
    for (const strategy of strategies) {
      const match = strategy.match(name, nameDatabase, realNameMap);
      if (match) {
        bestMatch = match;
        break;
      }
    }

    if (bestMatch && bestMatch.id !== 'not-in-db') {
      matchedNames[name] = bestMatch.id;
      matchedNames[name + '_matchInfo'] = {
        matchType: bestMatch.matchType,
        quality: bestMatch.quality,
        dbName: bestMatch.dbName,
        reversed: bestMatch.reversed || false,
        allMatches: bestMatch.allMatches || [],
      };
      Logger.debug(`Знайдено співпадіння для ${name}: ${bestMatch.dbName}`);
    } else {
      matchedNames[name] = 'not-in-db';
      matchedNames[name + '_matchInfo'] = {
        matchType: bestMatch?.matchType || 'not-found',
        quality: bestMatch?.quality || 0,
        allMatches: bestMatch?.allMatches || [],
      };
      unrecognizedNames.add(name);
      Logger.debug(`Не знайдено співпадіння для ${name}`);
    }
  }

  // Автоматичне співпадіння для нерозпізнаних імен
  tryAutoMatchUnrecognized(matchedNames, unrecognizedNames, nameDatabase);

  Logger.info(
    `Порівняння завершено: ${unrecognizedNames.size} імен не знайдено`
  );

  return { matchedNames, unrecognizedNames };
}
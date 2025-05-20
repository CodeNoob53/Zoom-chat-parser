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
  // Очищаємо попередні дані
  unrecognizedNames.clear();
  const matchedNames = {};
  
  // Отримуємо стратегії, відсортовані за пріоритетом
  const strategies = Object.values(matchingStrategies)
    .filter(s => s && typeof s.match === 'function')
    .sort((a, b) => b.priority - a.priority);

  Logger.info(`Початок порівняння ${displayedNames.length} імен`);

  // Для кожного імені з відображуваних
  for (const name of displayedNames) {
    // Пропускаємо порожні імена
    if (!name.trim()) continue;
    
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

    // Спочатку перевіряємо саме точне співпадіння для всіх імен
    const exactMatch = matchingStrategies.exactMatch.match(name, nameDatabase, realNameMap);
    if (exactMatch) {
      matchedNames[name] = exactMatch.id;
      matchedNames[name + '_matchInfo'] = {
        matchType: exactMatch.matchType,
        quality: exactMatch.quality,
        dbName: exactMatch.dbName,
      };
      Logger.debug(`Знайдено точне співпадіння для ${name}: ${exactMatch.dbName}`);
      continue;
    }

    // Потім перевіряємо реальне ім'я (rnm:)
    const realNameMatch = matchingStrategies.realNameTag.match(name, nameDatabase, realNameMap);
    if (realNameMatch) {
      matchedNames[name] = realNameMatch.id;
      matchedNames[name + '_matchInfo'] = {
        matchType: realNameMatch.matchType,
        quality: realNameMatch.quality,
        dbName: realNameMatch.dbName,
      };
      Logger.debug(`Знайдено співпадіння по реальному імені для ${name}: ${realNameMatch.dbName}`);
      continue;
    }

    // Перевіряємо унікальність імені або прізвища
    const uniqueNameMatch = matchingStrategies.uniqueName?.match(name, nameDatabase, realNameMap);
    if (uniqueNameMatch) {
      matchedNames[name] = uniqueNameMatch.id;
      matchedNames[name + '_matchInfo'] = {
        matchType: uniqueNameMatch.matchType,
        quality: uniqueNameMatch.quality,
        dbName: uniqueNameMatch.dbName,
      };
      Logger.debug(`Знайдено унікальне співпадіння для ${name}: ${uniqueNameMatch.dbName}`);
      continue;
    }

    // Перевіряємо нікнейм
    const nicknameMatch = matchingStrategies.nicknameMatch.match(name, nameDatabase, realNameMap);
    if (nicknameMatch) {
      matchedNames[name] = nicknameMatch.id;
      matchedNames[name + '_matchInfo'] = {
        matchType: nicknameMatch.matchType,
        quality: nicknameMatch.quality,
        dbName: nicknameMatch.dbName,
      };
      Logger.debug(`Знайдено співпадіння по нікнейму для ${name}: ${nicknameMatch.dbName}`);
      continue;
    }

    // Якщо не знайшли по попередніх стратегіях, використовуємо загальну стратегію порівняння частин імені
    const namePartsMatch = matchingStrategies.nameParts.match(name, nameDatabase, realNameMap);
    if (namePartsMatch && namePartsMatch.id !== 'not-in-db') {
      matchedNames[name] = namePartsMatch.id;
      matchedNames[name + '_matchInfo'] = {
        matchType: namePartsMatch.matchType,
        quality: namePartsMatch.quality,
        dbName: namePartsMatch.dbName,
        reversed: namePartsMatch.reversed || false,
        allMatches: namePartsMatch.allMatches || [],
      };
      Logger.debug(`Знайдено співпадіння для ${name}: ${namePartsMatch.dbName}`);
    } else {
      // Якщо не знайшли жодного співпадіння
      matchedNames[name] = 'not-in-db';
      matchedNames[name + '_matchInfo'] = {
        matchType: namePartsMatch?.matchType || 'not-found',
        quality: namePartsMatch?.quality || 0,
        allMatches: namePartsMatch?.allMatches || [],
      };
      unrecognizedNames.add(name);
      Logger.debug(`Не знайдено співпадіння для ${name}`);
    }
  }

  // Автоматичне співпадіння для нерозпізнаних імен
  if (unrecognizedNames.size > 0) {
    tryAutoMatchUnrecognized(matchedNames, unrecognizedNames, nameDatabase);
  }

  Logger.info(
    `Порівняння завершено: ${unrecognizedNames.size} імен не знайдено`
  );

  return { matchedNames, unrecognizedNames };
}
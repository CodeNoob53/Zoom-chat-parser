/**
 * Модуль управління базою імен
 */
import { elements } from '../../core/dom.js';
import { showNotification } from '../../core/notification.js';
import { matchNames } from './name-matcher.js';
import { splitName } from './name-utils.js';
import { Logger } from '../../utils/string/logger.js';
import { NameMatchingConfig } from '../../config.js';
import { getRecommendations } from './name-recommendation.js';

/**
 * Клас для управління базою імен і порівняння
 */
export class NameMatcher {
  constructor() {
    this.nameDatabase = {};
    this.matchedNames = {};
    this.unrecognizedNames = new Set();
    this.manualAssignments = {};
    this.recommendationsCache = null;
    Logger.info('NameMatcher ініціалізовано');
  }

  /**
   * Парсинг бази імен з тексту з підвищеною безпекою
   * @param {string} content - Вміст файлу бази імен
   */
  parseNameDatabase(content) {
    const { dbStatus } = elements;

    if (typeof content !== 'string') {
      Logger.error('parseNameDatabase: отримано невалідний контент');
      dbStatus.textContent = 'Помилка завантаження бази: невалідний формат';
      dbStatus.classList.remove('loaded');
      return;
    }

    this.nameDatabase = {};
    const lines = content
      .split(/\r?\n/)
      .filter((line) => line.trim())
      .slice(0, 10000);

    let validEntries = 0;
    const idSet = new Set();

    lines.forEach((line, index) => {
      try {
        if (/^\d+$/.test(line.trim())) {
          Logger.debug(`Пропускаємо рядок, що містить лише число: ${line.trim()}`);
          return;
        }

        const match = line.match(/^([^:]+)(?::|\s+)(\d+)$/);
        if (match) {
          const name = this.sanitizeName(match[1].trim());
          const id = this.sanitizeId(match[2].trim());

          if (name && id && !idSet.has(id)) {
            this.nameDatabase[name] = id;
            idSet.add(id);
            validEntries++;
          }
        } else if (line.trim()) {
          const name = this.sanitizeName(line.trim());
          if (name) {
            let uniqueId = (index + 1).toString();
            let counter = 1;
            while (idSet.has(uniqueId)) {
              uniqueId = `${index + 1}_${counter++}`;
            }

            this.nameDatabase[name] = uniqueId;
            idSet.add(uniqueId);
            validEntries++;
          }
        }
      } catch (error) {
        Logger.error(`Помилка обробки рядка: ${line}`, error);
      }
    });

    if (validEntries > 0) {
      dbStatus.textContent = `База завантажена: ${validEntries} записів`;
      dbStatus.classList.add('loaded');
      Logger.info(`Завантажено базу імен: ${validEntries} записів`);
    } else {
      dbStatus.textContent = 'Помилка завантаження бази';
      dbStatus.classList.remove('loaded');
      Logger.error('Помилка завантаження бази імен');
    }
  }

  /**
   * Санітизація імені
   * @param {string} name - Ім'я
   * @returns {string} - Очищене ім'я
   */
  sanitizeName(name) {
    if (typeof name !== 'string') return '';
    return name
      .replace(/<[^>]*>/g, '')
      .replace(/[<>"'&]/g, '')
      .replace(/javascript:/gi, '')
      .substring(0, 100);
  }

  /**
   * Санітизація ID
   * @param {string} id - ID
   * @returns {string} - Очищений ID
   */
  sanitizeId(id) {
    if (typeof id !== 'string') return '';
    return id.replace(/[^\d]/g, '').substring(0, 10);
  }

  /**
   * Встановити базу імен
   * @param {Object} database - База імен
   */
  setNameDatabase(database) {
    this.nameDatabase = { ...database };
    Logger.info(`Встановлено нову базу імен: ${Object.keys(database).length} записів`);
  }

  /**
   * Запуск порівняння імен
   * @param {string[]} displayedNames - Масив відображуваних імен
   * @param {Object} realNameMap - Карта реальних імен
   * @returns {Object} Результати порівняння
   */
  compareNames(displayedNames, realNameMap) {
    this.matchedNames = {};
    this.unrecognizedNames.clear();

    const results = matchNames(
      displayedNames,
      realNameMap,
      this.nameDatabase,
      this.manualAssignments,
      this.unrecognizedNames
    );

    this.matchedNames = results.matchedNames;
    return this.matchedNames;
  }

  /**
   * Отримати поточні співпадіння
   * @returns {Object} Співпадіння
   */
  getMatchedNames() {
    return { ...this.matchedNames };
  }

  /**
   * Отримати нерозпізнані імена
   * @returns {Array} Масив нерозпізнаних імен
   */
  getUnrecognizedNames() {
    return [...this.unrecognizedNames];
  }

/**
 * Отримати стандартну базу імен з оптимізацією
 * @returns {Object} База імен
 */
async getNameDatabase() {
  try {
    // Перевіряємо, чи є кеш
    if (Object.keys(this.nameDatabase).length > 0) {
      return { ...this.nameDatabase };
    }
    
    // Якщо кеш порожній, завантажуємо з бази даних
    const { getOldFormatDatabase } = await import('../database/database-service.js');
    const oldFormatDb = getOldFormatDatabase();
    
    if (Object.keys(oldFormatDb).length > 0) {
      this.nameDatabase = oldFormatDb;
      Logger.info(`Завантажено базу даних: ${Object.keys(oldFormatDb).length} записів`);
    } else {
      Logger.warn('База даних порожня');
    }
  } catch (err) {
    Logger.error('Помилка отримання бази:', err);
  }
  
  return { ...this.nameDatabase };
} 

  /**
   * Отримати рекомендації для нерозпізнаних імен
   * @param {Array} unrecognizedNames - Список нерозпізнаних імен
   * @param {Object} nameDatabase - База імен
   * @param {Object} matchedNames - Співпадіння
   * @returns {Object} Рекомендації
   */
  getRecommendations(unrecognizedNames, nameDatabase, matchedNames) {
    // Використовуємо кеш, якщо він існує і параметри не змінились
    if (this.recommendationsCache && 
        JSON.stringify(unrecognizedNames) === this.recommendationsCache.unrecognizedNamesKey) {
      return this.recommendationsCache.recommendations;
    }
    
    // Отримуємо нові рекомендації
    const recommendations = getRecommendations(unrecognizedNames, nameDatabase, matchedNames);
    
    // Зберігаємо в кеш
    this.recommendationsCache = {
      unrecognizedNamesKey: JSON.stringify(unrecognizedNames),
      recommendations
    };
    
    return recommendations;
  }

  /**
   * Синхронізувати базу імен
   * @returns {boolean} Успішність
   */
  syncNameDatabase() {
    const { getOldFormatDatabase } = require('../database/database-service.js');
    const oldFormatDb = getOldFormatDatabase();

    if (Object.keys(oldFormatDb).length > 0) {
      this.nameDatabase = oldFormatDb;
      return true;
    }

    Logger.info('Немає записів для синхронізації');
    return false;
  }

  /**
   * Отримати інформацію про учасника
   * @param {string} name - Ім'я
   * @param {Object} realNameMap - Карта реальних імен
   * @returns {Object} Інформація про учасника
   */
  getParticipantInfo(name, realNameMap) {
    const info = {
      id: '?',
      surname: '',
      firstname: '',
      nickname: name,
      foundInDb: false,
      matchType: 'not-found',
      alternativeMatches: [],
      autoMatched: false,
    };

    if (this.matchedNames[name] && this.matchedNames[name] !== 'not-in-db') {
      info.id = this.matchedNames[name];
      info.foundInDb = true;

      const matchInfo = this.matchedNames[name + '_matchInfo'] || {};
      info.matchType = matchInfo.matchType || 'found';
      if (matchInfo.autoMatched) info.autoMatched = true;
      if (matchInfo.allMatches && matchInfo.allMatches.length > 1) {
        info.alternativeMatches = matchInfo.allMatches.slice(1);
      }

      const dbName =
        matchInfo.dbName ||
        Object.keys(this.nameDatabase).find(
          (key) => this.nameDatabase[key] === info.id
        );

      if (dbName) {
        const nameParts = splitName(dbName);
        if (matchInfo.reversed && nameParts.standard) {
          info.surname = nameParts.standard.surname;
          info.firstname = nameParts.standard.firstname;
        } else if (nameParts.standard) {
          info.surname = nameParts.standard.surname;
          info.firstname = nameParts.standard.firstname;
        } else if (nameParts.onlyOneWord) {
          if (info.matchType.includes('surname')) {
            info.surname = nameParts.word;
          } else if (info.matchType.includes('firstname')) {
            info.firstname = nameParts.word;
          } else {
            info.surname = nameParts.word;
          }
        }
      }

      if (realNameMap[name]) {
        info.nickname = name;
        if (info.matchType !== 'real-name-tag') {
          info.matchType += ' real-name-tag';
        }
      }
    } else if (realNameMap[name]) {
      const nameParts = splitName(realNameMap[name]);
      if (nameParts.standard) {
        info.surname = nameParts.standard.surname;
        info.firstname = nameParts.standard.firstname;
      } else if (nameParts.onlyOneWord) {
        info.surname = nameParts.word;
      }
      info.nickname = name;
      info.matchType = 'real-name-tag';
    }

    return info;
  }

/**
 * Очистити кеш співпадінь для оновлення результатів
 */
clearMatchedNamesCache() {
  this.matchedNames = {};
  this.unrecognizedNames.clear();
  this.recommendationsCache = null;
  Logger.info('Кеш співпадінь очищено');
}

/**
 * Отримати співпадіння за іменем з кешу
 * @param {string} name - Ім'я
 * @returns {Object|null} Інформація про співпадіння
 */
getMatchInfo(name) {
  if (!name) return null;
  
  return this.matchedNames[name + '_matchInfo'] || null;
}


/**
 * Удосконалена функція для встановлення ручного співпадіння
 * @param {string} name - Ім'я
 * @param {string} dbNameOrId - Ім'я з бази або ID
 * @returns {boolean} Успішність операції
 */
setManualMatch(name, dbNameOrId) {
  if (!name) return false;

  let id = dbNameOrId;
  let dbName = null;
  
  // Якщо передали ім'я з бази, а не ID
  if (this.nameDatabase[dbNameOrId]) {
    id = this.nameDatabase[dbNameOrId];
    dbName = dbNameOrId;
  } else {
    // Шукаємо dbName за id
    for (const [key, value] of Object.entries(this.nameDatabase)) {
      if (value === id) {
        dbName = key;
        break;
      }
    }
  }

  const existsInDb = Object.values(this.nameDatabase).includes(id);
  if (!existsInDb) {
    Logger.error(`ID ${id} не знайдено в базі даних`);
    return false;
  }

  this.manualAssignments[name] = id;
  this.matchedNames[name] = id;
  this.matchedNames[name + '_matchInfo'] = {
    matchType: 'manual-match',
    quality: NameMatchingConfig.qualities.manualAssignment,
    dbName: dbName,
  };

  this.unrecognizedNames.delete(name);
  showNotification('Ручне призначення встановлено!', 'success');
  Logger.info(`Ручне призначення для ${name} -> ${id} (${dbName})`);
  return true;
}

  /**
   * Вибрати альтернативне співпадіння
   * @param {string} name - Ім'я
   * @param {number} altIndex - Індекс альтернативи
   * @returns {boolean} Успішність
   */
  selectAlternativeMatch(name, altIndex) {
    const matchInfo = this.matchedNames[name + '_matchInfo'];
    if (!name || !matchInfo || !matchInfo.allMatches) return false;

    const allMatches = matchInfo.allMatches;
    if (altIndex < 0 || altIndex >= allMatches.length) return false;

    const selectedMatch = allMatches[altIndex];
    this.matchedNames[name] = selectedMatch.id;
    this.matchedNames[name + '_matchInfo'] = {
      matchType: selectedMatch.matchType + '-selected',
      quality: selectedMatch.quality,
      reversed: selectedMatch.reversed || false,
      dbName: selectedMatch.dbName,
      allMatches,
    };

    this.unrecognizedNames.delete(name);
    showNotification('Альтернативне співпадіння вибрано!', 'success');
    Logger.info(`Вибрано альтернативне співпадіння для ${name}`);
    return true;
  }
}
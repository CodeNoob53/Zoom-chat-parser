/**
 * Модуль публічних API функцій для роботи з базою даних
 */
import { 
    databaseData, 
    nameToIdMap, 
    nicknameToIdMap, 
    getNextId, 
    updateDbStatusDisplay 
  } from './database-core.js';
  import { renderDatabaseTable } from './database-table.js';
  
  /**
   * Отримати всю базу даних
   * @returns {Object} База даних
   */
  export function getDatabase() {
    return databaseData;
  }
  
  /**
   * Знайти запис за нікнеймом
   * @param {string} nickname - Нікнейм для пошуку
   * @returns {Object|null} Знайдений запис або null
   */
  export function findEntryByNickname(nickname) {
    if (!nickname) return null;
    
    const id = nicknameToIdMap[nickname.toLowerCase()];
    
    if (!id) return null;
    
    return databaseData.entries.find(entry => entry.id === id) || null;
  }
  
  /**
   * Знайти запис за повним іменем (Прізвище Ім'я)
   * @param {string} fullName - Повне ім'я для пошуку
   * @returns {Object|null} Знайдений запис або null
   */
  export function findEntryByFullName(fullName) {
    if (!fullName) return null;
    
    const id = nameToIdMap[fullName];
    
    if (!id) return null;
    
    return databaseData.entries.find(entry => entry.id === id) || null;
  }
  
  /**
   * Додати нікнейм до існуючого запису
   * @param {string} id - ID запису
   * @param {string} nickname - Нікнейм для додавання
   * @returns {boolean} Успішність операції
   */
  export function addNicknameToEntry(id, nickname) {
    if (!id || !nickname) return false;
    
    // Знаходимо запис
    const index = databaseData.entries.findIndex(entry => entry.id === id);
    
    if (index === -1) return false;
    
    // Додаємо нікнейм, якщо він ще не доданий
    if (!databaseData.entries[index].nicknames) {
      databaseData.entries[index].nicknames = [];
    }
    
    // Перевіряємо, чи нікнейм вже існує
    if (databaseData.entries[index].nicknames.includes(nickname)) {
      return true;
    }
    
    // Перевіряємо, чи є вже 2 нікнейми
    if (databaseData.entries[index].nicknames.length >= 2) {
      // Замінюємо другий нікнейм
      databaseData.entries[index].nicknames[1] = nickname;
    } else {
      // Додаємо новий нікнейм
      databaseData.entries[index].nicknames.push(nickname);
    }
    
    // Ініціюємо оновлення даних
    updateDatabase();
    
    return true;
  }
  
  /**
   * Конвертувати традиційну базу імен в новий формат
   * @param {Object} oldDatabase - Стара база даних у форматі {name: id, ...}
   * @returns {Object} Нова база даних
   */
  export function convertOldDatabase(oldDatabase) {
    if (!oldDatabase || typeof oldDatabase !== 'object') {
      return null;
    }
    
    const entries = [];
    
    // Конвертуємо кожен запис
    for (const [name, id] of Object.entries(oldDatabase)) {
      // Розбиваємо ім'я на прізвище та ім'я
      const parts = name.split(/\s+/);
      
      if (parts.length < 2) {
        // Якщо ім'я складається з одного слова, використовуємо його як прізвище
        entries.push({
          id: id.toString(),
          surname: name,
          firstname: '',
          nicknames: []
        });
      } else {
        // Інакше розділяємо на прізвище та ім'я
        const surname = parts[0];
        const firstname = parts.slice(1).join(' ');
        
        entries.push({
          id: id.toString(),
          surname,
          firstname,
          nicknames: []
        });
      }
    }
    
    return {
      version: "3.0",
      entries
    };
  }
  
  /**
   * Отримати базу даних у старому форматі для сумісності
   * @returns {Object} База даних у форматі {name: id, ...}
   */
  export function getOldFormatDatabase() {
    const oldFormat = {};
    
    databaseData.entries.forEach(entry => {
      const fullName = `${entry.surname} ${entry.firstname}`.trim();
      oldFormat[fullName] = entry.id;
    });
    
    return oldFormat;
  }
  
  /**
   * Додати запис до бази даних
   * @param {Object} entry - Запис для додавання
   * @returns {boolean} Успішність операції
   */
  export function addEntry(entry) {
    if (!entry || !entry.surname || !entry.firstname) {
      return false;
    }
    
    // Створюємо новий запис
    const newEntry = {
      id: entry.id || getNextId(),
      surname: entry.surname,
      firstname: entry.firstname,
      nicknames: entry.nicknames || []
    };
    
    // Додаємо запис
    databaseData.entries.push(newEntry);
    
    // Ініціюємо оновлення даних
    updateDatabase();
    
    return true;
  }
  
  /**
   * Оновити відображення і дані бази
   */
  function updateDatabase() {
    // Імпортуємо необхідні функції для оновлення бази
    import('./database-core.js').then(module => {
      // Оновлюємо карти відповідності
      module.updateMappings();
      
      // Зберігаємо базу даних
      module.saveDatabaseToLocalStorage();
      
      // Оновлюємо статус
      module.updateDbStatusDisplay();
      
      // Оновлюємо таблицю
      renderDatabaseTable();
    });
  }
/**
 * Модуль для імпорту/експорту бази даних
 */
import { showNotification } from '../core/notification.js';
import { 
  getDatabase, 
  getAllEntries, 
  importDatabase 
} from './database-service.js';
import { renderDatabaseTable } from './database-table.js';
import { 
  createDownloadUrl, 
  downloadFile 
} from '../utils/file-utils.js';

/**
 * Ініціалізувати кнопки імпорту/експорту
 */
export function initImportExportButtons() {
  const importBtn = document.getElementById('dbImportBtn');
  const importFile = document.getElementById('dbImportFile');
  const exportCsvBtn = document.getElementById('dbExportCsvBtn');
  const exportJsonBtn = document.getElementById('dbExportJsonBtn');
  
  // Обробник кнопки імпорту
  if (importBtn && importFile) {
    importBtn.addEventListener('click', () => {
      console.log('Кнопка імпорту натиснута, відкриваємо діалог вибору файлу');
      importFile.click();
    });
    
    // Перевіряємо, чи обробник файлу правильно встановлено
    importFile.addEventListener('change', (e) => {
      console.log('Файл вибрано:', e.target.files[0]?.name);
      
      const file = e.target.files[0];
      if (!file) return;
      
      // Читаємо файл
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target.result;
        console.log('Файл прочитано, визначаємо формат');
        
        // Визначаємо формат файлу
        let format = 'txt';
        if (file.name.endsWith('.json')) {
          format = 'json';
        } else if (file.name.endsWith('.csv')) {
          format = 'csv';
        }
        
        // Викликаємо відповідну функцію імпорту
        console.log('Формат файлу:', format);
        
        try {
          if (format === 'json') {
            importJson(content);
          } else if (format === 'csv') {
            importCsv(content);
          } else {
            importTxt(content);
          }
          console.log('Імпорт успішно завершено');
        } catch (error) {
          console.error('Помилка під час імпорту:', error);
        }
      };
      
      reader.onerror = (error) => {
        console.error('Помилка читання файлу:', error);
      };
      
      // Читаємо файл як текст
      reader.readAsText(file);
    });
  }
  
  // Обробник кнопки експорту CSV
  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', () => {
      exportCsv();
    });
  }
  
  // Обробник кнопки експорту JSON
  if (exportJsonBtn) {
    exportJsonBtn.addEventListener('click', () => {
      exportJson();
    });
  }
}

// Додаємо в файл `src/database/database-import-export.js`

/**
 * Імпортувати дані з JSON
 * @param {string} content - Вміст JSON файлу
 */
export function importJson(content) {
  try {
    // Парсимо JSON у об'єкт
    const data = JSON.parse(content);
    
    // Перевіряємо структуру
    if ((data.entries && Array.isArray(data.entries)) || 
        (data.database && Array.isArray(data.database))) {
      
      // Імпортуємо дані
      if (importDatabase(data)) {
        // Оновлюємо таблицю
        renderDatabaseTable();
        
        // Повідомляємо про успіх
        const entriesCount = data.entries ? data.entries.length : data.database.length;
        showNotification(`Імпортовано ${entriesCount} записів з JSON`, 'success');
        
        // Перевіряємо, чи є відображені імена
        import('../main.js').then(module => {
          if (module.displayedNames && module.displayedNames.length > 0) {
            console.log('Виявлено відображені імена, повторне порівняння з базою');
            
            // Повторно порівнюємо імена з базою
            import('../name-processing/name-database.js').then(dbModule => {
              const { compareNames, getMatchedNames } = dbModule;
              import('../parser/parser.js').then(parserModule => {
                const { getRealNameMap } = parserModule;
                
                compareNames(module.displayedNames, getRealNameMap());
                
                // Оновлюємо відображення
                import('../ui/renderer.js').then(rendererModule => {
                  const { updateNamesList } = rendererModule;
                  
                  updateNamesList(
                    module.displayedNames,
                    getRealNameMap(),
                    true,
                    getMatchedNames()
                  );
                  
                  console.log('Список учасників оновлено з новою базою даних');
                });
              });
            });
          }
        }).catch(err => {
          console.error('Помилка при імпорті модулів:', err);
        });
      } else {
        showNotification('Помилка імпорту JSON', 'error');
      }
    } else {
      showNotification('Невірний формат JSON', 'error');
    }
  } catch (error) {
    console.error('Помилка імпорту JSON:', error);
    showNotification('Помилка імпорту JSON', 'error');
  }
}

/**
 * Імпортувати дані з CSV
 * @param {string} content - Вміст CSV файлу
 */
export function importCsv(content) {
  try {
    // Розбиваємо на рядки
    const lines = content.split(/\r?\n/).filter(line => line.trim());
    
    // Перший рядок - заголовки
    const headers = lines[0].split(',');
    
    // Індекси колонок
    const idIndex = headers.findIndex(h => h.toLowerCase() === 'id');
    const surnameIndex = headers.findIndex(h => h.toLowerCase() === 'прізвище' || h.toLowerCase() === 'surname');
    const firstnameIndex = headers.findIndex(h => h.toLowerCase() === 'ім\'я' || h.toLowerCase() === 'firstname' || h.toLowerCase() === 'name');
    const nickname1Index = headers.findIndex(h => h.toLowerCase() === 'нікнейм1' || h.toLowerCase() === 'nickname1');
    const nickname2Index = headers.findIndex(h => h.toLowerCase() === 'нікнейм2' || h.toLowerCase() === 'nickname2');
    
    // Перевіряємо обов'язкові колонки
    if (surnameIndex === -1 || firstnameIndex === -1) {
      showNotification('CSV файл повинен містити колонки "Прізвище" і "Ім\'я"', 'error');
      return;
    }
    
    // Створюємо нову базу
    const entries = [];
    
    // Парсимо дані
    for (let i = 1; i < lines.length; i++) {
      // Підтримка CSV з лапками та комами всередині значень
      const parsedValues = parseCSVLine(lines[i]);
      
      // Якщо рядок порожній або має недостатньо колонок, пропускаємо
      if (parsedValues.length <= Math.max(surnameIndex, firstnameIndex)) {
        continue;
      }
      
      // Формуємо нікнейми
      const nicknames = [];
      
      if (nickname1Index !== -1 && parsedValues[nickname1Index] && parsedValues[nickname1Index].trim()) {
        nicknames.push(parsedValues[nickname1Index].trim());
      }
      
      if (nickname2Index !== -1 && parsedValues[nickname2Index] && parsedValues[nickname2Index].trim()) {
        nicknames.push(parsedValues[nickname2Index].trim());
      }
      
      // Додаємо запис
      entries.push({
        id: idIndex !== -1 && parsedValues[idIndex] ? parsedValues[idIndex].trim() : (i).toString(),
        surname: parsedValues[surnameIndex].trim(),
        firstname: parsedValues[firstnameIndex].trim(),
        nicknames
      });
    }
    
    // Створюємо об'єкт з даними для імпорту
    const importData = {
      version: "3.0",
      entries
    };
    
    // Імпортуємо дані
    if (importDatabase(importData)) {
      // Оновлюємо таблицю
      renderDatabaseTable();
      
      // Повідомляємо про успіх
      showNotification(`Імпортовано ${entries.length} записів з CSV`, 'success');
    } else {
      showNotification('Помилка імпорту CSV', 'error');
    }
  } catch (error) {
    console.error('Помилка імпорту CSV:', error);
    showNotification('Помилка імпорту CSV', 'error');
  }
}

/**
 * Розбирає рядок CSV, враховуючи лапки та екрановані коми
 * @param {string} line - Рядок CSV
 * @returns {string[]} Масив значень
 */
function parseCSVLine(line) {
  const result = [];
  let currentValue = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    // Обробка подвійних лапок
    if (char === '"') {
      if (nextChar === '"') {
        // Екрановані лапки
        currentValue += '"';
        i++; // Пропускаємо наступний символ
      } else {
        // Перемикаємо режим лапок
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // Додаємо значення і переходимо до наступного
      result.push(currentValue);
      currentValue = '';
    } else {
      // Звичайний символ
      currentValue += char;
    }
  }
  
  // Додаємо останнє значення
  result.push(currentValue);
  
  return result;
}

/**
 * Імпортувати дані з простого текстового файлу
 * @param {string} content - Вміст TXT файлу
 */
export function importTxt(content) {
  try {
    // Розбиваємо на рядки
    const lines = content.split(/\r?\n/).filter(line => line.trim());
    
    // Створюємо нову базу
    const entries = [];
    
    // Парсимо дані
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Пропускаємо порожні рядки
      if (!line) continue;
      
      // Розбиваємо рядок на частини
      const parts = line.split(/\s+/);
      
      // Якщо рядок містить лише одне слово, пропускаємо
      if (parts.length < 2) continue;
      
      // Визначаємо прізвище та ім'я
      const surname = parts[0];
      const firstname = parts.slice(1).join(' ');
      
      // Додаємо запис
      entries.push({
        id: (i + 1).toString(),
        surname,
        firstname,
        nicknames: []
      });
    }
    
    // Створюємо об'єкт з даними для імпорту
    const importData = {
      version: "3.0",
      entries
    };
    
    // Імпортуємо дані
    if (importDatabase(importData)) {
      // Оновлюємо таблицю
      renderDatabaseTable();
      
      // Повідомляємо про успіх
      showNotification(`Імпортовано ${entries.length} записів з текстового файлу`, 'success');
    } else {
      showNotification('Помилка імпорту текстового файлу', 'error');
    }
  } catch (error) {
    console.error('Помилка імпорту TXT:', error);
    showNotification('Помилка імпорту текстового файлу', 'error');
  }
}

/**
 * Експортувати дані в CSV
 */
export function exportCsv() {
  try {
    // Отримуємо список записів
    const entries = getAllEntries();
    
    if (entries.length === 0) {
      showNotification('База даних порожня', 'warning');
      return;
    }
    
    // Заголовки
    const headers = ['ID', 'Прізвище', 'Ім\'я', 'Нікнейм1', 'Нікнейм2'];
    
    // Рядки даних
    const rows = entries.map(entry => {
      const nickname1 = entry.nicknames && entry.nicknames.length > 0 ? 
        escapeCsvValue(entry.nicknames[0]) : '';
      const nickname2 = entry.nicknames && entry.nicknames.length > 1 ? 
        escapeCsvValue(entry.nicknames[1]) : '';
      
      return [
        entry.id, 
        escapeCsvValue(entry.surname), 
        escapeCsvValue(entry.firstname), 
        nickname1, 
        nickname2
      ];
    });
    
    // Об'єднуємо в CSV
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    // Створюємо URL для завантаження
    const url = createDownloadUrl(csvContent, 'text/csv');
    
    // Завантажуємо файл
    downloadFile(url, 'database.csv');
    
    showNotification('Базу даних експортовано в CSV', 'success');
  } catch (error) {
    console.error('Помилка експорту CSV:', error);
    showNotification('Помилка експорту CSV', 'error');
  }
}

/**
 * Екранує значення для CSV
 * @param {string} value - Значення для екранування
 * @returns {string} Екрановане значення
 */
function escapeCsvValue(value) {
  if (!value) return '';
  
  // Якщо значення містить коми, лапки або переноси рядка, обгортаємо його в лапки
  const needsQuotes = /[",\n\r]/.test(value);
  
  if (needsQuotes) {
    // Дублюємо лапки всередині значення
    const escaped = value.replace(/"/g, '""');
    return `"${escaped}"`;
  }
  
  return value;
}

/**
 * Експортувати дані в JSON
 */
export function exportJson() {
  try {
    // Отримуємо дані бази
    const database = getDatabase();
    
    if (database.entries.length === 0) {
      showNotification('База даних порожня', 'warning');
      return;
    }
    
    // Форматуємо JSON
    const jsonContent = JSON.stringify(database, null, 2);
    
    // Створюємо URL для завантаження
    const url = createDownloadUrl(jsonContent, 'application/json');
    
    // Завантажуємо файл
    downloadFile(url, 'database.json');
    
    showNotification('Базу даних експортовано в JSON', 'success');
  } catch (error) {
    console.error('Помилка експорту JSON:', error);
    showNotification('Помилка експорту JSON', 'error');
  }
}
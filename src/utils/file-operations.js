/**
 * Уніфікований модуль для операцій з файлами (імпорт/експорт)
 */
import { showNotification } from '../core/notification.js';
import { createDownloadUrl, downloadFile, detectFileFormat } from './file-utils.js';
import { importDatabase } from '../database/database-service.js';
import { renderDatabaseTable } from '../database/database-table.js';

/**
 * Імпортувати дані з файлу
 * @param {File} file - Файл для імпорту
 * @param {Object} options - Опції імпорту
 * @param {boolean} options.isDatabase - Чи це імпорт бази даних
 * @returns {Promise<boolean>} Результат імпорту
 */
export async function importFile(file, options = { isDatabase: false }) {
  if (!file) return false;

  try {
    const content = await readFileContent(file);
    const format = detectFileFormat(content, file.name);

    if (options.isDatabase) {
      return importDatabaseFile(content, format);
    } else {
      return importChatFile(content, format);
    }
  } catch (error) {
    console.error('Помилка імпорту файлу:', error);
    showNotification('Помилка імпорту файлу', 'error');
    return false;
  }
}

/**
 * Експортувати дані у файл
 * @param {Object} data - Дані для експорту
 * @param {string} format - Формат експорту ('txt', 'csv', 'json')
 * @param {Object} options - Опції експорту
 * @param {boolean} options.isDatabase - Чи це експорт бази даних
 * @returns {boolean} Результат експорту
 */
export function exportFile(data, format, options = { isDatabase: false }) {
  try {
    let content;
    let filename;
    let mimeType;

    if (options.isDatabase) {
      const result = exportDatabaseFile(data, format);
      content = result.content;
      filename = result.filename;
      mimeType = result.mimeType;
    } else {
      const result = exportChatFile(data, format);
      content = result.content;
      filename = result.filename;
      mimeType = result.mimeType;
    }

    const url = createDownloadUrl(content, mimeType);
    downloadFile(url, filename);
    showNotification(`Дані експортовано у форматі ${format.toUpperCase()}`, 'success');
    return true;
  } catch (error) {
    console.error('Помилка експорту файлу:', error);
    showNotification('Помилка експорту файлу', 'error');
    return false;
  }
}

/**
 * Читати вміст файлу
 * @param {File} file - Файл для читання
 * @returns {Promise<string>} Вміст файлу
 */
async function readFileContent(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target.result);
    reader.onerror = (error) => reject(error);
    reader.readAsText(file);
  });
}

/**
 * Імпортувати файл бази даних
 * @param {string} content - Вміст файлу
 * @param {string} format - Формат файлу
 * @returns {boolean} Результат імпорту
 */
function importDatabaseFile(content, format) {
  try {
    let data;
    
    switch (format) {
      case 'json':
        data = JSON.parse(content);
        break;
      case 'csv':
        data = parseCsvToDatabase(content);
        break;
      case 'txt':
        data = parseTxtToDatabase(content);
        break;
      default:
        throw new Error('Непідтримуваний формат файлу');
    }

    if (importDatabase(data)) {
      renderDatabaseTable();
      showNotification('Базу даних успішно імпортовано', 'success');
      return true;
    }
    return false;
  } catch (error) {
    console.error('Помилка імпорту бази даних:', error);
    showNotification('Помилка імпорту бази даних', 'error');
    return false;
  }
}

/**
 * Імпортувати файл чату
 * @param {string} content - Вміст файлу
 * @param {string} format - Формат файлу
 * @returns {boolean} Результат імпорту
 */
function importChatFile(content, format) {
  try {
    // Отримуємо текстове поле для чату
    const chatInput = document.getElementById('chatInput');
    if (!chatInput) {
      throw new Error('Не знайдено поле введення чату');
    }

    // Встановлюємо вміст файлу в текстове поле
    chatInput.value = content;

    // Показуємо повідомлення про успішний імпорт
    showNotification('Файл чату успішно імпортовано', 'success');

    return true;
  } catch (error) {
    console.error('Помилка імпорту файлу чату:', error);
    showNotification('Помилка імпорту файлу чату', 'error');
    return false;
  }
}

/**
 * Експортувати базу даних у файл
 * @param {Object} data - Дані бази даних
 * @param {string} format - Формат експорту
 * @returns {Object} Результат експорту
 */
function exportDatabaseFile(data, format) {
  let content;
  let filename;
  let mimeType;

  switch (format) {
    case 'json':
      content = JSON.stringify(data, null, 2);
      filename = 'database.json';
      mimeType = 'application/json';
      break;
    case 'csv':
      content = convertDatabaseToCsv(data);
      filename = 'database.csv';
      mimeType = 'text/csv';
      break;
    case 'txt':
      content = convertDatabaseToTxt(data);
      filename = 'database.txt';
      mimeType = 'text/plain';
      break;
    default:
      throw new Error('Непідтримуваний формат експорту');
  }

  return { content, filename, mimeType };
}

/**
 * Експортувати дані чату у файл
 * @param {Object} data - Дані чату
 * @param {string} format - Формат експорту
 * @returns {Object} Результат експорту
 */
function exportChatFile(data, format) {
  let content;
  let filename;
  let mimeType;

  switch (format) {
    case 'json':
      content = JSON.stringify(data, null, 2);
      filename = 'chat.json';
      mimeType = 'application/json';
      break;
    case 'csv':
      content = convertChatToCsv(data);
      filename = 'chat.csv';
      mimeType = 'text/csv';
      break;
    case 'txt':
      content = convertChatToTxt(data);
      filename = 'chat.txt';
      mimeType = 'text/plain';
      break;
    default:
      throw new Error('Непідтримуваний формат експорту');
  }

  return { content, filename, mimeType };
}

/**
 * Конвертувати CSV у формат бази даних
 * @param {string} content - Вміст CSV файлу
 * @returns {Object} Дані бази даних
 */
function parseCsvToDatabase(content) {
  const lines = content.split(/\r?\n/).filter(line => line.trim());
  const headers = lines[0].split(',');
  
  const entries = lines.slice(1).map((line, index) => {
    const values = parseCSVLine(line);
    return {
      id: (index + 1).toString(),
      surname: values[headers.indexOf('Прізвище')] || '',
      firstname: values[headers.indexOf('Ім\'я')] || '',
      nicknames: [
        values[headers.indexOf('Нікнейм1')] || '',
        values[headers.indexOf('Нікнейм2')] || ''
      ].filter(n => n)
    };
  });

  return {
    version: '3.0',
    entries
  };
}

/**
 * Конвертувати TXT у формат бази даних
 * @param {string} content - Вміст TXT файлу
 * @returns {Object} Дані бази даних
 */
function parseTxtToDatabase(content) {
  const lines = content.split(/\r?\n/).filter(line => line.trim());
  
  const entries = lines.map((line, index) => {
    const parts = line.split(/\s+/);
    return {
      id: (index + 1).toString(),
      surname: parts[0] || '',
      firstname: parts.slice(1).join(' ') || '',
      nicknames: []
    };
  });

  return {
    version: '3.0',
    entries
  };
}

/**
 * Конвертувати базу даних у CSV
 * @param {Object} data - Дані бази даних
 * @returns {string} CSV контент
 */
function convertDatabaseToCsv(data) {
  const headers = ['ID', 'Прізвище', 'Ім\'я', 'Нікнейм1', 'Нікнейм2'];
  const rows = data.entries.map(entry => {
    const nickname1 = entry.nicknames[0] || '';
    const nickname2 = entry.nicknames[1] || '';
    return [
      entry.id,
      escapeCsvValue(entry.surname),
      escapeCsvValue(entry.firstname),
      escapeCsvValue(nickname1),
      escapeCsvValue(nickname2)
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Конвертувати базу даних у TXT
 * @param {Object} data - Дані бази даних
 * @returns {string} TXT контент
 */
function convertDatabaseToTxt(data) {
  return data.entries.map(entry => {
    const nicknames = entry.nicknames.length > 0 
      ? ` (${entry.nicknames.join(', ')})` 
      : '';
    return `${entry.surname} ${entry.firstname}${nicknames}`;
  }).join('\n');
}

/**
 * Конвертувати дані чату у CSV
 * @param {Object} data - Дані чату
 * @returns {string} CSV контент
 */
function convertChatToCsv(data) {
  // TODO: Implement chat to CSV conversion
  return '';
}

/**
 * Конвертувати дані чату у TXT
 * @param {Object} data - Дані чату
 * @returns {string} TXT контент
 */
function convertChatToTxt(data) {
  // TODO: Implement chat to TXT conversion
  return '';
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
    
    if (char === '"') {
      if (nextChar === '"') {
        currentValue += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(currentValue);
      currentValue = '';
    } else {
      currentValue += char;
    }
  }
  
  result.push(currentValue);
  return result;
}

/**
 * Екранує значення для CSV
 * @param {string} value - Значення для екранування
 * @returns {string} Екрановане значення
 */
function escapeCsvValue(value) {
  if (!value) return '';
  
  const needsQuotes = /[",\n\r]/.test(value);
  
  if (needsQuotes) {
    const escaped = value.replace(/"/g, '""');
    return `"${escaped}"`;
  }
  
  return value;
} 
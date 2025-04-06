/**
 * Модуль для імпорту/експорту бази даних
 */
import { showNotification } from '../core/notification.js';
import { 
  databaseData, 
  updateMappings, 
  saveDatabaseToLocalStorage, 
  updateDbStatusDisplay 
} from './database-core.js';
import { renderDatabaseTable } from './database-table.js';
import { initDatabaseImport } from '../parser/file-handler.js';

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
      importFile.click();
    });
    
    // Ініціалізуємо обробник для імпорту файлів
    initDatabaseImport(importFile);
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

/**
 * Імпортувати дані з JSON
 * @param {string} content - Вміст JSON файлу
 */
export function importJson(content) {
  try {
    const data = JSON.parse(content);
    
    // Перевіряємо структуру
    if (data.entries && Array.isArray(data.entries)) {
      databaseData.version = data.version || "3.0";
      databaseData.entries = data.entries;
      
      // Оновлюємо карти відповідності
      updateMappings();
      
      // Зберігаємо базу даних
      saveDatabaseToLocalStorage();
      
      // Оновлюємо таблицю
      renderDatabaseTable();
      
      // Оновлюємо статус бази даних на вкладці "Парсер"
      updateDbStatusDisplay();
      
      showNotification(`Імпортовано ${data.entries.length} записів з JSON`, 'success');
    } else if (data.database && Array.isArray(data.database)) {
      // Альтернативна структура
      databaseData.version = data.version || "3.0";
      databaseData.entries = data.database;
      
      // Оновлюємо карти відповідності
      updateMappings();
      
      // Зберігаємо базу даних
      saveDatabaseToLocalStorage();
      
      // Оновлюємо таблицю
      renderDatabaseTable();
      
      // Оновлюємо статус бази даних на вкладці "Парсер"
      updateDbStatusDisplay();
      
      showNotification(`Імпортовано ${data.database.length} записів з JSON`, 'success');
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
    const newEntries = [];
    
    // Парсимо дані
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      
      // Якщо рядок порожній або має недостатньо колонок, пропускаємо
      if (values.length <= Math.max(surnameIndex, firstnameIndex)) {
        continue;
      }
      
      // Формуємо нікнейми
      const nicknames = [];
      
      if (nickname1Index !== -1 && values[nickname1Index] && values[nickname1Index].trim()) {
        nicknames.push(values[nickname1Index].trim());
      }
      
      if (nickname2Index !== -1 && values[nickname2Index] && values[nickname2Index].trim()) {
        nicknames.push(values[nickname2Index].trim());
      }
      
      // Додаємо запис
      newEntries.push({
        id: idIndex !== -1 && values[idIndex] ? values[idIndex].trim() : (i).toString(),
        surname: values[surnameIndex].trim(),
        firstname: values[firstnameIndex].trim(),
        nicknames
      });
    }
    
    // Оновлюємо базу
    databaseData.version = "3.0";
    databaseData.entries = newEntries;
    
    // Оновлюємо карти відповідності
    updateMappings();
    
    // Зберігаємо базу даних
    saveDatabaseToLocalStorage();
    
    // Оновлюємо таблицю
    renderDatabaseTable();
    
    // Оновлюємо статус бази даних на вкладці "Парсер"
    updateDbStatusDisplay();
    
    showNotification(`Імпортовано ${newEntries.length} записів з CSV`, 'success');
  } catch (error) {
    console.error('Помилка імпорту CSV:', error);
    showNotification('Помилка імпорту CSV', 'error');
  }
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
    const newEntries = [];
    
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
      newEntries.push({
        id: (i + 1).toString(),
        surname,
        firstname,
        nicknames: []
      });
    }
    
    // Оновлюємо базу
    databaseData.version = "3.0";
    databaseData.entries = newEntries;
    
    // Оновлюємо карти відповідності
    updateMappings();
    
    // Зберігаємо базу даних
    saveDatabaseToLocalStorage();
    
    // Оновлюємо таблицю
    renderDatabaseTable();
    
    // Оновлюємо статус бази даних на вкладці "Парсер"
    updateDbStatusDisplay();
    
    showNotification(`Імпортовано ${newEntries.length} записів з текстового файлу`, 'success');
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
    // Заголовки
    const headers = ['ID', 'Прізвище', 'Ім\'я', 'Нікнейм1', 'Нікнейм2'];
    
    // Рядки даних
    const rows = databaseData.entries.map(entry => {
      const nickname1 = entry.nicknames && entry.nicknames.length > 0 ? entry.nicknames[0] : '';
      const nickname2 = entry.nicknames && entry.nicknames.length > 1 ? entry.nicknames[1] : '';
      
      return [entry.id, entry.surname, entry.firstname, nickname1, nickname2];
    });
    
    // Об'єднуємо в CSV
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    // Зберігаємо файл
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'database.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
    
    showNotification('Базу даних експортовано в CSV', 'success');
  } catch (error) {
    console.error('Помилка експорту CSV:', error);
    showNotification('Помилка експорту CSV', 'error');
  }
}

/**
 * Експортувати дані в JSON
 */
export function exportJson() {
  try {
    // Зберігаємо файл
    const jsonContent = JSON.stringify(databaseData, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'database.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
    
    showNotification('Базу даних експортовано в JSON', 'success');
  } catch (error) {
    console.error('Помилка експорту JSON:', error);
    showNotification('Помилка експорту JSON', 'error');
  }
}
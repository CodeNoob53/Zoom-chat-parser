/**
 * Модуль для експорту результатів аналізу в різні формати
 */
import { showNotification } from '../core/notification.js';
import { getParticipantInfo } from '../name-processing/name-database.js';
import { 
  createDownloadUrl, 
  downloadFile 
} from '../utils/file-utils.js';

/**
 * Зберегти список імен у файл TXT
 * @param {string[]} displayedNames - Масив відображуваних імен
 * @param {Object} realNameMap - Карта відповідності Zoom-імені до реального імені
 * @param {boolean} useDbChk - Чи використовувати базу імен
 * @param {Object} matchedNames - Результати порівняння з базою імен
 */
export function saveList(displayedNames, realNameMap, useDbChk, matchedNames) {
  if (!displayedNames.length) {
    showNotification("Список порожній, нема що зберігати.", "warning");
    return;
  }
  
  try {
    // Збираємо повну інформацію про учасників
    const participants = displayedNames.map(name => 
      getParticipantInfo(name, realNameMap)
    );
    
    // Створюємо табличний текст для експорту (з розділювачами табуляції)
    let content = "ID\tПрізвище\tІм'я\tZoom nickname\tСтатус\n";
    
    content += participants.map(p => {
      const status = p.foundInDb ? "В базі" : "Не знайдено в базі";
      
      return [
        p.id,
        p.surname || "-",
        p.firstname || "-",
        p.nickname,
        status
      ].join("\t");
    }).join("\n");
    
    // Створюємо URL для завантаження
    const url = createDownloadUrl(content, 'text/plain');
    
    // Завантажуємо файл
    downloadFile(url, 'participants.txt');
    
    showNotification("Список збережено успішно у форматі TXT!", "success");
  } catch (error) {
    console.error("Помилка при збереженні списку:", error);
    showNotification("Помилка при збереженні списку", "error");
  }
}

/**
 * Зберегти список імен у CSV файл
 * @param {string[]} displayedNames - Масив відображуваних імен
 * @param {Object} realNameMap - Карта відповідності Zoom-імені до реального імені
 * @param {boolean} useDbChk - Чи використовувати базу імен
 * @param {Object} matchedNames - Результати порівняння з базою імен
 */
export function saveCsv(displayedNames, realNameMap, useDbChk, matchedNames) {
  if (!displayedNames.length) {
    showNotification("Список порожній, нема що зберігати.", "warning");
    return;
  }
  
  try {
    // Збираємо повну інформацію про учасників
    const participants = displayedNames.map(name => 
      getParticipantInfo(name, realNameMap)
    );
    
    // Створюємо CSV текст для експорту
    let content = "ID,Прізвище,Ім'я,Zoom nickname,Статус\n";
    
    content += participants.map(p => {
      const status = p.foundInDb ? "В базі" : "Не знайдено в базі";
      
      // Екранування даних для CSV
      const surname = p.surname ? escapeCsvValue(p.surname) : '"-"';
      const firstname = p.firstname ? escapeCsvValue(p.firstname) : '"-"';
      const nickname = escapeCsvValue(p.nickname);
      
      return [
        p.id,
        surname,
        firstname,
        nickname,
        `"${status}"`
      ].join(",");
    }).join("\n");
    
    // Створюємо URL для завантаження
    const url = createDownloadUrl(content, 'text/csv');
    
    // Завантажуємо файл
    downloadFile(url, 'participants.csv');
    
    showNotification("Список збережено успішно у форматі CSV!", "success");
  } catch (error) {
    console.error("Помилка при збереженні CSV:", error);
    showNotification("Помилка при збереженні списку у форматі CSV", "error");
  }
}

/**
 * Екранує значення для CSV
 * @param {string} value - Значення для екранування
 * @returns {string} Екрановане значення
 */
function escapeCsvValue(value) {
  if (!value) return '""';
  
  // Якщо значення містить коми, лапки або переноси рядка, обгортаємо його в лапки
  const needsQuotes = /[",\n\r]/.test(value);
  
  if (needsQuotes) {
    // Дублюємо лапки всередині значення
    const escaped = value.replace(/"/g, '""');
    return `"${escaped}"`;
  }
  
  return `"${value}"`;
}

/**
 * Зберегти список імен у JSON файл
 * @param {string[]} displayedNames - Масив відображуваних імен
 * @param {Object} realNameMap - Карта відповідності Zoom-імені до реального імені
 * @param {boolean} useDbChk - Чи використовувати базу імен
 * @param {Object} matchedNames - Результати порівняння з базою імен
 */
export function saveJson(displayedNames, realNameMap, useDbChk, matchedNames) {
  if (!displayedNames.length) {
    showNotification("Список порожній, нема що зберігати.", "warning");
    return;
  }
  
  try {
    // Збираємо повну інформацію про учасників
    const participants = displayedNames.map(name => 
      getParticipantInfo(name, realNameMap)
    );
    
    // Створюємо JSON об'єкт для експорту
    const jsonData = {
      version: "3.0",
      date: new Date().toISOString(),
      totalParticipants: participants.length,
      participants: participants.map(p => {
        return {
          id: p.id,
          surname: p.surname || "",
          firstname: p.firstname || "",
          nickname: p.nickname,
          inDatabase: p.foundInDb,
          matchType: p.matchType || "none"
        };
      })
    };
    
    // Створюємо URL для завантаження
    const url = createDownloadUrl(JSON.stringify(jsonData, null, 2), 'application/json');
    
    // Завантажуємо файл
    downloadFile(url, 'participants.json');
    
    showNotification("Список збережено успішно у форматі JSON!", "success");
  } catch (error) {
    console.error("Помилка при збереженні JSON:", error);
    showNotification("Помилка при збереженні списку у форматі JSON", "error");
  }
}
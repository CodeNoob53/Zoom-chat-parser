import { showNotification } from './notification.js';
import { getParticipantInfo } from './name-database.js';

/**
 * Зберегти список імен у файл
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
  
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "participants.txt";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showNotification("Список збережено успішно у форматі TXT!", "success");
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
  
  // Збираємо повну інформацію про учасників
  const participants = displayedNames.map(name => 
    getParticipantInfo(name, realNameMap)
  );
  
  // Створюємо CSV текст для експорту
  let content = "ID,Прізвище,Ім'я,Zoom nickname,Статус\n";
  
  content += participants.map(p => {
    const status = p.foundInDb ? "В базі" : "Не знайдено в базі";
    
    // Екрануємо коми
    const surname = p.surname ? `"${p.surname.replace(/"/g, '""')}"` : '"-"';
    const firstname = p.firstname ? `"${p.firstname.replace(/"/g, '""')}"` : '"-"';
    const nickname = `"${p.nickname.replace(/"/g, '""')}"`;
    
    return [
      p.id,
      surname,
      firstname,
      nickname,
      `"${status}"`
    ].join(",");
  }).join("\n");
  
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "participants.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showNotification("Список збережено успішно у форматі CSV!", "success");
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
  
  const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "participants.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showNotification("Список збережено успішно у форматі JSON!", "success");
}
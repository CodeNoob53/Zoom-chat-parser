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
  showNotification("Список збережено успішно!", "success");
}
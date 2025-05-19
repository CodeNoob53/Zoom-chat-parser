/**
 * Модуль для експорту даних чату
 */
import { showNotification } from '../../core/notification.js';
import { exportChatData } from './chat-operations.js';

/**
 * Зберегти список учасників у файл
 * @param {NameMatcher} nameMatcher - Екземпляр класу NameMatcher
 * @param {string[]} displayedNames - Масив відображуваних імен
 * @param {Object} realNameMap - Карта відповідності Zoom-імені до реального імені
 * @param {boolean} useDbChk - Чи використовувати базу імен
 * @param {Object} matchedNames - Результати порівняння з базою імен
 * @param {string} format - Формат експорту ('txt', 'csv', 'json')
 */
export function saveParticipants(nameMatcher, displayedNames, realNameMap, useDbChk, matchedNames, format) {
  if (!displayedNames.length) {
    showNotification("Список порожній, нема що зберігати.", "warning");
    return;
  }
  
  try {
    // Збираємо повну інформацію про учасників
    const participants = displayedNames.map(name => 
      nameMatcher.getParticipantInfo(name, realNameMap)
    );
    
    // Створюємо дані для експорту
    const exportData = {
      version: "3.0",
      date: new Date().toISOString(),
      totalParticipants: participants.length,
      participants: participants.map(p => ({
        id: p.id,
        surname: p.surname || "",
        firstname: p.firstname || "",
        nickname: p.nickname,
        inDatabase: p.foundInDb,
        matchType: p.matchType || "none"
      }))
    };
    
    // Експортуємо дані
    exportChatData(exportData, format);
  } catch (error) {
    console.error(`Помилка при збереженні списку у форматі ${format.toUpperCase()}:`, error);
    showNotification(`Помилка при збереженні списку у форматі ${format.toUpperCase()}`, "error");
  }
} 
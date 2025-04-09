/**
 * Утилітарні функції для UI компонентів
 */
import { 
  levenshteinDistance, 
  getSimilarity, 
  areStringSimilar 
} from '../utils/string-utils.js';

// Експортуємо функції зі string-utils для зворотної сумісності
export { 
  levenshteinDistance, 
  getSimilarity, 
  areStringSimilar 
};

/**
 * Форматує дату у людино-читабельний формат
 * @param {Date|string} date - Дата для форматування
 * @param {boolean} includeTime - Чи включати час
 * @returns {string} Форматована дата
 */
export function formatDate(date, includeTime = false) {
  if (!date) return '';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(d.getTime())) return '';
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  
  let result = `${day}.${month}.${year}`;
  
  if (includeTime) {
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    result += ` ${hours}:${minutes}`;
  }
  
  return result;
}

/**
 * Створює ідентифікатор елемента на основі тексту
 * @param {string} text - Текст для перетворення на ідентифікатор
 * @returns {string} Безпечний ідентифікатор
 */
export function createElementId(text) {
  if (!text) return 'id-' + Math.random().toString(36).substring(2, 9);
  
  return text
    .toLowerCase()
    .replace(/[^\w\u0400-\u04FF]+/g, '-') // Заміна не-буквених символів на дефіс
    .replace(/^-+|-+$/g, '') // Видалення початкових і кінцевих дефісів
    .substring(0, 30) // Обмеження довжини
    || 'id-' + Math.random().toString(36).substring(2, 9); // Запасний варіант
}

/**
 * Ескейпить HTML-символи для безпечного відображення в DOM
 * @param {string} html - Текст для ескейпу
 * @returns {string} Безпечний HTML-текст
 */
export function escapeHtml(html) {
  if (!html) return '';
  
  return String(html)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Скорочує текст до певної довжини з додаванням багатокрапки
 * @param {string} text - Текст для скорочення
 * @param {number} maxLength - Максимальна довжина
 * @returns {string} Скорочений текст
 */
export function truncateText(text, maxLength = 100) {
  if (!text || text.length <= maxLength) return text || '';
  
  return text.substring(0, maxLength - 3) + '...';
}
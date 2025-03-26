import { elements } from './dom.js';

/**
 * Показує сповіщення користувачу
 * @param {string} message - Текст сповіщення
 * @param {string} type - Тип сповіщення ('success', 'warning', 'error')
 */
export function showNotification(message, type) {
  const { notification } = elements;
  
  notification.textContent = message;
  notification.className = type;
  notification.style.display = "block";
  notification.style.opacity = "1";

  // Автоматично приховуємо повідомлення через 3 секунди
  setTimeout(() => {
    notification.style.opacity = "0";
    setTimeout(() => {
      notification.style.display = "none";
    }, 500);
  }, 3000);
}
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
  
  // Додаємо клас для анімації
  notification.classList.add('animate-notification-in');

  // Автоматично приховуємо повідомлення через 3 секунди
  setTimeout(() => {
    // Замінюємо клас анімації
    notification.classList.remove('animate-notification-in');
    notification.classList.add('animate-notification-out');
    
    // Ховаємо після завершення анімації
    setTimeout(() => {
      notification.style.display = "none";
      // Видаляємо клас анімації для наступного показу
      notification.classList.remove('animate-notification-out');
    }, 300);
  }, 3000);
}
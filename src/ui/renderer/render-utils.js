/**
 * Утиліти для керування процесом рендерингу з підтримкою кешування та оптимізацій
 */

// Функція, яка буде встановлена ззовні для виклику ререндерингу
let rerenderCallback = null;

// Змінні для керування оптимізацією рендерингу
let renderThrottleTimer = null;
const THROTTLE_DELAY = 50; // Мінімальний час між рендерингами (мс)
let lastRenderTime = 0;

/**
 * Встановлює функцію для ререндерингу
 * @param {Function} callback - Функція, яка викликатиме ререндеринг
 */
export function setRerenderCallback(callback) {
  rerenderCallback = callback;
}

/**
 * Викликає ререндеринг списку учасників з обмеженням частоти викликів
 * для запобігання частого оновлення DOM
 */
export function triggerRerender() {
  if (!rerenderCallback) return;
  
  const now = Date.now();
  const timeSinceLastRender = now - lastRenderTime;
  
  // Якщо з моменту останнього рендерингу пройшло менше часу, ніж THROTTLE_DELAY,
  // встановлюємо таймер на виклик ререндерингу через залишок часу
  if (timeSinceLastRender < THROTTLE_DELAY) {
    // Скасовуємо попередній таймер, якщо він був
    if (renderThrottleTimer) {
      clearTimeout(renderThrottleTimer);
    }
    
    // Встановлюємо новий таймер
    renderThrottleTimer = setTimeout(() => {
      lastRenderTime = Date.now();
      rerenderCallback();
      renderThrottleTimer = null;
    }, THROTTLE_DELAY - timeSinceLastRender);
  } else {
    // Якщо пройшло достатньо часу, викликаємо ререндеринг негайно
    lastRenderTime = now;
    rerenderCallback();
  }
}

/**
 * Застосовує зміну до стану відображення і викликає ререндеринг
 * @param {Function} stateMutation - Функція, яка змінює стан
 */
export function updateAndRender(stateMutation) {
  if (typeof stateMutation === 'function') {
    stateMutation();
  }
  triggerRerender();
}

/**
 * Перевіряє, чи змінилися об'єкти (для запобігання зайвим оновленням)
 * @param {Object} obj1 - Перший об'єкт
 * @param {Object} obj2 - Другий об'єкт
 * @returns {boolean} true, якщо об'єкти різні
 */
export function hasChanged(obj1, obj2) {
  // Швидка перевірка по посиланню
  if (obj1 === obj2) return false;
  
  // Якщо один з об'єктів відсутній, вони різні
  if (!obj1 || !obj2) return true;
  
  // Перевірка на масиви
  if (Array.isArray(obj1) && Array.isArray(obj2)) {
    if (obj1.length !== obj2.length) return true;
    
    // Перевіряємо елементи масиву
    for (let i = 0; i < obj1.length; i++) {
      if (obj1[i] !== obj2[i]) return true;
    }
    
    return false;
  }
  
  // Перевірка на об'єкти
  if (typeof obj1 === 'object' && typeof obj2 === 'object') {
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);
    
    if (keys1.length !== keys2.length) return true;
    
    for (const key of keys1) {
      if (!obj2.hasOwnProperty(key) || obj1[key] !== obj2[key]) {
        return true;
      }
    }
    
    return false;
  }
  
  // Інші випадки - просто порівнюємо значення
  return obj1 !== obj2;
}
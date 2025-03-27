// Функція, яка буде встановлена ззовні для виклику ререндерингу
let rerenderCallback = null;

/**
 * Встановлює функцію для ререндерингу
 * @param {Function} callback - Функція, яка викликатиме ререндеринг
 */
export function setRerenderCallback(callback) {
  rerenderCallback = callback;
}

/**
 * Викликає ререндеринг списку учасників
 */
export function triggerRerender() {
  if (rerenderCallback) {
    rerenderCallback();
  }
}
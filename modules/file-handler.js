import { elements } from './dom.js';
import { parseNameDatabase } from './name-database.js';
import { showNotification } from './notification.js';

/**
 * Ініціалізує обробники подій для файлів з покращеною безпекою
 */
export function initFileHandlers() {
  const { fileInput, chatInput, dbFileInput } = elements;
  
  // Коли вибрано файл чату
  fileInput.addEventListener("change", () => {
    if (fileInput.files && fileInput.files[0]) {
      const file = fileInput.files[0];
      
      // Перевірка розміру файлу (не більше 5 МБ)
      if (file.size > 5 * 1024 * 1024) {
        showNotification("Файл занадто великий. Максимальний розмір 5 МБ.", "error");
        fileInput.value = "";
        return;
      }
      
      // Перевірка типу файлу (дозволяємо тільки текстові файли)
      if (file.type && !file.type.match('text.*') && !file.name.endsWith('.txt')) {
        showNotification("Дозволені тільки текстові файли (.txt)", "error");
        fileInput.value = "";
        return;
      }
      
      const reader = new FileReader();
      
      // Обробка помилок при читанні
      reader.onerror = () => {
        showNotification("Помилка читання файлу", "error");
        fileInput.value = "";
      };
      
      reader.onload = (e) => {
        try {
          // Перевірка на потенційно шкідливий контент (XSS, JavaScript ін'єкції)
          const content = e.target.result;
          
          // Перевіряємо наявність скриптів та HTML
          if (containsScriptTags(content)) {
            showNotification("Файл може містити потенційно шкідливий код", "error");
            fileInput.value = "";
            return;
          }
          
          // Валідний файл, використовуємо його контент
          chatInput.value = sanitizeContent(content);
          
          // Скидаємо значення input файлу після завантаження
          fileInput.value = "";
        } catch (error) {
          console.error("Помилка обробки файлу:", error);
          showNotification("Помилка обробки файлу", "error");
          fileInput.value = "";
        }
      };
      
      // Безпечне читання як текст
      reader.readAsText(file);
    }
  });
  
  // Коли вибрано файл бази імен
  dbFileInput.addEventListener("change", () => {
    if (dbFileInput.files && dbFileInput.files[0]) {
      const file = dbFileInput.files[0];
      
      // Перевірка розміру файлу (не більше 2 МБ)
      if (file.size > 2 * 1024 * 1024) {
        showNotification("Файл бази занадто великий. Максимальний розмір 2 МБ.", "error");
        dbFileInput.value = "";
        return;
      }
      
      // Перевірка типу файлу
      if (file.type && !file.type.match('text.*') && !file.name.endsWith('.txt')) {
        showNotification("Дозволені тільки текстові файли (.txt)", "error");
        dbFileInput.value = "";
        return;
      }
      
      const reader = new FileReader();
      
      // Обробка помилок при читанні
      reader.onerror = () => {
        showNotification("Помилка читання файлу бази", "error");
        dbFileInput.value = "";
      };
      
      reader.onload = (e) => {
        try {
          const content = e.target.result;
          
          // Перевіряємо на скрипти та HTML
          if (containsScriptTags(content)) {
            showNotification("Файл бази  може містити потенційно шкідливий код", "error");
            dbFileInput.value = "";
            return;
          }
          
          // Безпечний виклик парсеру бази імен із санітизованим контентом
          parseNameDatabase(sanitizeContent(content));
          
          // Скидаємо значення input файлу після завантаження
          dbFileInput.value = "";
        } catch (error) {
          console.error("Помилка обробки файлу бази:", error);
          showNotification("Помилка обробки файлу бази", "error");
          dbFileInput.value = "";
        }
      };
      
      reader.readAsText(file);
    }
  });
}

/**
 * Перевіряє, чи містить контент потенційно шкідливі скрипти
 * @param {string} content - Контент для перевірки
 * @returns {boolean} - true, якщо знайдено небезпечний контент
 */
function containsScriptTags(content) {
  if (typeof content !== 'string') return false;
  
  // Шаблони для пошуку потенційно шкідливого коду
  const dangerousPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, // <script> теги
    /javascript:/gi,                                       // javascript: протокол
    /on\w+\s*=/gi,                                         // onload, onclick і т.д.
    /document\.cookie/gi,                                  // доступ до кукі
    /eval\s*\(/gi,                                         // виклики eval
    /execScript/gi,                                        // execScript
    /Function\s*\(/gi,                                     // Function constructor
    /setInterval|setTimeout|setImmediate/gi                // setTimeout і т.д.
  ];
  
  return dangerousPatterns.some(pattern => pattern.test(content));
}

/**
 * Санітизує вхідний контент від потенційно шкідливих елементів
 * @param {string} content - Контент для санітизації
 * @returns {string} - Очищений контент
 */
function sanitizeContent(content) {
  if (typeof content !== 'string') return '';
  
  // Заміна потенційно небезпечних символів на безпечні еквіваленти
  return content
    .replace(/<script/gi, '&lt;script')
    .replace(/<\/script>/gi, '&lt;/script&gt;')
    .replace(/javascript:/gi, 'javascript_blocked:')
    .replace(/on\w+\s*=/gi, 'data-blocked-event=');
}
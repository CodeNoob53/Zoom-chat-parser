import { elements } from '../core/dom.js';
import { showNotification } from '../core/notification.js';
import { importTxt, importCsv, importJson } from '../database/database-import-export.js';
/**
 * Ініціалізує обробники подій для файлів з покращеною безпекою
 */
export function initFileHandlers() {
  const { fileInput, chatInput } = elements;
  
  // Перевірка наявності елементів перед додаванням слухачів
  if (fileInput) {
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
  }
  
  // Тепер в елементі dbFileInput немає потреби, 
  // оскільки ми використовуємо dbImportFile з database-import-export.js
}

/**
 * Ініціалізує обробник імпорту для вкладки "База"
 * @param {HTMLElement} importFile - Елемент інпуту для файлу
 */
export function initDatabaseImport(importFile) {
  if (!importFile) return;
  
  importFile.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Перевірка розміру файлу (не більше 2 МБ)
    if (file.size > 2 * 1024 * 1024) {
      showNotification("Файл бази занадто великий. Максимальний розмір 2 МБ.", "error");
      importFile.value = "";
      return;
    }
    
    // Перевірка типу файлу
    const isValidType = file.type.match('text.*') || 
                      file.name.endsWith('.txt') || 
                      file.name.endsWith('.csv') || 
                      file.name.endsWith('.json');
    
    if (!isValidType) {
      showNotification("Підтримуються формати: TXT, CSV, JSON", "error");
      importFile.value = "";
      return;
    }
    
    const reader = new FileReader();
    
    reader.onerror = () => {
      showNotification("Помилка читання файлу бази", "error");
      importFile.value = "";
    };
    
    reader.onload = (event) => {
      try {
        const content = event.target.result;
        
        // Перевіряємо на скрипти та HTML
        if (containsScriptTags(content)) {
          showNotification("Файл бази може містити потенційно шкідливий код", "error");
          importFile.value = "";
          return;
        }
        
        // Визначаємо формат файлу та імпортуємо
        if (file.name.endsWith('.json') || content.trim().startsWith('{')) {
          importJson(sanitizeContent(content));
        } else if (file.name.endsWith('.csv') || content.includes(',')) {
          importCsv(sanitizeContent(content));
        } else {
          importTxt(sanitizeContent(content));
        }
        
        // Скидаємо значення поля файлу
        importFile.value = "";
      } catch (error) {
        console.error("Помилка обробки файлу бази:", error);
        showNotification("Помилка обробки файлу бази", "error");
        importFile.value = "";
      }
    };
    
    reader.readAsText(file);
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
export function sanitizeContent(content) {
  if (typeof content !== 'string') return '';
  
  // Заміна потенційно небезпечних символів на безпечні еквіваленти
  return content
    .replace(/<script/gi, '&lt;script')
    .replace(/<\/script>/gi, '&lt;/script&gt;')
    .replace(/javascript:/gi, 'javascript_blocked:')
    .replace(/on\w+\s*=/gi, 'data-blocked-event=');
}
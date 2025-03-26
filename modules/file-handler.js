import { elements } from './dom.js';
import { parseNameDatabase } from './name-database.js';

/**
 * Ініціалізує обробники подій для файлів
 */
export function initFileHandlers() {
  const { fileInput, chatInput, dbFileInput } = elements;
  
  // Коли вибрано файл чату
  fileInput.addEventListener("change", () => {
    if (fileInput.files && fileInput.files[0]) {
      const reader = new FileReader();
      reader.onload = (e) => {
        chatInput.value = e.target.result;
      };
      reader.readAsText(fileInput.files[0]);
    }
  });
  
  // Коли вибрано файл бази імен
  dbFileInput.addEventListener("change", () => {
    if (dbFileInput.files && dbFileInput.files[0]) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target.result;
        parseNameDatabase(content);
      };
      reader.readAsText(dbFileInput.files[0]);
    }
  });
}
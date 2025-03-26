/**
 * Зберігаємо дані про повідомлення по імені
 */
let messagesByName = {};
/**
 * Зберігаємо унікальні імена (Set не дасть дублікатів)
 */
let uniqueNames = new Set();
/**
 * Зберігаємо відповідність реальних імен до імен Zoom
 */
let realNameMap = {};

/**
 * "Очистка" повідомлення від цитат і емоджі-реакцій
 * @param {string} rawMsg - Сире повідомлення
 * @returns {string} Очищене повідомлення
 */
function sanitizeMessage(rawMsg) {
  let sanitized = rawMsg;
  sanitized = sanitized.replace(/^Replying to\s+"[^"]*":.*$/gm, "");
  sanitized = sanitized.replace(
    /^[\p{L}\p{M}\s,'-]+:[\p{Extended_Pictographic}\p{Emoji_Presentation}\p{So}]+$/gmu,
    ""
  );
  sanitized = sanitized.replace(/\n\s*\n+/g, "\n");
  sanitized = sanitized.trim();
  return sanitized;
}

/**
 * Пошук тегу rnm: та обробка реального імені
 * @param {string} message - Повідомлення для пошуку тегу
 * @returns {string|null} Знайдене реальне ім'я або null
 */
function findRealName(message) {
  const regex = /rnm:\s*([^]*)$/i;
  const match = message.match(regex);
  return match ? match[1].trim() : null;
}

/**
 * Парсинг тексту чату
 * @param {string} text - Текст чату
 * @param {string} keyword - Ключове слово для фільтрації (опціонально)
 * @returns {Object} Об'єкт з результатами парсингу
 */
export function parseChat(text, keyword = "") {
  messagesByName = {};
  uniqueNames.clear();
  realNameMap = {};
  
  const regex = /(\d{2}:\d{2}:\d{2})\s+From\s+(.*?)\s+to\s+(.*?):(.*?)(?=\d{2}:\d{2}:\d{2}\s+From|$)/gs;

  let match;
  while ((match = regex.exec(text)) !== null) {
    const time = match[1];
    const name = match[2].trim();
    const fullBlock = match[4] || "";
    const blockLines = fullBlock
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    let userMessage = "";
    if (blockLines.length > 0) {
      if (blockLines[0].startsWith('Replying to "')) {
        userMessage = blockLines[1] || "";
      } else {
        userMessage = blockLines[0];
      }
    }

    const cleanMessage = sanitizeMessage(userMessage);
    if (cleanMessage) {
      if (!messagesByName[name]) {
        messagesByName[name] = [];
      }
      messagesByName[name].push(cleanMessage);
      
      // Перевіряємо, чи містить повідомлення тег rnm:
      const realName = findRealName(cleanMessage);
      if (realName) {
        realNameMap[name] = realName;
      }
    }
  }

  for (let nm in messagesByName) {
    uniqueNames.add(nm);
  }

  let displayedNames = [...uniqueNames];
  
  // Фільтрація за ключовим словом, якщо задано
  if (keyword && keyword.trim()) {
    const keywordLower = keyword.toLowerCase();
    displayedNames = displayedNames.filter((nm) =>
      messagesByName[nm].some((msg) =>
        msg.toLowerCase().includes(keywordLower)
      )
    );
  }

  return {
    displayedNames,
    realNameMap
  };
}

/**
 * Отримати реальні імена
 * @returns {Object} Карта відповідності Zoom-імені до реального імені
 */
export function getRealNameMap() {
  return realNameMap;
}
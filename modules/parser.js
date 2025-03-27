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
 * Обробка імені учасника для виділення інформації з дужок та скорочень
 * @param {string} name - Ім'я учасника
 * @returns {Object} Об'єкт з оригінальним ім'ям та додатковою інформацією
 */
function processName(name) {
  if (!name) return { original: "", processed: "", extra: "" };
  
  const original = name.trim();
  let processed = original;
  let extra = "";
  
  // Шаблон для розпізнавання імен у форматі "Name (Full Name)" або "Nickname (Real Name)"
  const bracketMatch = original.match(/^(.*?)\s*\((.*?)\)$/);
  if (bracketMatch) {
    const beforeBracket = bracketMatch[1].trim();
    const inBracket = bracketMatch[2].trim();
    
    // Визначаємо, яка частина є ім'ям, а яка - додатковою інформацією
    // Якщо в дужках абревіатура чи короткий текст, то основне ім'я - перед дужками
    if (inBracket.length < 5 || /^[A-ZА-ЯІЇЄҐ]+$/.test(inBracket)) {
      processed = beforeBracket;
      extra = inBracket;
    } else {
      // Якщо в дужках повне ім'я (містить пробіл або довше), то використовуємо його
      const hasParts = inBracket.includes(" ");
      const isFullName = hasParts || inBracket.length > beforeBracket.length;
      
      if (isFullName) {
        processed = inBracket;
        extra = beforeBracket; // Зберігаємо нікнейм як додаткову інформацію
      } else {
        processed = beforeBracket;
        extra = inBracket;
      }
    }
  }
  
  // Обробка імен у форматі "Name [info]"
  const bracketMatch2 = processed.match(/^(.*?)\s*\[(.*?)\]$/);
  if (bracketMatch2) {
    processed = bracketMatch2[1].trim();
    const brackInfo = bracketMatch2[2].trim();
    extra = extra ? `${extra}, ${brackInfo}` : brackInfo;
  }
  
  return { original, processed, extra };
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
    const rawName = match[2].trim();
    const fullBlock = match[4] || "";
    const blockLines = fullBlock
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    // Обробляємо ім'я учасника для виділення додаткової інформації
    const { original: originalName, processed: name, extra: extraInfo } = processName(rawName);

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
      // Використовуємо оброблене ім'я
      if (!messagesByName[name]) {
        messagesByName[name] = [];
      }
      messagesByName[name].push(cleanMessage);
      
      // Зберігаємо оригінальне ім'я з дужками, якщо воно відрізняється
      if (originalName !== name && !messagesByName[originalName]) {
        messagesByName[originalName] = [cleanMessage];
        // Додаємо зв'язок між оригінальним та обробленим ім'ям
        realNameMap[originalName] = name;
      }
      
      // Якщо є додаткова інформація, яка схожа на ім'я (містить пробіл), додаємо її як реальне ім'я
      if (extraInfo && extraInfo.includes(" ")) {
        realNameMap[name] = extraInfo;
      }
      
      // Перевіряємо, чи містить повідомлення тег rnm:
      const realName = findRealName(cleanMessage);
      if (realName) {
        realNameMap[name] = realName;
      }
    }
  }

  // Додаємо всі знайдені імена в унікальний набір
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
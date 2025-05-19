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
 * Підтримувані формати чату за мовами
 */
const chatPatterns = {
  english: {
    from: "From",
    to: "to",
    everyone: "Everyone",
    replyPrefix: "Replying to"
  },
  ukrainian: {
    from: "Від",
    to: "до",
    everyone: "Всі",
    replyPrefix: "Відповідь на"
  },
  russian: {
    from: "От",
    to: "кому",
    everyone: "Все",
    replyPrefix: "Ответ на"
  }
};

/**
 * "Очистка" повідомлення від цитат і емоджі-реакцій
 * @param {string} rawMsg - Сире повідомлення
 * @returns {string} Очищене повідомлення
 */
function sanitizeMessage(rawMsg) {
  let sanitized = rawMsg;
  
  // Очищення відповідей у всіх підтримуваних мовах
  Object.values(chatPatterns).forEach(pattern => {
    const escapeRegExp = (string) => {
      return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    };
    const escapedPrefix = escapeRegExp(pattern.replyPrefix);
    sanitized = sanitized.replace(new RegExp(`^${escapedPrefix}\\s+"[^"]*":.*$`, 'gm'), "");
  });
  
  // Очищення емоджі-реакцій
  sanitized = sanitized.replace(
    /^[\p{L}\p{M}\s,'-]+:[\p{Extended_Pictographic}\p{Emoji_Presentation}\p{So}]+$/gmu,
    ""
  );
  
  // Прибирання зайвих порожніх рядків
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
  
  // Створюємо шаблон регулярного виразу на основі підтримуваних мовних патернів
  const fromOptions = Object.values(chatPatterns).map(p => p.from).join('|');
  const toOptions = Object.values(chatPatterns).map(p => p.to).join('|');
  const everyoneOptions = Object.values(chatPatterns).map(p => p.everyone).join('|');
  
  // Модифікований регулярний вираз для підтримки різних мовних форматів
  const regex = new RegExp(
    `(\\d{2}:\\d{2}:\\d{2})\\s+(?:${fromOptions})\\s+(.*?)\\s+(?:${toOptions})\\s+(?:${everyoneOptions}):(.*?)(?=\\d{2}:\\d{2}:\\d{2}\\s+(?:${fromOptions})|$)`,
    'gs'
  );

  let match;
  while ((match = regex.exec(text)) !== null) {
    const time = match[1];
    const rawName = match[2].trim();
    const fullBlock = match[3] || "";
    const blockLines = fullBlock
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    // Обробляємо ім'я учасника для виділення додаткової інформації
    const { original: originalName, processed: name, extra: extraInfo } = processName(rawName);

    let userMessage = "";
    if (blockLines.length > 0) {
      // Перевіряємо, чи повідомлення є відповіддю на інше повідомлення у будь-якій мові
      const isReply = Object.values(chatPatterns).some(pattern => 
        blockLines[0].startsWith(`${pattern.replyPrefix} "`)
      );
      
      if (isReply) {
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
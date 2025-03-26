const chatInput = document.getElementById("chatInput");
const fileInput = document.getElementById("fileInput");
const parseBtn = document.getElementById("parseBtn");

const useKeywordChk = document.getElementById("useKeywordChk");
const keywordInput = document.getElementById("keywordInput");

const namesList = document.getElementById("namesList");
const countNamesSpan = document.getElementById("countNames");

const sortBtn = document.getElementById("sortBtn");
const saveBtn = document.getElementById("saveBtn");

// Нові елементи для бази імен
const useDbChk = document.getElementById("useDbChk");
const dbFileInput = document.getElementById("dbFileInput");
const dbStatus = document.getElementById("dbStatus");

// Дані
let messagesByName = {};
// Зберігаємо унікальні імена (Set не дасть дублікатів)
let uniqueNames = new Set();
let displayedNames = [];
let isSortedAsc = true; // Стан сортування
// Зберігаємо відповідність реальних імен до імен Zoom
let realNameMap = {};

// Нові структури даних для бази імен
let nameDatabase = {}; // Формат: {name: id, ...}
let matchedNames = {}; // Формат: {name: id, ...} для знайдених співпадінь

// 1) При виборі файлу обробка завантаження файлу
fileInput.addEventListener("change", () => {
  if (fileInput.files && fileInput.files[0]) {
    const reader = new FileReader();
    reader.onload = (e) => {
      chatInput.value = e.target.result;
    };
    reader.readAsText(fileInput.files[0]);
  }
});

// 2) Показати / приховати поле для ключового слова
useKeywordChk.addEventListener("change", () => {
  if (useKeywordChk.checked) {
    keywordInput.style.display = "inline-block";
  } else {
    keywordInput.style.display = "none";
    keywordInput.value = "";
  }
});

// Нова функція: Показати / приховати поле для файлу бази імен
useDbChk.addEventListener("change", () => {
  if (useDbChk.checked) {
    dbFileInput.style.display = "inline-block";
  } else {
    dbFileInput.style.display = "none";
    // Скидаємо базу даних при знятті галки
    nameDatabase = {};
    dbStatus.textContent = "База не завантажена";
    dbStatus.classList.remove("loaded");
  }
});

// Функція для завантаження бази імен
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

// Функція парсингу бази імен
function parseNameDatabase(content) {
  nameDatabase = {}; // Очищуємо попередню базу
  const lines = content.split(/\r?\n/).filter(line => line.trim());
  
  let validEntries = 0;
  
  lines.forEach((line, index) => {
    // Формат рядка: "Ім'я Прізвище: ID" або просто "Ім'я Прізвище"
    const match = line.match(/^(.*?)(?::|\s+)(\d+)$/);
    
    if (match) {
      const name = match[1].trim();
      const id = match[2].trim();
      nameDatabase[name] = id;
      validEntries++;
    } else if (line.trim()) {
      // Якщо немає ID, але рядок не пустий, присвоюємо автоматичний ID
      nameDatabase[line.trim()] = (index + 1).toString();
      validEntries++;
    }
  });
  
  if (validEntries > 0) {
    dbStatus.textContent = `База завантажена: ${validEntries} записів`;
    dbStatus.classList.add("loaded");
  } else {
    dbStatus.textContent = "Помилка завантаження бази";
    dbStatus.classList.remove("loaded");
  }
}

// Функція "очистки" повідомлення від цитат і емоджі-реакцій
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

// Функція для пошуку тегу rnm: та обробки реального імені
function findRealName(message) {
  const regex = /rnm:\s*([^]*)$/i;
  const match = message.match(regex);
  return match ? match[1].trim() : null;
}

// 3) Парсити
parseBtn.addEventListener("click", () => {
  const text = chatInput.value;
  if (!text.trim()) {
    showNotification("Вставте текст чату або завантажте файл!", "warning");
    return;
  }

  messagesByName = {};
  uniqueNames.clear();
  realNameMap = {};
  matchedNames = {}; // Очищуємо мапу співпадінь
  displayedNames = [];
  namesList.innerHTML = "";
  countNamesSpan.textContent = "0";

  const regex =
    /(\d{2}:\d{2}:\d{2})\s+From\s+(.*?)\s+to\s+(.*?):(.*?)(?=\d{2}:\d{2}:\d{2}\s+From|$)/gs;

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

  if (useKeywordChk.checked && keywordInput.value.trim()) {
    const keyword = keywordInput.value.toLowerCase();
    displayedNames = [...uniqueNames].filter((nm) =>
      messagesByName[nm].some((msg) =>
        msg.toLowerCase().includes(keyword)
      )
    );
  } else {
    displayedNames = [...uniqueNames];
  }

  // Порівняння з базою імен, якщо увімкнено
  if (useDbChk.checked && Object.keys(nameDatabase).length > 0) {
    matchNames();
  }

  renderNames(displayedNames);
  showNotification("Парсинг завершено! Імен знайдено: " + displayedNames.length, "success");
});

// Функція транслітерації кирилиці в латиницю
function transliterateToLatin(text) {
  const ukrainianToLatin = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'h', 'ґ': 'g', 'д': 'd', 'е': 'e', 'є': 'ye', 
    'ж': 'zh', 'з': 'z', 'и': 'y', 'і': 'i', 'ї': 'yi', 'й': 'y', 'к': 'k', 'л': 'l', 
    'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 
    'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch', 'ь': '', 
    'ю': 'yu', 'я': 'ya'
  };

  return text.toLowerCase().split('').map(char => {
    return ukrainianToLatin[char] || char;
  }).join('');
}

// Функція транслітерації латиниці в кирилицю
function transliterateToCyrillic(text) {
  const latinToUkrainian = {
    'a': 'а', 'b': 'б', 'v': 'в', 'h': 'г', 'g': 'ґ', 'd': 'д', 'e': 'е',
    'ye': 'є', 'zh': 'ж', 'z': 'з', 'y': 'и', 'i': 'і', 'yi': 'ї', 'k': 'к', 
    'l': 'л', 'm': 'м', 'n': 'н', 'o': 'о', 'p': 'п', 'r': 'р', 's': 'с', 
    't': 'т', 'u': 'у', 'f': 'ф', 'kh': 'х', 'ts': 'ц', 'ch': 'ч', 
    'sh': 'ш', 'shch': 'щ', 'yu': 'ю', 'ya': 'я'
  };
  
  // Примітка: Ця реалізація є спрощеною і не обробляє всі випадки
  // Для реального використання потрібен більш складний алгоритм
  let result = text.toLowerCase();
  
  // Спочатку замінюємо багатосимвольні комбінації
  for (const latinCombo of ['ye', 'zh', 'yi', 'kh', 'ts', 'ch', 'sh', 'shch', 'yu', 'ya']) {
    if (latinToUkrainian[latinCombo]) {
      result = result.replace(new RegExp(latinCombo, 'g'), latinToUkrainian[latinCombo]);
    }
  }
  
  // Потім замінюємо окремі символи
  for (const latinChar in latinToUkrainian) {
    if (latinChar.length === 1) {
      result = result.replace(new RegExp(latinChar, 'g'), latinToUkrainian[latinChar]);
    }
  }
  
  return result;
}

// Нова функція: Порівняння імен з базою даних із підтримкою транслітерації
function matchNames() {
  matchedNames = {}; // Очищаємо попередні співпадіння
  
  // Перевіряємо кожне ім'я на наявність у базі
  displayedNames.forEach(name => {
    // Спочатку перевіряємо точне співпадіння імені
    if (nameDatabase[name]) {
      matchedNames[name] = nameDatabase[name];
      return;
    }
    
    // Потім перевіряємо реальне ім'я, якщо воно є
    if (realNameMap[name] && nameDatabase[realNameMap[name]]) {
      matchedNames[name] = nameDatabase[realNameMap[name]];
      return;
    }
    
    // Перевіряємо транслітероване ім'я (кирилиця -> латиниця)
    const hasKyrillicChars = /[а-яА-ЯіІїЇєЄґҐ]/.test(name);
    
    if (hasKyrillicChars) {
      // Якщо ім'я містить кирилицю, транслітеруємо його в латиницю і шукаємо в базі
      const latinName = transliterateToLatin(name);
      for (const dbName in nameDatabase) {
        if (dbName.toLowerCase() === latinName.toLowerCase()) {
          matchedNames[name] = nameDatabase[dbName];
          return;
        }
      }
    } else {
      // Якщо ім'я написане латиницею, транслітеруємо його в кирилицю і шукаємо в базі
      const cyrillicName = transliterateToCyrillic(name);
      for (const dbName in nameDatabase) {
        if (dbName.toLowerCase() === cyrillicName.toLowerCase()) {
          matchedNames[name] = nameDatabase[dbName];
          return;
        }
      }
    }
    
    // Шукаємо часткові співпадіння (якщо ім'я включає повне слово з бази)
    for (const dbName in nameDatabase) {
      const dbNameParts = dbName.toLowerCase().split(/\s+/);
      const nameParts = name.toLowerCase().split(/\s+/);
      
      // Перевіряємо, чи хоча б одна частина імені співпадає
      const hasMatch = dbNameParts.some(part => 
        part.length > 2 && nameParts.includes(part)
      );
      
      if (hasMatch) {
        matchedNames[name] = nameDatabase[dbName];
        return;
      }
      
      // Додаткова перевірка з транслітерацією для часткових співпадінь
      if (hasKyrillicChars) {
        const latinNameParts = nameParts.map(transliterateToLatin);
        const hasTranslitMatch = dbNameParts.some(part => 
          part.length > 2 && latinNameParts.includes(part.toLowerCase())
        );
        
        if (hasTranslitMatch) {
          matchedNames[name] = nameDatabase[dbName];
          return;
        }
      } else {
        const cyrillicNameParts = nameParts.map(transliterateToCyrillic);
        const hasTranslitMatch = dbNameParts.some(part => 
          part.length > 2 && cyrillicNameParts.includes(part.toLowerCase())
        );
        
        if (hasTranslitMatch) {
          matchedNames[name] = nameDatabase[dbName];
          return;
        }
      }
    }
    
    // Якщо нічого не знайдено, додаємо запис із "not-in-db"
    matchedNames[name] = "not-in-db";
  });
}

// Функція відмалювання списку
function renderNames(list) {
  namesList.innerHTML = "";
  countNamesSpan.textContent = list.length;
  
  list.forEach((name) => {
    const li = document.createElement("li");
    const nameContainer = document.createElement("div");
    nameContainer.className = "match-container";
    
    // Основний блок імені
    const nameBlock = document.createElement("div");
    
    // Якщо використовуємо базу і знайшли співпадіння
    if (useDbChk.checked && matchedNames[name] && matchedNames[name] !== "not-in-db") {
      // Додаємо ID
      const idSpan = document.createElement("span");
      idSpan.className = "name-id";
      idSpan.textContent = matchedNames[name];
      nameBlock.appendChild(idSpan);
    }
    
    // Визначаємо, чи ім'я містить кирилицю чи латиницю
    const hasKyrillicChars = /[а-яА-ЯіІїЇєЄґҐ]/.test(name);
    
    // Якщо для цього імені є запис real name
    if (realNameMap[name]) {
      const realNameSpan = document.createElement("span");
      realNameSpan.className = "real-name";
      realNameSpan.textContent = realNameMap[name];
      
      const akaSpan = document.createElement("span");
      akaSpan.className = "aka";
      akaSpan.textContent = "aka";
      
      const zoomNameSpan = document.createElement("span");
      zoomNameSpan.className = "zoom-name";
      zoomNameSpan.textContent = name;
      
      nameBlock.appendChild(realNameSpan);
      nameBlock.appendChild(akaSpan);
      nameBlock.appendChild(zoomNameSpan);
    } else {
      // Показуємо оригінальне ім'я
      nameBlock.appendChild(document.createTextNode(name));
      
      // Якщо увімкнена база імен, показуємо транслітероване ім'я
      if (useDbChk.checked) {
        const translitSpan = document.createElement("span");
        translitSpan.className = "translit-name";
        
        if (hasKyrillicChars) {
          translitSpan.textContent = ` (${transliterateToLatin(name)})`;
        } else if (/[a-zA-Z]/.test(name)) {
          translitSpan.textContent = ` (${transliterateToCyrillic(name)})`;
        }
        
        // Додаємо транслітероване ім'я тільки якщо воно відрізняється від оригіналу
        if (translitSpan.textContent && translitSpan.textContent.length > 4) {
          nameBlock.appendChild(translitSpan);
        }
      }
    }
    
    nameContainer.appendChild(nameBlock);
    
    // Якщо використовуємо базу і не знайшли співпадіння
    if (useDbChk.checked && matchedNames[name] === "not-in-db") {
      const notInDbSpan = document.createElement("span");
      notInDbSpan.className = "not-in-db";
      notInDbSpan.textContent = "не знайдено в базі";
      nameContainer.appendChild(notInDbSpan);
    }
    
    li.appendChild(nameContainer);
    namesList.appendChild(li);
  });
}

// 4) Сортування за назвою
sortBtn.addEventListener("click", () => {
  if (displayedNames.length === 0) {
    showNotification("Список порожній, нема що сортувати.", "warning");
    return;
  }

  // Змінено метод сортування для врахування реальних імен та id
  displayedNames.sort((a, b) => {
    // При використанні бази імен враховуємо id при сортуванні
    if (useDbChk.checked && matchedNames[a] && matchedNames[b] && 
        matchedNames[a] !== "not-in-db" && matchedNames[b] !== "not-in-db") {
      const idA = parseInt(matchedNames[a], 10);
      const idB = parseInt(matchedNames[b], 10);
      
      if (!isNaN(idA) && !isNaN(idB)) {
        return isSortedAsc ? idA - idB : idB - idA;
      }
    }
    
    // Інакше використовуємо реальне ім'я якщо доступне, інакше використовуємо ім'я з Zoom
    const nameA = realNameMap[a] || a;
    const nameB = realNameMap[b] || b;
    
    return isSortedAsc
      ? nameA.localeCompare(nameB, "uk")
      : nameB.localeCompare(nameA, "uk");
  });
  
  isSortedAsc = !isSortedAsc; // Перемикаємо напрямок
  renderNames(displayedNames);
});

// 5) Зберегти список
function saveList() {
  if (!displayedNames.length) {
    showNotification("Список порожній, нема що зберігати.", "warning");
    return;
  }
  
  // Змінено формат збереження для включення ID та реальних імен
  const content = displayedNames.map(name => {
    let line = '';
    
    // Додаємо ID, якщо використовується база і знайдено співпадіння
    if (useDbChk.checked && matchedNames[name] && matchedNames[name] !== "not-in-db") {
      line += `[ID:${matchedNames[name]}] `;
    }
    
    // Додаємо реальне ім'я, якщо доступно
    if (realNameMap[name]) {
      line += `${realNameMap[name]} (${name})`;
    } else {
      line += name;
    }
    
    // Позначаємо імена, які не знайдені в базі
    if (useDbChk.checked && matchedNames[name] === "not-in-db") {
      line += ' [відсутнє в базі]';
    }
    
    return line;
  }).join("\n");
  
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "names.txt";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showNotification("Список збережено успішно!", "success");
}
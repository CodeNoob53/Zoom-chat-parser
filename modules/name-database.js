import { elements } from './dom.js';
import { 
  transliterateToLatin, 
  transliterateToCyrillic, 
  areNamesTransliteratedMatches 
} from './transliteration.js';
import { 
  getStandardNameForm, 
  isVariantOf, 
  getAllPossibleStandardNames 
} from './name-variants.js';

// Зберігаємо базу імен
let nameDatabase = {}; // Формат: {name: id, ...}
// Зберігаємо знайдені співпадіння
let matchedNames = {}; // Формат: {name: id, ...} для знайдених співпадінь

/**
 * Парсинг бази імен з тексту
 * @param {string} content - Вміст файлу бази імен
 */
export function parseNameDatabase(content) {
  const { dbStatus } = elements;
  
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

/**
 * Функція для обчислення відстані Левенштейна між двома рядками
 * (кількість символів, які потрібно додати, видалити або замінити)
 * @param {string} a - Перший рядок
 * @param {string} b - Другий рядок
 * @returns {number} Відстань Левенштейна
 */
function levenshteinDistance(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = [];

  // Ініціалізуємо матрицю
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // Заповнюємо матрицю
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = a[j - 1] === b[i - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // видалення
        matrix[i][j - 1] + 1,      // вставка
        matrix[i - 1][j - 1] + cost // заміна
      );
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Функція для перевірки нечіткого співпадіння з урахуванням схожості
 * @param {string} str1 - Перший рядок
 * @param {string} str2 - Другий рядок
 * @param {number} threshold - Поріг схожості (менше значення = більша схожість)
 * @returns {boolean} Чи є рядки достатньо схожими
 */
function fuzzyMatch(str1, str2, threshold = 0.3) {
  if (!str1 || !str2) return false;
  
  // Приведення до нижнього регістру
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  
  // Якщо рядки однакові, повертаємо true
  if (s1 === s2) return true;
  
  // Обчислюємо відстань Левенштейна
  const distance = levenshteinDistance(s1, s2);
  
  // Нормалізуємо відстань по відношенню до довжини найдовшого рядка
  const maxLength = Math.max(s1.length, s2.length);
  const similarity = 1 - (distance / maxLength);
  
  // Повертаємо true, якщо схожість більша за поріг
  return similarity >= (1 - threshold);
}

/**
 * Розбиває повне ім'я на частини і враховує обидва можливі порядки
 * @param {string} fullName - Повне ім'я
 * @returns {Object} Об'єкт з різними варіантами імені
 */
function splitName(fullName) {
  if (!fullName) return { fullName: "" };
  
  const parts = fullName.trim().split(/\s+/);
  
  // Якщо тільки одне слово
  if (parts.length === 1) {
    return { 
      fullName: fullName.trim(),
      onlyOneWord: true,
      word: parts[0]
    };
  }
  
  // Стандартний варіант (перше слово - прізвище, решта - ім'я)
  const standard = {
    surname: parts[0],
    firstname: parts.slice(1).join(" ")
  };
  
  // Альтернативний варіант (останнє слово - прізвище, решта - ім'я)
  const reversed = {
    surname: parts[parts.length - 1],
    firstname: parts.slice(0, parts.length - 1).join(" ")
  };
  
  return {
    fullName: fullName.trim(),
    standard,
    reversed
  };
}

/**
 * Порівняння імен з базою даних з покращеним алгоритмом
 * @param {string[]} displayedNames - Масив відображуваних імен
 * @param {Object} realNameMap - Карта реальних імен
 * @returns {Object} Об'єкт з результатами порівняння
 */
export function matchNames(displayedNames, realNameMap) {
  matchedNames = {}; // Очищуємо попередні співпадіння
  
  // Перебираємо всі відображувані імена
  displayedNames.forEach(name => {
    // Зберігаємо потенційні співпадіння
    let potentialMatches = [];
    
    // 1. Перевірка точного співпадіння
    if (nameDatabase[name]) {
      matchedNames[name] = nameDatabase[name];
      matchedNames[name + '_matchInfo'] = { 
        matchType: 'exact-match',
        quality: 100
      };
      return; // Далі не шукаємо
    }
    
    // 2. Перевірка реального імені з тегу rnm:
    if (realNameMap[name] && nameDatabase[realNameMap[name]]) {
      matchedNames[name] = nameDatabase[realNameMap[name]];
      matchedNames[name + '_matchInfo'] = { 
        matchType: 'real-name-tag',
        quality: 99
      };
      return; // Далі не шукаємо
    }
    
    // 3. Аналіз імені з чату
    let chatNameToCheck = realNameMap[name] || name;
    const chatNameParts = splitName(chatNameToCheck);
    
    // 4. Перебираємо базу імен і шукаємо схожі
    for (const dbName in nameDatabase) {
      const dbNameParts = splitName(dbName);
      
      // 4.1 Перевірка на однаковий порядок (Прізвище Ім'я)
      if (chatNameParts.standard && dbNameParts.standard) {
        // Точне співпадіння
        if (chatNameParts.standard.surname.toLowerCase() === dbNameParts.standard.surname.toLowerCase() && 
            chatNameParts.standard.firstname.toLowerCase() === dbNameParts.standard.firstname.toLowerCase()) {
          potentialMatches.push({
            dbName,
            id: nameDatabase[dbName],
            quality: 98,
            matchType: 'standard-order-exact'
          });
          continue;
        }
        
        // Точне співпадіння прізвища, нечітке ім'я
        if (chatNameParts.standard.surname.toLowerCase() === dbNameParts.standard.surname.toLowerCase() && 
            fuzzyMatch(chatNameParts.standard.firstname, dbNameParts.standard.firstname, 0.25)) {
          potentialMatches.push({
            dbName,
            id: nameDatabase[dbName],
            quality: 90,
            matchType: 'surname-exact-firstname-fuzzy'
          });
          continue;
        }
        
        // Співпадіння через транслітерацію (однаковий порядок)
        if (areNamesTransliteratedMatches(
          chatNameParts.standard.surname, 
          dbNameParts.standard.surname, 
          0.75) && 
            areNamesTransliteratedMatches(
              chatNameParts.standard.firstname, 
              dbNameParts.standard.firstname, 
              0.75)) {
          potentialMatches.push({
            dbName,
            id: nameDatabase[dbName],
            quality: 85,
            matchType: 'standard-order-translit'
          });
          continue;
        }
        
        // Перевірка варіантів імен (для зменшувальних форм, наприклад "Саша" -> "Олександр")
        if (chatNameParts.standard.surname.toLowerCase() === dbNameParts.standard.surname.toLowerCase() && 
            isVariantOf(chatNameParts.standard.firstname, dbNameParts.standard.firstname)) {
          potentialMatches.push({
            dbName,
            id: nameDatabase[dbName],
            quality: 88,
            matchType: 'standard-order-name-variant'
          });
          continue;
        }
      }
      
      // 4.2 Перевірка на зворотний порядок (Ім'я Прізвище)
      if (chatNameParts.reversed && dbNameParts.standard) {
        // Зворотний порядок, точне співпадіння
        if (chatNameParts.reversed.surname.toLowerCase() === dbNameParts.standard.surname.toLowerCase() && 
            chatNameParts.reversed.firstname.toLowerCase() === dbNameParts.standard.firstname.toLowerCase()) {
          potentialMatches.push({
            dbName,
            id: nameDatabase[dbName],
            quality: 92,
            matchType: 'reversed-order-exact',
            reversed: true
          });
          continue;
        }
        
        // Зворотний порядок, точне прізвище, нечітке ім'я
        if (chatNameParts.reversed.surname.toLowerCase() === dbNameParts.standard.surname.toLowerCase() && 
            fuzzyMatch(chatNameParts.reversed.firstname, dbNameParts.standard.firstname, 0.25)) {
          potentialMatches.push({
            dbName,
            id: nameDatabase[dbName],
            quality: 85,
            matchType: 'reversed-surname-exact-firstname-fuzzy',
            reversed: true
          });
          continue;
        }
        
        // Зворотний порядок, співпадіння через транслітерацію
        if (areNamesTransliteratedMatches(
          chatNameParts.reversed.surname, 
          dbNameParts.standard.surname, 
          0.75) && 
            areNamesTransliteratedMatches(
              chatNameParts.reversed.firstname, 
              dbNameParts.standard.firstname, 
              0.75)) {
          potentialMatches.push({
            dbName,
            id: nameDatabase[dbName],
            quality: 80,
            matchType: 'reversed-order-translit',
            reversed: true
          });
          continue;
        }
        
        // Зворотний порядок, перевірка варіантів імен
        if (chatNameParts.reversed.surname.toLowerCase() === dbNameParts.standard.surname.toLowerCase() && 
            isVariantOf(chatNameParts.reversed.firstname, dbNameParts.standard.firstname)) {
          potentialMatches.push({
            dbName,
            id: nameDatabase[dbName],
            quality: 82,
            matchType: 'reversed-order-name-variant',
            reversed: true
          });
          continue;
        }
      }
      
      // 4.3 Для випадків, коли в чаті тільки одне слово
      if (chatNameParts.onlyOneWord) {
        // Співпадіння однослівного імені з прізвищем
        if (areNamesTransliteratedMatches(chatNameParts.word, dbNameParts.standard.surname, 0.75)) {
          potentialMatches.push({
            dbName,
            id: nameDatabase[dbName],
            quality: 70,
            matchType: 'single-word-surname-match'
          });
          continue;
        }
        
        // Співпадіння однослівного імені з ім'ям
        if (areNamesTransliteratedMatches(chatNameParts.word, dbNameParts.standard.firstname, 0.75)) {
          potentialMatches.push({
            dbName,
            id: nameDatabase[dbName],
            quality: 65,
            matchType: 'single-word-firstname-match'
          });
          continue;
        }
        
        // Перевірка варіантів імен для однослівного імені
        // Перевіряємо, чи є слово зменшувальною формою імені в базі
        const possibleFullNames = getAllPossibleStandardNames(chatNameParts.word);
        for (const possibleName of possibleFullNames) {
          if (possibleName === dbNameParts.standard.firstname.toLowerCase()) {
            potentialMatches.push({
              dbName,
              id: nameDatabase[dbName],
              quality: 75,
              matchType: 'single-word-variant-match'
            });
            break;
          }
        }
      }
      
      // 4.4 Загальне нечітке співпадіння через повне ім'я
      if (areNamesTransliteratedMatches(chatNameToCheck, dbName, 0.7)) {
        potentialMatches.push({
          dbName,
          id: nameDatabase[dbName],
          quality: 60,
          matchType: 'full-name-translit'
        });
      }
    }
    
    // 5. Сортуємо потенційні співпадіння за якістю (від кращих до гірших)
    potentialMatches.sort((a, b) => b.quality - a.quality);
    
    // 6. Беремо найкраще співпадіння, якщо є
    if (potentialMatches.length > 0) {
      const bestMatch = potentialMatches[0];
      matchedNames[name] = bestMatch.id;
      matchedNames[name + '_matchInfo'] = {
        matchType: bestMatch.matchType,
        quality: bestMatch.quality,
        reversed: bestMatch.reversed || false,
        dbName: bestMatch.dbName,
        allMatches: potentialMatches.slice(0, 3) // Зберігаємо до 3-х найкращих співпадінь
      };
    } else {
      // Не знайдено співпадінь
      matchedNames[name] = "not-in-db";
      matchedNames[name + '_matchInfo'] = { 
        matchType: 'not-found',
        quality: 0
      };
    }
  });
  
  return matchedNames;
}

/**
 * Отримати поточні співпадіння
 * @returns {Object} Об'єкт співпадінь
 */
export function getMatchedNames() {
  return matchedNames;
}

/**
 * Отримати поточну базу імен
 * @returns {Object} Об'єкт бази імен
 */
export function getNameDatabase() {
  return nameDatabase;
}

/**
 * Отримати повну інформацію про учасника з бази
 * @param {string} name - Ім'я учасника з чату
 * @param {Object} realNameMap - Карта реальних імен
 * @returns {Object} Об'єкт з інформацією про учасника
 */
export function getParticipantInfo(name, realNameMap) {
  const info = {
    id: "?",
    surname: "",
    firstname: "",
    nickname: name,
    foundInDb: false,
    matchType: "not-found",
    alternativeMatches: []
  };
  
  // Якщо знайшли співпадіння в базі
  if (matchedNames[name] && matchedNames[name] !== "not-in-db") {
    info.id = matchedNames[name];
    info.foundInDb = true;
    
    // Отримуємо додаткову інформацію про тип співпадіння
    const matchInfo = matchedNames[name + '_matchInfo'] || {};
    info.matchType = matchInfo.matchType || "found";
    
    // Додаємо альтернативні співпадіння, якщо є
    if (matchInfo.allMatches && matchInfo.allMatches.length > 1) {
      info.alternativeMatches = matchInfo.allMatches.slice(1);
    }
    
    // Шукаємо ім'я в базі даних за ID
    const dbName = matchInfo.dbName || 
                  Object.keys(nameDatabase).find(key => nameDatabase[key] === info.id);
    
    if (dbName) {
      const nameParts = splitName(dbName);
      
      // Визначаємо, який порядок використовувати (прямий чи зворотний)
      if (matchInfo.reversed) {
        // Якщо співпадіння було зі зворотним порядком (Ім'я Прізвище)
        if (nameParts.standard) {
          info.surname = nameParts.standard.surname;
          info.firstname = nameParts.standard.firstname;
        }
      } else {
        // Стандартний порядок (Прізвище Ім'я)
        if (nameParts.standard) {
          info.surname = nameParts.standard.surname;
          info.firstname = nameParts.standard.firstname;
        }
      }
      
      // Якщо в базі тільки одне слово
      if (nameParts.onlyOneWord) {
        if (info.matchType && info.matchType.includes('surname')) {
          info.surname = nameParts.word;
        } else if (info.matchType && info.matchType.includes('firstname')) {
          info.firstname = nameParts.word;
        } else {
          // За замовчуванням вважаємо прізвищем
          info.surname = nameParts.word;
        }
      }
    }
    
    // Якщо це реальне ім'я (з тегу rnm:)
    if (realNameMap[name]) {
      info.nickname = name;
      if (info.matchType !== "real-name-tag") {
        info.matchType += " real-name-tag";
      }
    }
  } else {
    // Не знайдено в базі
    if (realNameMap[name]) {
      const nameParts = splitName(realNameMap[name]);
      if (nameParts.standard) {
        info.surname = nameParts.standard.surname;
        info.firstname = nameParts.standard.firstname;
      } else if (nameParts.onlyOneWord) {
        // Якщо тільки одне слово, вважаємо його прізвищем
        info.surname = nameParts.word;
      }
      info.nickname = name;
      info.matchType = "real-name-tag";
    }
  }
  
  return info;
}

/**
 * Вручну встановити співпадіння імені з бази
 * @param {string} name - Ім'я учасника з чату
 * @param {string} dbNameOrId - Ім'я з бази або ID запису
 * @returns {boolean} Успішність операції
 */
export function setManualMatch(name, dbNameOrId) {
  if (!name) return false;
  
  // Шукаємо ID, якщо передано ім'я з бази
  let id = dbNameOrId;
  if (nameDatabase[dbNameOrId]) {
    id = nameDatabase[dbNameOrId];
  }
  
  // Перевіряємо, чи існує такий ID в базі
  const existsInDb = Object.values(nameDatabase).includes(id);
  if (!existsInDb) return false;
  
  // Зберігаємо співпадіння
  matchedNames[name] = id;
  matchedNames[name + '_matchInfo'] = {
    matchType: 'manual-match',
    quality: 100,
    dbName: Object.keys(nameDatabase).find(key => nameDatabase[key] === id)
  };
  
  return true;
}

/**
 * Вибрати альтернативне співпадіння з наявних
 * @param {string} name - Ім'я учасника з чату
 * @param {number} altIndex - Індекс альтернативного співпадіння
 * @returns {boolean} Успішність операції
 */
export function selectAlternativeMatch(name, altIndex) {
  if (!name || !matchedNames[name + '_matchInfo'] || 
      !matchedNames[name + '_matchInfo'].allMatches) return false;
  
  const allMatches = matchedNames[name + '_matchInfo'].allMatches;
  if (altIndex < 0 || altIndex >= allMatches.length) return false;
  
  const selectedMatch = allMatches[altIndex];
  
  matchedNames[name] = selectedMatch.id;
  matchedNames[name + '_matchInfo'] = {
    matchType: selectedMatch.matchType + '-selected',
    quality: selectedMatch.quality,
    reversed: selectedMatch.reversed || false,
    dbName: selectedMatch.dbName,
    allMatches: allMatches // Зберігаємо всі альтернативи
  };
  
  return true;
}
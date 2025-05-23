/**
 * Сервіс для роботи з базою даних
 * Об'єднує функціональність core і api в єдиний інтерфейс
 */
import { showNotification } from '../../core/notification.js'

// Структура за замовчуванням для бази даних
const DEFAULT_DATABASE = {
  version: '3.0',
  entries: []
}

// Ключ для збереження в локальному сховищі
const STORAGE_KEY = 'databaseData'

// Зберігаємо дані бази даних
let databaseData = { ...DEFAULT_DATABASE }

// Зберігаємо відповідність між "Прізвище Ім'я" та ID
let nameToIdMap = {}

// Зберігаємо відповідність нікнеймів до ID
let nicknameToIdMap = {}

// Налаштування для автоматичного збереження
let autoSaveEnabled = true
let saveTimeout = null
const SAVE_DELAY = 500 // Затримка в мс для автозбереження

/**
 * Ініціалізувати сервіс бази даних
 * @param {Object} options - Налаштування
 */
export function initDatabaseService (options = {}) {
  // Встановлюємо налаштування
  if (options.hasOwnProperty('autoSave')) {
    autoSaveEnabled = !!options.autoSave
  }

  // Завантажуємо базу даних
  loadDatabase()
}

/**
 * Завантажити базу даних з локального сховища
 */
export function loadDatabase () {
  try {
    const savedDb = localStorage.getItem(STORAGE_KEY)
    if (savedDb) {
      const parsedData = JSON.parse(savedDb)

      // Перевіряємо структуру
      if (!parsedData.version || !parsedData.entries) {
        databaseData = { ...DEFAULT_DATABASE }
        showNotification(
          'Несумісний формат бази даних, створено нову',
          'warning'
        )
      } else {
        databaseData = parsedData
        showNotification(
          'База даних завантажена з локального сховища',
          'success'
        )
      }

      // Оновлюємо карти відповідності
      updateMappings()
    }

    return true
  } catch (error) {
    console.error('Помилка завантаження бази даних:', error)
    showNotification('Помилка завантаження бази даних', 'error')

    // Створюємо нову базу при помилці
    databaseData = { ...DEFAULT_DATABASE }
    return false
  }
}

/**
 * Зберегти базу даних у локальне сховище з подальшим оновленням інтерфейсу
 */
export function saveDatabase () {
  try {
    // Переконаємося, що дані серіалізуються правильно
    const serializedData = JSON.stringify(databaseData)

    // Логуємо для налагодження
    console.log(
      `Зберігаємо базу даних в localStorage: ${serializedData.length} байт`
    )

    // Зберігаємо в localStorage
    localStorage.setItem(STORAGE_KEY, serializedData)

    // Перевіряємо збереження
    const savedData = localStorage.getItem(STORAGE_KEY)
    if (!savedData) {
      console.error('Дані не збережені в localStorage!')
      return false
    }

    // Сповіщаємо про оновлення бази даних
    dispatchDatabaseUpdateEvent()

    console.log('База даних успішно збережена в localStorage')
    return true
  } catch (error) {
    console.error('Помилка збереження бази даних:', error)
    showNotification('Помилка збереження бази даних', 'error')
    return false
  }
}

/**
 * Відкладене збереження бази даних (з буферизацією)
 */
export function deferredSaveDatabase () {
  if (!autoSaveEnabled) return

  // Очищаємо попередній таймер, якщо він був
  if (saveTimeout) {
    clearTimeout(saveTimeout)
  }

  // Встановлюємо новий таймер
  saveTimeout = setTimeout(() => {
    saveDatabase()
    saveTimeout = null
  }, SAVE_DELAY)
}

/**
 * Оновити карти відповідності
 */
export function updateMappings () {
  nameToIdMap = {}
  nicknameToIdMap = {}

  databaseData.entries.forEach(entry => {
    const fullName = `${entry.surname} ${entry.firstname}`
    nameToIdMap[fullName] = entry.id

    // Додаємо нікнейми до карти
    if (entry.nicknames && Array.isArray(entry.nicknames)) {
      entry.nicknames.forEach(nickname => {
        if (nickname) {
          nicknameToIdMap[nickname.toLowerCase()] = entry.id
        }
      })
    }
  })
  
  // Логуємо для налагодження
  console.log('Оновлено карти відповідності:');
  console.log('Імена:', Object.keys(nameToIdMap).length);
  console.log('Нікнейми:', Object.keys(nicknameToIdMap).length);
}

/**
 * Отримати базу даних
 * @returns {Object} Об'єкт бази даних
 */
export function getDatabase () {
  return { ...databaseData }
}

/**
 * Отримати список всіх записів бази даних
 * @returns {Array} Масив записів
 */
export function getAllEntries () {
  return [...databaseData.entries]
}

/**
 * Отримати запис за ID
 * @param {string} id - ID запису
 * @returns {Object|null} Знайдений запис або null
 */
export function getEntryById (id) {
  if (!id) return null
  return databaseData.entries.find(entry => entry.id === id) || null
}

/**
 * Знайти запис за нікнеймом
 * @param {string} nickname - Нікнейм для пошуку
 * @returns {Object|null} Знайдений запис або null
 */
export function findEntryByNickname (nickname) {
  if (!nickname) return null

  const id = nicknameToIdMap[nickname.toLowerCase()]
  
  // Логуємо для налагодження
  console.log(`Пошук за нікнеймом "${nickname}": ${id ? 'знайдено' : 'не знайдено'}`);

  if (!id) return null

  return getEntryById(id)
}

/**
 * Знайти запис за повним іменем (Прізвище Ім'я)
 * @param {string} fullName - Повне ім'я для пошуку
 * @returns {Object|null} Знайдений запис або null
 */
export function findEntryByFullName (fullName) {
  if (!fullName) return null

  const id = nameToIdMap[fullName]

  if (!id) return null

  return getEntryById(id)
}

/**
 * Знайти записи за фільтром
 * @param {Function} filterFn - Функція фільтрації
 * @returns {Array} Масив знайдених записів
 */
export function findEntries (filterFn) {
  if (typeof filterFn !== 'function') return []

  return databaseData.entries.filter(filterFn)
}

/**
 * Пошук записів за текстом
 * @param {string} searchText - Текст для пошуку
 * @returns {Array} Масив знайдених записів
 */
export function searchEntries (searchText) {
  if (!searchText || typeof searchText !== 'string') {
    return getAllEntries()
  }

  const searchLower = searchText.toLowerCase()

  return findEntries(entry => {
    // Пошук у прізвищі та імені
    if (
      entry.surname.toLowerCase().includes(searchLower) ||
      entry.firstname.toLowerCase().includes(searchLower)
    ) {
      return true
    }

    // Пошук у нікнеймах
    if (
      entry.nicknames &&
      entry.nicknames.some(
        nick => nick && nick.toLowerCase().includes(searchLower)
      )
    ) {
      return true
    }

    // Пошук за ID
    if (entry.id.includes(searchText)) {
      return true
    }

    return false
  })
}

/**
 * Додати запис до бази даних
 * @param {Object} entry - Запис для додавання
 * @returns {boolean} Успішність операції
 */
export function addEntry(entry) {
  if (!entry || !entry.surname || !entry.firstname) {
    console.error('Неповний запис для додавання:', entry);
    return false;
  }
  
  // Перевіряємо, що nicknames є масивом
  if (!Array.isArray(entry.nicknames)) {
    entry.nicknames = [];
  }
  
  // Створюємо новий запис
  const newEntry = {
    id: entry.id || getNextId(),
    surname: entry.surname,
    firstname: entry.firstname,
    nicknames: [...entry.nicknames] // Створюємо копію масиву
  };
  
  // Додаємо запис
  databaseData.entries.push(newEntry);
  
  // Оновлюємо карти відповідності
  updateMappings();
  
  // Зберігаємо базу даних відразу
  const result = saveDatabase();
  
  console.log('Додано новий запис:', newEntry);
  
  return result;
}


/**
 * Оновити запис в базі даних
 * @param {Object} entry - Запис для оновлення
 * @returns {boolean} Успішність операції
 */
export function updateEntry(entry) {
  if (!entry || !entry.id) {
    console.error('Неповний запис для оновлення:', entry);
    return false;
  }
  
  // Знаходимо індекс запису
  const index = databaseData.entries.findIndex(e => e.id === entry.id);
  
  if (index === -1) {
    console.error('Запис для оновлення не знайдено:', entry.id);
    return false;
  }
  
  // Перевіряємо, що nicknames є масивом
  if (!Array.isArray(entry.nicknames)) {
    entry.nicknames = [];
  }
  
  // Оновлюємо запис
  databaseData.entries[index] = {
    ...databaseData.entries[index],
    surname: entry.surname,
    firstname: entry.firstname,
    nicknames: [...entry.nicknames] // Створюємо копію масиву
  };
  
  // Оновлюємо картини відповідності
  updateMappings();
  
  // Зберігаємо базу даних відразу замість відкладеного збереження
  const result = saveDatabase();
  
  console.log('Оновлено запис:', databaseData.entries[index]);
  
  return result;
}

/**
 * Видалити запис з бази даних
 * @param {string} id - ID запису для видалення
 * @returns {boolean} Успішність операції
 */
export function deleteEntry(id) {
  if (!id) {
    return false;
  }
  
  // Знаходимо індекс запису
  const index = databaseData.entries.findIndex(e => e.id === id);
  
  if (index === -1) {
    return false;
  }
  
  // Видаляємо запис
  databaseData.entries.splice(index, 1);
  
  // Оновлюємо картини відповідності
  updateMappings();
  
  // Зберігаємо базу даних відразу
  return saveDatabase();
}

/**
 * Додати нікнейм до існуючого запису
 * @param {string} id - ID запису
 * @param {string} nickname - Нікнейм для додавання
 * @returns {boolean} Успішність операції
 */
export function addNicknameToEntry(id, nickname) {
  if (!id || !nickname) return false;
  
  // Знаходимо запис
  const entry = getEntryById(id);
  
  if (!entry) return false;
  
  // Створюємо копію для оновлення
  const updatedEntry = { ...entry };
  
  // Додаємо нікнейм, якщо він ще не доданий
  if (!updatedEntry.nicknames) {
    updatedEntry.nicknames = [];
  }
  
  // Перевіряємо, чи нікнейм вже існує
  if (updatedEntry.nicknames.includes(nickname)) {
    return true;
  }
  
  // Перевіряємо, чи є вже 2 нікнейми
  if (updatedEntry.nicknames.length >= 2) {
    // Замінюємо другий нікнейм
    updatedEntry.nicknames[1] = nickname;
  } else {
    // Додаємо новий нікнейм
    updatedEntry.nicknames.push(nickname);
  }
  
  // Оновлюємо запис
  return updateEntry(updatedEntry);
}

/**
 * Отримати наступний доступний ID
 * @returns {string} Наступний ID
 */
export function getNextId () {
  if (databaseData.entries.length === 0) {
    return '1'
  }

  // Знаходимо максимальний ID
  const maxId = Math.max(
    ...databaseData.entries.map(entry => parseInt(entry.id, 10) || 0)
  )
  return (maxId + 1).toString()
}

/**
 * Отримати базу даних у старому форматі для сумісності
 * @returns {Object} База даних у форматі {name: id, ...}
 */
export function getOldFormatDatabase () {
  const oldFormat = {}

  databaseData.entries.forEach(entry => {
    const fullName = `${entry.surname} ${entry.firstname}`.trim()
    oldFormat[fullName] = entry.id
  })

  return oldFormat
}

/**
 * Конвертувати традиційну базу імен в новий формат
 * @param {Object} oldDatabase - Стара база даних у форматі {name: id, ...}
 * @returns {Object} Нова база даних
 */
export function convertOldDatabase (oldDatabase) {
  if (!oldDatabase || typeof oldDatabase !== 'object') {
    return null
  }

  const entries = []

  // Конвертуємо кожен запис
  for (const [name, id] of Object.entries(oldDatabase)) {
    // Розбиваємо ім'я на прізвище та ім'я
    const parts = name.split(/\s+/)

    if (parts.length < 2) {
      // Якщо ім'я складається з одного слова, використовуємо його як прізвище
      entries.push({
        id: id.toString(),
        surname: name,
        firstname: '',
        nicknames: []
      })
    } else {
      // Інакше розділяємо на прізвище та ім'я
      const surname = parts[0]
      const firstname = parts.slice(1).join(' ')

      entries.push({
        id: id.toString(),
        surname,
        firstname,
        nicknames: []
      })
    }
  }

  return {
    version: '3.0',
    entries
  }
}

/**
 * Імпортувати дані в базу
 * @param {Object} data - Дані для імпорту
 * @returns {boolean} Успішність операції
 */
export function importDatabase (data) {
  if (!data) return false

  try {
    if (data.version && data.entries && Array.isArray(data.entries)) {
      // Новий формат
      databaseData = {
        version: data.version || '3.0',
        entries: [...data.entries]
      }
    } else if (typeof data === 'object' && !Array.isArray(data)) {
      // Старий формат - конвертуємо
      const converted = convertOldDatabase(data)
      if (converted) {
        databaseData = converted
      } else {
        return false
      }
    } else {
      return false
    }

    // Оновлюємо картини відповідності
    updateMappings()

    // Зберігаємо базу даних
    saveDatabase()

    // Сповіщаємо про оновлення бази даних
    dispatchDatabaseUpdateEvent()

    return true
  } catch (error) {
    console.error('Помилка імпорту бази даних:', error)
    return false
  }
}

/**
 * Сповіщає про оновлення бази даних
 */
function dispatchDatabaseUpdateEvent() {
  const event = new CustomEvent('databaseUpdated', {
    detail: { 
      databaseSize: databaseData.entries.length,
      timestamp: Date.now() // Додамо мітку часу для відстеження оновлень
    }
  });
  document.dispatchEvent(event);
  
  console.log('Сповіщення про оновлення бази даних відправлено');
}

/**
 * Оновити статус відображення бази даних
 * @param {HTMLElement} statusElement - Елемент для відображення статусу
 */
export function updateDbStatusDisplay (statusElement = null) {
  const dbStatus = statusElement || document.getElementById('dbStatus')
  if (!dbStatus) return

  const entriesCount = databaseData.entries.length

  if (entriesCount > 0) {
    dbStatus.textContent = `База завантажена: ${entriesCount} записів`
    dbStatus.classList.add('loaded')
  } else {
    dbStatus.textContent = 'База не завантажена'
    dbStatus.classList.remove('loaded')
  }
}

// Експортуємо картини для сумісності з існуючим кодом (хоча краще використовувати методи API)
export { nameToIdMap, nicknameToIdMap, databaseData }
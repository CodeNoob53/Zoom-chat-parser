import { elements } from './core/dom.js'
import { saveList, saveCsv, saveJson } from './parser/exporter.js'
import { initFileHandlers } from './parser/file-handler.js'
import { showNotification } from './core/notification.js'
import { getRealNameMap, parseChat } from './parser/parser.js'
import { initRenderer, updateNamesList } from './ui/renderer.js'
import { initTheme } from './core/theme.js'
import { initTabs } from './core/tabs.js'
import { initParserUI } from './ui/parser-ui.js'
import { initChatView } from './ui/chat-view.js'
import {
  initDatabaseManager,
  getOldFormatDatabase
} from './database/database-manager.js'
import {
  compareNames,
  getMatchedNames,
  getNameDatabase,
  getUnrecognizedNames,
  setNameDatabase
} from './name-processing/name-database.js'

// Стан додатку
let displayedNames = []

/**
 * Ініціалізація додатку
 */
function initApp () {
  const {
    useKeywordChk,
    keywordInput,
    parseBtn,
    saveBtn,
    saveCsvBtn,
    saveJsonBtn
  } = elements

  // Ініціалізуємо вкладки
  initTabs()

  // Ініціалізуємо обробники файлів
  initFileHandlers()

  // Ініціалізуємо рендерер
  initRenderer()

  // Ініціалізуємо тему
  initTheme()

  // Ініціалізуємо менеджер бази даних
  initDatabaseManager()

  // Ініціалізуємо покращений інтерфейс парсера
  initParserUI()

  // Ініціалізуємо відображення чату
  initChatView()

  // Ініціалізуємо базу даних при запуску
  setTimeout(() => {
    // Спробуємо використати базу з менеджера
    tryUseManagerDatabase()
  }, 500)

  // Підписуємося на подію зміни вкладки
  document.addEventListener('tabChanged', e => {
    const tab = e.detail.tab

    // Якщо перейшли на вкладку "Учасники", оновлюємо дані
    if (tab === 'participants' && displayedNames.length > 0) {
      // Оновлюємо список учасників
      rerender()
    }
  })

  // Показати / приховати поле для ключового слова
  if (useKeywordChk) {
    useKeywordChk.addEventListener('change', () => {
      if (useKeywordChk.checked) {
        keywordInput.style.display = 'inline-block'
      } else {
        keywordInput.style.display = 'none'
        keywordInput.value = ''
      }
    })
  }

  // Кнопка парсингу
  if (parseBtn) {
    parseBtn.addEventListener('click', handleParse)
  }

  // Кнопки збереження
  if (saveBtn) {
    saveBtn.addEventListener('click', handleSaveTxt)
  }

  if (saveCsvBtn) {
    saveCsvBtn.addEventListener('click', handleSaveCsv)
  }

  if (saveJsonBtn) {
    saveJsonBtn.addEventListener('click', handleSaveJson)
  }

  // Додаємо обробник для клавіші Enter у полі ключового слова
  if (keywordInput) {
    keywordInput.addEventListener('keyup', event => {
      if (event.key === 'Enter') {
        handleParse()
      }
    })
  }
}

/**
 * Спробувати використати базу даних з менеджера
 */
function tryUseManagerDatabase () {
  // Отримуємо базу в старому форматі
  const oldFormatDb = getOldFormatDatabase()

  // Перевіряємо, чи є записи
  if (Object.keys(oldFormatDb).length > 0) {
    // Встановлюємо базу для використання
    setNameDatabase(oldFormatDb)

    // Оновлюємо статус
    updateDbStatus(Object.keys(oldFormatDb).length)

    // Якщо є відображені імена, оновлюємо список
    if (displayedNames.length > 0) {
      // Порівнюємо імена з базою
      compareNames(displayedNames, getRealNameMap())

      // Оновлюємо відображення
      rerender()
    }
  } else {
    // Немає записів у базі, встановлюємо статус "не завантажено"
    const dbStatus = document.getElementById('dbStatus')
    if (dbStatus) {
      dbStatus.textContent = 'База не завантажена'
      dbStatus.classList.remove('loaded')
    }
  }
}

// Додаємо обробник події оновлення бази даних
document.addEventListener('databaseUpdated', e => {
  console.log('Отримано подію оновлення бази даних:', e.detail)

  // Отримуємо останню версію бази даних
  const nameDatabase = getNameDatabase()

  // Оновлюємо статус бази даних
  updateDbStatus(e.detail.databaseSize)

  // Якщо є відображені імена, оновлюємо список
  if (displayedNames.length > 0) {
    // Порівнюємо імена з базою
    compareNames(displayedNames, getRealNameMap())

    // Оновлюємо відображення
    rerender()

    console.log('Список учасників оновлено з новою базою даних')
  }
})

/**
 * Оновити статус бази даних
 * @param {number} entriesCount - Кількість записів у базі
 */
function updateDbStatus (entriesCount) {
  const dbStatus = document.getElementById('dbStatus')
  if (!dbStatus) return

  if (entriesCount > 0) {
    dbStatus.textContent = `База завантажена: ${entriesCount} записів`
    dbStatus.classList.add('loaded')
  } else {
    dbStatus.textContent = 'База не завантажена'
    dbStatus.classList.remove('loaded')
  }
}

/**
 * Обробник кнопки парсингу
 */
function handleParse () {
  const { chatInput, useKeywordChk, keywordInput } = elements

  const text = chatInput.value
  if (!text.trim()) {
    showNotification('Вставте текст чату або завантажте файл!', 'warning')
    return
  }

  // Отримуємо ключове слово, якщо вказано
  const keyword =
    useKeywordChk && useKeywordChk.checked ? keywordInput.value.trim() : ''

  // Парсимо чат
  const parseResult = parseChat(text, keyword)
  displayedNames = parseResult.displayedNames

  // Завжди отримуємо свіжу версію бази даних
  const nameDatabase = getNameDatabase()
  console.log(
    `Отримано базу даних з ${Object.keys(nameDatabase).length} записів`
  )

  const hasDatabaseEntries = Object.keys(nameDatabase).length > 0

  // Якщо є база даних, порівнюємо імена
  if (hasDatabaseEntries) {
    // Змінюємо виклик matchNames на compareNames
    compareNames(displayedNames, getRealNameMap())

    // Отримуємо кількість нерозпізнаних імен
    const unrecognizedNames = getUnrecognizedNames()
    if (unrecognizedNames.length > 0) {
      showNotification(
        `Парсинг завершено! Знайдено ${displayedNames.length} імен, ${unrecognizedNames.length} не розпізнано.`,
        'success'
      )
    } else {
      showNotification(
        `Парсинг завершено! Всі ${displayedNames.length} імен знайдено в базі.`,
        'success'
      )
    }
  } else {
    showNotification(
      `Парсинг завершено! Імен знайдено: ${displayedNames.length}`,
      'success'
    )
  }

  // Відображаємо результати
  updateNamesList(
    displayedNames,
    getRealNameMap(),
    hasDatabaseEntries,
    getMatchedNames()
  )

  // Перемикаємося на вкладку "Учасники"
  const participantsTabBtn = document.querySelector(
    '.tab-button[data-tab="participants"]'
  )
  if (participantsTabBtn) {
    participantsTabBtn.click()
  }
}

/**
 * Ререндерить список учасників зі збереженням поточних налаштувань
 */
function rerender () {
  // Перевіряємо наявність бази даних
  const nameDatabase = getNameDatabase()
  const hasDatabaseEntries = Object.keys(nameDatabase).length > 0

  updateNamesList(
    displayedNames,
    getRealNameMap(),
    hasDatabaseEntries,
    getMatchedNames()
  )
}

/**
 * Обробник кнопки збереження в TXT
 */
function handleSaveTxt () {
  // Перевіряємо наявність бази даних
  const nameDatabase = getNameDatabase()
  const hasDatabaseEntries = Object.keys(nameDatabase).length > 0

  saveList(
    displayedNames,
    getRealNameMap(),
    hasDatabaseEntries,
    getMatchedNames()
  )
}

/**
 * Обробник кнопки збереження в CSV
 */
function handleSaveCsv () {
  // Перевіряємо наявність бази даних
  const nameDatabase = getNameDatabase()
  const hasDatabaseEntries = Object.keys(nameDatabase).length > 0

  saveCsv(
    displayedNames,
    getRealNameMap(),
    hasDatabaseEntries,
    getMatchedNames()
  )
}

/**
 * Обробник кнопки збереження в JSON
 */
function handleSaveJson () {
  // Перевіряємо наявність бази даних
  const nameDatabase = getNameDatabase()
  const hasDatabaseEntries = Object.keys(nameDatabase).length > 0

  saveJson(
    displayedNames,
    getRealNameMap(),
    hasDatabaseEntries,
    getMatchedNames()
  )
}

// Ініціалізація після завантаження сторінки
document.addEventListener('DOMContentLoaded', () => {
  initApp()

  // Задаємо по замовчуванню сортування за ID
  if (elements.sortById) {
    elements.sortById.click()
  }
})

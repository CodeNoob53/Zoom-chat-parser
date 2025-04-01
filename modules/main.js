import { elements } from './dom.js'
import { saveList } from './exporter.js'
import { initFileHandlers } from './file-handler.js'
import { showNotification } from './notification.js'
import { getRealNameMap, parseChat } from './parser.js'
import { initRenderer, updateNamesList } from './renderer.js'
import { compareNames, getMatchedNames, getNameDatabase, getUnrecognizedNames } from './name-database.js'
// Стан додатку
let displayedNames = []

/**
 * Ініціалізація додатку
 */
function initApp () {
  const {
    useKeywordChk,
    keywordInput,
    useDbChk,
    dbFileInput,
    parseBtn,
    saveBtn
  } = elements

  // Ініціалізуємо обробники файлів
  initFileHandlers()

  // Ініціалізуємо рендерер
  initRenderer()

  // Показати / приховати поле для ключового слова
  useKeywordChk.addEventListener('change', () => {
    if (useKeywordChk.checked) {
      keywordInput.style.display = 'inline-block'
    } else {
      keywordInput.style.display = 'none'
      keywordInput.value = ''
    }
  })

  // Показати / приховати поле для файлу бази імен
  useDbChk.addEventListener('change', () => {
    if (useDbChk.checked) {
      dbFileInput.style.display = 'inline-block'

      // Перевіряємо, чи є вже дані в базі
      const nameDatabase = getNameDatabase()
      if (Object.keys(nameDatabase).length > 0) {
        // Якщо база вже завантажена, перестворюємо таблицю з урахуванням бази
        rerender()
      }
    } else {
      dbFileInput.style.display = 'none'
      // Скидаємо базу даних при знятті галки
      elements.dbStatus.textContent = 'База не завантажена'
      elements.dbStatus.classList.remove('loaded')

      // Перерендерим без порівняння з базою
      rerender()
    }
  })

  // Кнопка парсингу
  parseBtn.addEventListener('click', handleParse)

  // Кнопка збереження
  saveBtn.addEventListener('click', handleSave)

  // Додаємо обробник для клавіші Enter у полі ключового слова
  keywordInput.addEventListener('keyup', event => {
    if (event.key === 'Enter') {
      handleParse()
    }
  })
}

/**
 * Обробник кнопки парсингу
 */
function handleParse () {
  const { chatInput, useKeywordChk, keywordInput, useDbChk } = elements

  const text = chatInput.value
  if (!text.trim()) {
    showNotification('Вставте текст чату або завантажте файл!', 'warning')
    return
  }

  // Отримуємо ключове слово, якщо вказано
  const keyword = useKeywordChk.checked ? keywordInput.value.trim() : ''

  // Парсимо чат
  const parseResult = parseChat(text, keyword)
  displayedNames = parseResult.displayedNames

  // Якщо увімкнено базу імен, порівнюємо імена
  if (useDbChk.checked) {
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
    useDbChk.checked,
    getMatchedNames()
  )
}

/**
 * Ререндерить список учасників зі збереженням поточних налаштувань
 */
function rerender () {
  updateNamesList(
    displayedNames,
    getRealNameMap(),
    elements.useDbChk.checked,
    getMatchedNames()
  )
}

/**
 * Обробник кнопки збереження
 */
function handleSave () {
  saveList(
    displayedNames,
    getRealNameMap(),
    elements.useDbChk.checked,
    getMatchedNames()
  )
}

// Ініціалізація після завантаження сторінки
document.addEventListener('DOMContentLoaded', () => {
  initApp()

  // Задаємо по замовчуванню сортування за ID
  elements.sortById.click()
})

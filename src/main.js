import { elements } from './core/dom.js';
import { saveParticipants } from './features/chat/chat-exporter.js';
import { initChatFileHandlers } from './features/chat/chat-operations.js';
import { showNotification } from './core/notification.js';
import { getRealNameMap, parseChat } from './features/chat/chat-parser.js';
import { initRenderer, updateNamesList } from './ui/renderer/renderer.js';
import { initTheme } from './core/theme.js';
import { initTabs } from './core/tabs.js';
import { initParserUI } from './ui/parser-ui.js';
import { initChatView } from './ui/components/chat-view.js';
import { initLegendAccordion } from './ui/components/legend-accordion.js';
import {
  initDatabaseManager,
  getOldFormatDatabase
} from './features/database/database-manager.js';
import { NameMatcher } from './features/name-processing/name-database.js';

// Стан додатку
let displayedNames = [];
const nameMatcher = new NameMatcher(); // Ініціалізація на рівні модуля

/**
 * Ініціалізація додатку
 */
function initApp() {
  const {
    useKeywordChk,
    keywordInput,
    parseBtn,
    saveBtn,
    saveCsvBtn,
    saveJsonBtn
  } = elements;

  console.log('initApp викликано, nameMatcher ініціалізовано:', nameMatcher);
  console.log('Доступність ключових елементів:', {
    useKeywordChk: !!useKeywordChk,
    keywordInput: !!keywordInput,
    parseBtn: !!parseBtn,
    saveBtn: !!saveBtn,
    saveCsvBtn: !!saveCsvBtn,
    saveJsonBtn: !!saveJsonBtn,
    sortById: !!elements.sortById
  });

  // Ініціалізуємо вкладки
  initTabs();

  // Ініціалізуємо обробники файлів
  const fileInput = document.getElementById('fileInput');
  const chatInput = document.getElementById('chatInput');
  if (fileInput && chatInput) {
    initChatFileHandlers(fileInput, chatInput);
  } else {
    console.warn('Не знайдено елементи для обробки файлів чату');
  }

  // Ініціалізуємо рендерер
  initRenderer();

  // Ініціалізуємо тему
  initTheme();

  // Ініціалізуємо менеджер бази даних
  initDatabaseManager();

  // Ініціалізуємо покращений інтерфейс парсера
  initParserUI();

  // Ініціалізуємо відображення чату
  initChatView();

  // Ініціалізуємо акордеон легенди
  initLegendAccordion();

  // Ініціалізуємо базу даних при запуску
  setTimeout(() => {
    // Спробуємо використати базу з менеджера
    tryUseManagerDatabase();
  }, 500);

  // Підписуємося на подію зміни вкладки
  document.addEventListener('tabChanged', e => {
    const tab = e.detail.tab;

    // Якщо перейшли на вкладку "Учасники", оновлюємо дані
    if (tab === 'participants' && displayedNames.length > 0) {
      // Оновлюємо список учасників
      rerender();
    }
  });

  // Показати / приховати поле для ключового слова
  if (useKeywordChk) {
    useKeywordChk.addEventListener('change', () => {
      if (useKeywordChk.checked) {
        keywordInput.style.display = 'inline-block';
      } else {
        keywordInput.style.display = 'none';
        keywordInput.value = '';
      }
    });
  } else {
    console.warn('Елемент useKeywordChk не знайдено в DOM');
  }

  // Кнопка парсингу
  if (parseBtn) {
    parseBtn.addEventListener('click', handleParse);
  } else {
    console.warn('Елемент parseBtn не знайдено в DOM');
  }

  // Кнопки збереження
  if (saveBtn) {
    saveBtn.addEventListener('click', handleSaveTxt);
  } else {
    console.warn('Елемент saveBtn не знайдено в DOM');
  }

  if (saveCsvBtn) {
    saveCsvBtn.addEventListener('click', handleSaveCsv);
  } else {
    console.warn('Елемент saveCsvBtn не знайдено в DOM');
  }

  if (saveJsonBtn) {
    saveJsonBtn.addEventListener('click', handleSaveJson);
  } else {
    console.warn('Елемент saveJsonBtn не знайдено в DOM');
  }

  // Додаємо обробник для клавіші Enter у полі ключового слова
  if (keywordInput) {
    keywordInput.addEventListener('keyup', event => {
      if (event.key === 'Enter') {
        handleParse();
      }
    });
  } else {
    console.warn('Елемент keywordInput не знайдено в DOM');
  }
}

/**
 * Спробувати використати базу даних з менеджера
 */
async function tryUseManagerDatabase() {
  // Отримуємо базу в старому форматі
  const oldFormatDb = getOldFormatDatabase();

  // Перевіряємо, чи є записи
  if (Object.keys(oldFormatDb).length > 0) {
    // Встановлюємо базу для використання
    nameMatcher.setNameDatabase(oldFormatDb);

    // Оновлюємо статус
    updateDbStatus(Object.keys(oldFormatDb).length);

    // Якщо є відображені імена, оновлюємо список
    if (displayedNames.length > 0) {
      // Порівнюємо імена з базою
      nameMatcher.compareNames(displayedNames, getRealNameMap());

      // Оновлюємо відображення
      await rerender();
    }
  } else {
    // Немає записів у базі, встановлюємо статус "не завантажено"
    const dbStatus = document.getElementById('dbStatus');
    if (dbStatus) {
      dbStatus.textContent = 'База не завантажена';
      dbStatus.classList.remove('loaded');
    }
  }
}

// Підписуємося на подію зміни бази даних з більш надійною обробкою
document.addEventListener('databaseUpdated', async e => {
  console.log('Отримано подію оновлення бази даних:', e.detail);

  // Перевіряємо, чи ініціалізований nameMatcher
  if (!nameMatcher) {
    console.error('nameMatcher не ініціалізований під час події databaseUpdated');
    showNotification('Помилка: NameMatcher не ініціалізовано', 'error');
    return;
  }

  // Отримуємо останню версію бази даних
  const nameDatabase = await nameMatcher.getNameDatabase();

  // Оновлюємо статус бази даних
  updateDbStatus(e.detail.databaseSize);

  // Якщо є відображені імена, оновлюємо список
  if (displayedNames.length > 0) {
    // Очистимо кеш перед перепорівнянням
    nameMatcher.clearMatchedNamesCache();

    // Порівнюємо імена з базою
    nameMatcher.compareNames(displayedNames, getRealNameMap());

    // Оновлюємо відображення
    await updateNamesList(
      displayedNames,
      getRealNameMap(),
      true,
      nameMatcher.getMatchedNames(),
      nameMatcher
    );

    console.log(
      'Список учасників оновлено з новою базою даних, часова мітка:',
      e.detail.timestamp
    );
  }
});

/**
 * Очистити кеш співпадінь перед оновленням
 */
function clearMatchedNamesCache() {
  if (!nameMatcher) {
    console.error('nameMatcher не ініціалізований під час clearMatchedNamesCache');
    return;
  }
  nameMatcher.clearMatchedNamesCache();
}

/**
 * Оновити статус бази даних
 * @param {number} entriesCount - Кількість записів у базі
 */
function updateDbStatus(entriesCount) {
  const dbStatus = document.getElementById('dbStatus');
  if (!dbStatus) return;

  if (entriesCount > 0) {
    dbStatus.textContent = `База завантажена: ${entriesCount} записів`;
    dbStatus.classList.add('loaded');
  } else {
    dbStatus.textContent = 'База не завантажена';
    dbStatus.classList.remove('loaded');
  }
}

/**
 * Обробник кнопки парсингу
 */
async function handleParse() {
  const { chatInput, useKeywordChk, keywordInput } = elements;

  const text = chatInput.value;
  if (!text.trim()) {
    showNotification('Вставте текст чату або завантажте файл!', 'warning');
    return;
  }

  // Отримуємо ключове слово, якщо вказано
  const keyword =
    useKeywordChk && useKeywordChk.checked ? keywordInput.value.trim() : '';

  // Парсимо чат
  const parseResult = parseChat(text, keyword);
  displayedNames = parseResult.displayedNames;

  // Завжди отримуємо свіжу версію бази даних
  const nameDatabase = await nameMatcher.getNameDatabase();
  console.log(
    `Отримано базу даних з ${Object.keys(nameDatabase).length} записів`
  );

  const hasDatabaseEntries = Object.keys(nameDatabase).length > 0;

  // Якщо є база даних, порівнюємо імена
  if (hasDatabaseEntries) {
    // Порівнюємо імена з базою
    nameMatcher.compareNames(displayedNames, getRealNameMap());

    // Отримуємо кількість нерозпізнаних імен
    const unrecognizedNames = nameMatcher.getUnrecognizedNames();
    if (unrecognizedNames.length > 0) {
      showNotification(
        `Парсинг завершено! Знайдено ${displayedNames.length} імен, ${unrecognizedNames.length} не розпізнано.`,
        'success'
      );
    } else {
      showNotification(
        `Парсинг завершено! Всі ${displayedNames.length} імен знайдено в базі.`,
        'success'
      );
    }
  } else {
    showNotification(
      `Парсинг завершено! Імен знайдено: ${displayedNames.length}`,
      'success'
    );
  }

  // Відображаємо результати
  await updateNamesList(
    displayedNames,
    getRealNameMap(),
    hasDatabaseEntries,
    nameMatcher.getMatchedNames(),
    nameMatcher
  );

  // Перемикаємося на вкладку "Учасники"
  const participantsTabBtn = document.querySelector(
    '.tab-button[data-tab="participants"]'
  );
  if (participantsTabBtn) {
    participantsTabBtn.click();
  }
}

/**
 * Ререндерить список учасників зі збереженням поточних налаштувань
 */
async function rerender() {
  // Перевіряємо наявність бази даних
  const nameDatabase = await nameMatcher.getNameDatabase();
  const hasDatabaseEntries = Object.keys(nameDatabase).length > 0;

  await updateNamesList(
    displayedNames,
    getRealNameMap(),
    hasDatabaseEntries,
    nameMatcher.getMatchedNames(),
    nameMatcher
  );
}

/**
 * Обробник кнопки збереження в TXT
 */
function handleSaveTxt() {
  saveParticipants(nameMatcher, displayedNames, getRealNameMap(), true, nameMatcher.getMatchedNames(), 'txt');
}

/**
 * Обробник кнопки збереження в CSV
 */
function handleSaveCsv() {
  saveParticipants(nameMatcher, displayedNames, getRealNameMap(), true, nameMatcher.getMatchedNames(), 'csv');
}

/**
 * Обробник кнопки збереження в JSON
 */
function handleSaveJson() {
  saveParticipants(nameMatcher, displayedNames, getRealNameMap(), true, nameMatcher.getMatchedNames(), 'json');
}

// Ініціалізація після завантаження сторінки
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initApp();
    // Задаємо по замовчуванню сортування за ID
    if (elements.sortById) {
      elements.sortById.click();
    }
  });
} else {
  // Якщо DOM уже завантажений, викликаємо initApp одразу
  initApp();
  if (elements.sortById) {
    elements.sortById.click();
  }
}
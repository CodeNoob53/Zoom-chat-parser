// Файл: src/ui/renderer.js
import { initSortListeners } from './sorting.js';
import { renderNames } from '../components/table-renderer.js';
import { setRerenderCallback } from './render-utils.js';

/**
 * Ініціалізація рендерера з оптимізаціями оновлення DOM
 */
export function initRenderer() {
  // Ініціалізуємо обробники сортування
  initSortListeners();
  
  // Встановлюємо функцію для ререндерингу
  setRerenderCallback(rerender);
  
  // Оптимізуємо ререндерінг - додаємо дебаунс для частих викликів
  setupRenderDebounce();
}

/**
 * Встановлює дебаунс для ререндерингу, щоб уникнути частих оновлень DOM
 */
function setupRenderDebounce() {
  let debounceTimer = null;
  
  // Оригінальна функція ререндерингу
  const originalRerender = window.rerender || function() {};
  
  // Функція з дебаунсом
  window.rerender = function(...args) {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    
    debounceTimer = setTimeout(() => {
      originalRerender(...args);
      debounceTimer = null;
    }, 50); // 50мс затримка для дебаунсу
  };
}

// Зберігаємо поточні дані для ререндерингу
let currentData = {
  displayedNames: [],
  realNameMap: {},
  useDbChk: false,
  matchedNames: {},
  nameMatcher: null // Додаємо nameMatcher до стану
};

// Стан рендерингу
let renderState = {
  isRendering: false,  // Чи відбувається зараз рендеринг
  pendingUpdate: false // Чи потрібно оновити після поточного рендерингу
};

/**
 * Оновлює відображення списку імен з переданими параметрами
 * Використовує механізми для запобігання зайвого перемалювання DOM
 * @param {string[]} displayedNames - Масив імен для відображення
 * @param {Object} realNameMap - Карта відповідності Zoom-імені до реального імені
 * @param {boolean} useDbChk - Чи використовувати базу імен
 * @param {Object} matchedNames - Результати порівняння з базою імен
 * @param {Object} nameMatcher - Екземпляр класу NameMatcher
 * @param {boolean} useRecs - Чи використовувати рекомендації (за замовчуванням true)
 */
export async function updateNamesList(displayedNames, realNameMap, useDbChk, matchedNames, nameMatcher, useRecs = true) {
  // Якщо немає імен для відображення, нічого не робимо
  if (!displayedNames || displayedNames.length === 0) {
    return;
  }
  // Зберігаємо поточні дані для подальшого ререндерингу
  currentData = {
    displayedNames,
    realNameMap,
    useDbChk,
    matchedNames,
    nameMatcher,
    useRecs
  };
  // Якщо рендеринг в процесі, відкладаємо оновлення
  if (renderState.isRendering) {
    renderState.pendingUpdate = true;
    return;
  }
  // Починаємо рендеринг
  renderState.isRendering = true;
  // Використовуємо requestAnimationFrame для синхронізації з циклом перемалювання браузера
  requestAnimationFrame(async () => {
    // Викликаємо рендеринг з параметром useRecs
    await renderNames(nameMatcher, displayedNames, realNameMap, useDbChk, matchedNames, useRecs);
    // Завершуємо рендеринг
    renderState.isRendering = false;
    // Якщо були відкладені оновлення, виконуємо їх
    if (renderState.pendingUpdate) {
      renderState.pendingUpdate = false;
      await updateNamesList(
        currentData.displayedNames, 
        currentData.realNameMap, 
        currentData.useDbChk, 
        currentData.matchedNames,
        currentData.nameMatcher,
        currentData.useRecs
      );
    }
  });
}

/**
 * Ререндерить список учасників зі збереженням поточних налаштувань
 * Використовує кешування та оптимізації для уникнення зайвого оновлення DOM
 */
function rerender() {
  updateNamesList(
    currentData.displayedNames, 
    currentData.realNameMap, 
    currentData.useDbChk, 
    currentData.matchedNames,
    currentData.nameMatcher
  );
}
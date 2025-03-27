import { elements } from './dom.js';
import { initSortListeners } from './sorting.js';
import { renderNames } from './table-renderer.js';
import { setRerenderCallback } from './render-utils.js';

/**
 * Ініціалізація слухачів подій для сортування
 */
export function initRenderer() {
  // Ініціалізуємо обробники сортування
  initSortListeners();
  
  // Встановлюємо функцію для ререндерингу
  setRerenderCallback(rerender);
}

// Зберігаємо поточні дані для ререндерингу
let currentData = {
  displayedNames: [],
  realNameMap: {},
  useDbChk: false,
  matchedNames: {}
};

/**
 * Оновлює відображення списку імен з переданими параметрами
 * @param {string[]} displayedNames - Масив імен для відображення
 * @param {Object} realNameMap - Карта відповідності Zoom-імені до реального імені
 * @param {boolean} useDbChk - Чи використовувати базу імен
 * @param {Object} matchedNames - Результати порівняння з базою імен
 */
export function updateNamesList(displayedNames, realNameMap, useDbChk, matchedNames) {
  // Зберігаємо поточні дані для подальшого ререндерингу
  currentData = {
    displayedNames,
    realNameMap,
    useDbChk,
    matchedNames
  };
  
  // Викликаємо рендеринг
  renderNames(displayedNames, realNameMap, useDbChk, matchedNames);
}

/**
 * Ререндерить список учасників зі збереженням поточних налаштувань
 */
function rerender() {
  renderNames(
    currentData.displayedNames, 
    currentData.realNameMap, 
    currentData.useDbChk, 
    currentData.matchedNames
  );
}
/**
 * Модуль для роботи з вкладками
 */

// Стан вкладок
let activeTab = 'parser';

/**
 * Ініціалізувати систему вкладок
 */
export function initTabs() {
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');
  
  // Встановлюємо початкову активну вкладку з localStorage або за замовчуванням
  const savedTab = localStorage.getItem('activeTab') || 'parser';
  activateTab(savedTab);
  
  // Додаємо обробники кліку для кнопок вкладок
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tabId = button.getAttribute('data-tab');
      activateTab(tabId);
      
      // Зберігаємо активну вкладку в localStorage
      localStorage.setItem('activeTab', tabId);
    });
  });
}

/**
 * Активувати вказану вкладку
 * @param {string} tabId - Ідентифікатор вкладки для активації
 */
function activateTab(tabId) {
  // Змінюємо стан активної вкладки
  activeTab = tabId;
  
  // Отримуємо всі кнопки вкладок та вміст вкладок
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');
  
  // Деактивуємо всі вкладки
  tabButtons.forEach(button => {
    button.classList.remove('active');
  });
  
  tabContents.forEach(content => {
    content.classList.remove('active');
  });
  
  // Активуємо вибрану вкладку
  const activeButton = document.querySelector(`.tab-button[data-tab="${tabId}"]`);
  const activeContent = document.getElementById(`${tabId}-tab`);
  
  if (activeButton) {
    activeButton.classList.add('active');
  }
  
  if (activeContent) {
    activeContent.classList.add('active');
  }
  
  // Викликаємо подію зміни вкладки
  document.dispatchEvent(new CustomEvent('tabChanged', { detail: { tab: tabId } }));
}

/**
 * Отримати ID поточної активної вкладки
 * @returns {string} ID активної вкладки
 */
export function getActiveTab() {
  return activeTab;
}
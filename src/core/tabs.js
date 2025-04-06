/**
 * Модуль для роботи з вкладками з покращеним керуванням висотою та розташуванням
 */

// Стан вкладок
let activeTab = 'parser';

/**
 * Ініціалізувати систему вкладок
 */
export function initTabs() {
  const tabButtons = document.querySelectorAll('.tab-button');
  
  // Якщо вкладок немає, виходимо
  if (!tabButtons || tabButtons.length === 0) return;
  
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

  // Обробляємо зміну розміру вікна для адаптивності
  window.addEventListener('resize', adjustContainerHeights);
  
  // Викликаємо один раз для початкового налаштування
  adjustContainerHeights();
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
    
    // Налаштовуємо висоту контейнерів
    adjustContainerHeights();
  }
  
  // Викликаємо подію зміни вкладки
  document.dispatchEvent(new CustomEvent('tabChanged', { 
    detail: { tab: tabId }
  }));
}

/**
 * Налаштовує висоту контейнерів залежно від контенту
 */
function adjustContainerHeights() {
  // Отримуємо поточну активну вкладку
  const activeContent = document.querySelector('.tab-content.active');
  if (!activeContent) return;
  
  // Отримуємо табличний контейнер активної вкладки
  const tableContainer = activeContent.querySelector('.table-container');
  if (!tableContainer) return;
  
  // Розрахуємо доступний простір
  const tabContentContainer = document.querySelector('.tab-content-container');
  const contentHeight = tabContentContainer.clientHeight;
  
  // Визначаємо висоту інших елементів у вкладці
  const otherElements = Array.from(activeContent.children).filter(el => el !== tableContainer);
  const otherElementsHeight = otherElements.reduce((sum, el) => {
    // Враховуємо margin
    const style = window.getComputedStyle(el);
    const verticalMargin = parseFloat(style.marginTop) + parseFloat(style.marginBottom);
    return sum + el.offsetHeight + verticalMargin;
  }, 0);
  
  // Розраховуємо оптимальну висоту для табличного контейнера
  let optimalHeight = contentHeight - otherElementsHeight - 30; // 30px запас
  
  // Обмежуємо мінімальну та максимальну висоту
  optimalHeight = Math.max(200, Math.min(optimalHeight, 500));
  
  // Встановлюємо висоту
  tableContainer.style.height = optimalHeight + 'px';
}

/**
 * Отримати ID поточної активної вкладки
 * @returns {string} ID активної вкладки
 */
export function getActiveTab() {
  return activeTab;
}
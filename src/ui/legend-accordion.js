/**
 * Модуль для керування акордеоном легенди
 * Дозволяє плавно розгортати/згортати блок легенди та зберігати стан між сесіями
 */

/**
 * Ініціалізує інтерактивний акордеон для легенди
 */
export function initLegendAccordion() {
    const legendToggle = document.getElementById('legendToggle');
    const legendContent = document.getElementById('legendContent');
    const toggleIcon = document.querySelector('.legend-toggle .toggle-icon');
    
    if (!legendToggle || !legendContent) {
      console.log('Елементи акордеону легенди не знайдено');
      return;
    }
    
    // Перевіряємо збережений стан з localStorage
    const isExpanded = localStorage.getItem('legendExpanded') === 'true';
    
    // Встановлюємо початковий стан
    if (isExpanded) {
      legendContent.style.maxHeight = legendContent.scrollHeight + 'px';
      legendContent.style.opacity = '1';
      legendContent.style.display = 'flex';
      legendContent.style.padding = '1rem'; // Додано: встановлення паддінгу
      legendToggle.setAttribute('aria-expanded', 'true');
      
      if (toggleIcon) {
        toggleIcon.textContent = 'expand_less'; // Змінюємо іконку
      }
    } else {
      legendContent.style.maxHeight = '0';
      legendContent.style.opacity = '0';
      // Не ховаємо повністю з display: none для можливості анімації
      legendContent.style.display = 'flex';
      legendContent.style.visibility = 'hidden';
    }
    
    // Додаємо обробник кліку
    legendToggle.addEventListener('click', () => {
      const expanded = legendToggle.getAttribute('aria-expanded') === 'true';
      
      // Змінюємо стан
      if (expanded) {
        // Анімація згортання
        legendContent.style.maxHeight = '0';
        legendContent.style.opacity = '0';
        legendContent.style.visibility = 'hidden';
        legendToggle.setAttribute('aria-expanded', 'false');
        localStorage.setItem('legendExpanded', 'false');
        
        if (toggleIcon) {
          toggleIcon.textContent = 'expand_more';
        }
      } else {
        // Анімація розгортання
        legendContent.style.visibility = 'visible';
        legendContent.style.maxHeight = legendContent.scrollHeight + 'px';
        legendContent.style.opacity = '1';
        legendContent.style.padding = '1rem'; // Додано: встановлення паддінгу під час розгортання
        legendToggle.setAttribute('aria-expanded', 'true');
        localStorage.setItem('legendExpanded', 'true');
        
        if (toggleIcon) {
          toggleIcon.textContent = 'expand_less';
        }
      }
    });
    
    // Додаємо обробник для кінця транзиції
    legendContent.addEventListener('transitionend', function(e) {
      // Реагуємо тільки на зміну maxHeight
      if (e.propertyName === 'max-height' && legendContent.style.maxHeight === '0px') {
        // Після згортання забезпечуємо правильний скролінг, якщо потрібно
        window.dispatchEvent(new Event('resize'));
      }
    });
    
    console.log('Акордеон легенди ініціалізовано з плавною анімацією');
  }
  
  /**
   * Програмно розгорнути легенду
   */
  export function expandLegend() {
    const legendToggle = document.getElementById('legendToggle');
    const legendContent = document.getElementById('legendContent');
    const toggleIcon = document.querySelector('.legend-toggle .toggle-icon');
    
    if (!legendToggle || !legendContent) return;
    
    legendContent.style.visibility = 'visible';
    legendContent.style.maxHeight = legendContent.scrollHeight + 'px';
    legendContent.style.opacity = '1';
    legendContent.style.padding = '1rem';
    legendToggle.setAttribute('aria-expanded', 'true');
    localStorage.setItem('legendExpanded', 'true');
    
    if (toggleIcon) {
      toggleIcon.textContent = 'expand_less';
    }
  }
  
  /**
   * Програмно згорнути легенду
   */
  export function collapseLegend() {
    const legendToggle = document.getElementById('legendToggle');
    const legendContent = document.getElementById('legendContent');
    const toggleIcon = document.querySelector('.legend-toggle .toggle-icon');
    
    if (!legendToggle || !legendContent) return;
    
    legendContent.style.maxHeight = '0';
    legendContent.style.opacity = '0';
    legendContent.style.visibility = 'hidden';
    legendToggle.setAttribute('aria-expanded', 'false');
    localStorage.setItem('legendExpanded', 'false');
    
    if (toggleIcon) {
      toggleIcon.textContent = 'expand_more';
    }
  }
  
  /**
   * Отримати поточний стан легенди (розгорнуто/згорнуто)
   * @returns {boolean} true якщо розгорнуто, false якщо згорнуто
   */
  export function isLegendExpanded() {
    const legendToggle = document.getElementById('legendToggle');
    
    if (!legendToggle) return false;
    
    return legendToggle.getAttribute('aria-expanded') === 'true';
  }
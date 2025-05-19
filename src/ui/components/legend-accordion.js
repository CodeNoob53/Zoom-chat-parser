/**
 * Ініціалізує інтерактивний акордеон для легенди
 */
export function initLegendAccordion () {
  const legendToggle = document.getElementById('legendToggle')
  const legendContent = document.getElementById('legendContent')
  const toggleIcon = document.querySelector('.legend-toggle .toggle-icon')

  if (!legendToggle || !legendContent) {
    console.log('Елементи акордеону легенди не знайдено')
    return
  }

  // Перевіряємо збережений стан з localStorage
  const isExpanded = localStorage.getItem('legendExpanded') === 'true'

  // Функція для правильного розрахунку висоти контента
  const calculateHeight = () => {
    // Тимчасово встановлюємо стилі для правильного вимірювання висоти
    const originalStyles = {
      maxHeight: legendContent.style.maxHeight,
      visibility: legendContent.style.visibility,
      opacity: legendContent.style.opacity,
      padding: legendContent.style.padding,
      display: legendContent.style.display
    }

    legendContent.style.maxHeight = 'none'
    legendContent.style.visibility = 'hidden'
    legendContent.style.opacity = '0'
    legendContent.style.padding = '1rem'
    legendContent.style.display = 'flex'

    // Отримуємо повну висоту включно з паддінгом, бордером тощо
    const height = legendContent.offsetHeight

    // Повертаємо оригінальні стилі
    legendContent.style.maxHeight = originalStyles.maxHeight
    legendContent.style.visibility = originalStyles.visibility
    legendContent.style.opacity = originalStyles.opacity
    legendContent.style.padding = originalStyles.padding
    legendContent.style.display = originalStyles.display

    return height
  }

  // Встановлюємо початковий стан
  if (isExpanded) {
    // Призначаємо спочатку стилі для коректного відображення
    legendContent.style.visibility = 'visible'
    legendContent.style.padding = '1rem'
    legendContent.style.display = 'flex'
    // Встановлюємо фіксовану висоту 261px замість автоматичного розрахунку
    legendContent.style.maxHeight = '261px'
    legendContent.style.opacity = '1'
    legendToggle.setAttribute('aria-expanded', 'true')

    if (toggleIcon) {
      toggleIcon.textContent = 'expand_less'
    }
  } else {
    legendContent.style.maxHeight = '0'
    legendContent.style.opacity = '0'
    legendContent.style.padding = '0'
    legendContent.style.visibility = 'hidden'
    legendToggle.setAttribute('aria-expanded', 'false')

    if (toggleIcon) {
      toggleIcon.textContent = 'expand_more'
    }
  }

  // Додаємо обробник кліку
  legendToggle.addEventListener('click', () => {
    const expanded = legendToggle.getAttribute('aria-expanded') === 'true'

    // Змінюємо стан
    if (expanded) {
      // Анімація згортання
      legendContent.style.maxHeight = '0'
      legendContent.style.opacity = '0'
      legendContent.style.padding = '0 0 0 1rem'
      legendContent.style.visibility = 'hidden'
      legendToggle.setAttribute('aria-expanded', 'false')
      localStorage.setItem('legendExpanded', 'false')

      if (toggleIcon) {
        toggleIcon.textContent = 'expand_more'
      }
    } else {
      // Анімація розгортання
      legendContent.style.visibility = 'visible'
      legendContent.style.padding = '1rem'
      // Використовуємо фіксовану висоту для розгортання
      legendContent.style.maxHeight = '261px'
      legendContent.style.opacity = '1'
      legendToggle.setAttribute('aria-expanded', 'true')
      localStorage.setItem('legendExpanded', 'true')

      if (toggleIcon) {
        toggleIcon.textContent = 'expand_less'
      }
    }
  })

  // Додаємо обробник для кінця транзиції
  legendContent.addEventListener('transitionend', function (e) {
    if (
      (e.propertyName === 'max-height' || e.propertyName === 'opacity') &&
      legendContent.style.maxHeight === '0px'
    ) {
      window.dispatchEvent(new Event('resize'))
    }
  })

  console.log('Акордеон легенди ініціалізовано з плавною анімацією')
}

/**
 * Програмно розгорнути легенду
 */
export function expandLegend () {
  const legendToggle = document.getElementById('legendToggle')
  const legendContent = document.getElementById('legendContent')
  const toggleIcon = document.querySelector('.legend-toggle .toggle-icon')

  if (!legendToggle || !legendContent) return

  legendContent.style.visibility = 'visible'
  legendContent.style.padding = '1rem'
  // Використовуємо фіксовану висоту 261px
  legendContent.style.maxHeight = '261px'
  legendContent.style.opacity = '1'
  legendToggle.setAttribute('aria-expanded', 'true')
  localStorage.setItem('legendExpanded', 'true')

  if (toggleIcon) {
    toggleIcon.textContent = 'expand_less'
  }
}

/**
 * Програмно згорнути легенду
 */
export function collapseLegend () {
  const legendToggle = document.getElementById('legendToggle')
  const legendContent = document.getElementById('legendContent')
  const toggleIcon = document.querySelector('.legend-toggle .toggle-icon')

  if (!legendToggle || !legendContent) return

  legendContent.style.maxHeight = '0'
  legendContent.style.opacity = '0'
  legendContent.style.padding = '0 0 0 1rem'
  legendContent.style.visibility = 'hidden'
  legendToggle.setAttribute('aria-expanded', 'false')
  localStorage.setItem('legendExpanded', 'false')

  if (toggleIcon) {
    toggleIcon.textContent = 'expand_more'
  }
}

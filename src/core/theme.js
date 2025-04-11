// Функція для збереження теми у localStorage
function saveTheme(theme) {
  localStorage.setItem('app-theme', theme);
}

// Функція для отримання збереженої теми
function getSavedTheme() {
  return localStorage.getItem('app-theme') || 'dark';
}

// Функція для встановлення теми
export function setTheme(theme) {
  // Додаємо або видаляємо клас теми для body
  if (theme === 'dark') {
    document.body.classList.remove('light-theme');
  } else {
    document.body.classList.add('light-theme');
  }
  
  // Оновлюємо іконку
  const themeToggleIcon = document.querySelector('#themeToggle .material-icons');
  if (themeToggleIcon) {
    themeToggleIcon.textContent = theme === 'dark' ? 'dark_mode' : 'light_mode';
  }
  
  // Зберігаємо вибір теми
  saveTheme(theme);
  
  // Запускаємо подію зміни теми для можливих слухачів
  document.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme } }));
}

// Ініціалізація теми
export function initTheme() {
  const savedTheme = getSavedTheme();
  setTheme(savedTheme);

  // Додаємо обробник кліку на кнопку зміни теми
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const currentTheme = getSavedTheme();
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      setTheme(newTheme);
    });
  }
}
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
    document.body.classList.remove('light-theme', 'dark-theme');
    document.body.classList.add(`${theme}-theme`);
    
    // Оновлюємо іконку
    const themeToggleIcon = document.querySelector('#themeToggle .material-icons');
    themeToggleIcon.textContent = theme === 'dark' ? 'dark_mode' : 'light_mode';
    
    saveTheme(theme);
  }
  
  // Ініціалізація теми
  export function initTheme() {
    const savedTheme = getSavedTheme();
    setTheme(savedTheme);
  
    // Додаємо обробник кліку на кнопку зміни теми
    const themeToggle = document.getElementById('themeToggle');
    themeToggle.addEventListener('click', () => {
      const currentTheme = document.body.classList.contains('dark-theme') ? 'dark' : 'light';
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      setTheme(newTheme);
    });
  }
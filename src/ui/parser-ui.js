/**
 * Модуль для покращеної взаємодії з користувачем на вкладці парсера
 * Додає сучасні інтерактивні елементи та покращує UX
 */
import { elements } from '../core/dom.js';
import { showNotification } from '../core/notification.js';

// Стан інтерфейсу парсера
let parserUIState = {
  fileSelected: false,
  keywordEnabled: false,
  isParsingInProgress: false
};

/**
 * Ініціалізація інтерфейсу вкладки парсера
 */
export function initParserUI() {
  const { 
    chatInput, 
    fileInput, 
    useKeywordChk, 
    keywordInput, 
    parseBtn 
  } = elements;

  // Ініціалізація обробників подій для завантаження файлів
  if (fileInput) {
    initFileUpload(fileInput);
  }

  // Ініціалізація поля для вставки тексту чату
  if (chatInput) {
    initChatTextarea(chatInput);
  }

  // Ініціалізація поля для ключового слова
  if (useKeywordChk && keywordInput) {
    initKeywordField(useKeywordChk, keywordInput);
  }

  // Ініціалізація кнопки парсингу
  if (parseBtn) {
    initParseButton(parseBtn);
  }

  // Ініціалізація додаткових ефектів для полів вводу
  initInputEffects();

  console.log('Інтерфейс вкладки парсера ініціалізовано');
}

/**
 * Ініціалізація обробників для поля вибору файлу
 * @param {HTMLElement} fileInput - Елемент вибору файлу
 */
function initFileUpload(fileInput) {
  // Знаходимо батьківський контейнер і лейбл
  const container = fileInput.closest('.file-upload');
  const label = container?.querySelector('.file-upload-label');
  
  if (!container || !label) return;

  // Додаємо обробник події зміни файлу
  fileInput.addEventListener('change', (e) => {
    const fileName = e.target.files[0]?.name;
    
    if (fileName) {
      // Оновлюємо текст лейблу для відображення імені файлу
      const nameSpan = label.querySelector('span:not(.material-icons)');
      if (nameSpan) {
        nameSpan.textContent = `Вибрано: ${fileName}`;
      }
      
      // Додаємо клас для візуального відображення вибраного файлу
      label.classList.add('file-selected');
      parserUIState.fileSelected = true;
      
      // Показуємо сповіщення про вибір файлу
      showNotification(`Файл "${fileName}" вибрано і готовий до обробки`, 'success');
    } else {
      // Повертаємо оригінальний текст, якщо файл не вибрано
      const nameSpan = label.querySelector('span:not(.material-icons)');
      if (nameSpan) {
        nameSpan.textContent = 'Завантажити файл чату (.txt)';
      }
      label.classList.remove('file-selected');
      parserUIState.fileSelected = false;
    }
  });

  // Додаємо ефект перетягування файлів (drag & drop)
  label.addEventListener('dragover', (e) => {
    e.preventDefault();
    label.classList.add('file-dragover');
  });

  label.addEventListener('dragleave', () => {
    label.classList.remove('file-dragover');
  });

  label.addEventListener('drop', (e) => {
    e.preventDefault();
    label.classList.remove('file-dragover');
    
    if (e.dataTransfer.files.length) {
      fileInput.files = e.dataTransfer.files;
      fileInput.dispatchEvent(new Event('change'));
    }
  });
}

/**
 * Ініціалізація текстового поля для вставки чату
 * @param {HTMLElement} chatInput - Текстове поле для вставки чату
 */
function initChatTextarea(chatInput) {
  // Обробник події вставки тексту
  chatInput.addEventListener('paste', () => {
    // Показуємо індикатор завантаження
    chatInput.classList.add('loading');
    
    // Встановлюємо невеликий таймаут для завершення вставки
    setTimeout(() => {
      chatInput.classList.remove('loading');
      
      // Перевіряємо, чи є значення після вставки
      if (chatInput.value.trim()) {
        // Автоматично прокручуємо вниз, щоб побачити весь текст
        chatInput.scrollTop = chatInput.scrollHeight;
        
        // Додаємо клас для показу стану з даними
        chatInput.classList.add('has-content');
        
        // Показуємо сповіщення
        showNotification('Текст вставлено успішно', 'success');
      } else {
        chatInput.classList.remove('has-content');
      }
    }, 100);
  });
  
  // Відстеження зміни контенту
  chatInput.addEventListener('input', () => {
    if (chatInput.value.trim()) {
      chatInput.classList.add('has-content');
    } else {
      chatInput.classList.remove('has-content');
    }
  });

  // Додаємо обробник для клавіш Ctrl+Enter для швидкого парсингу
  chatInput.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
      // Знаходимо кнопку парсингу і емулюємо клік
      const parseBtn = document.getElementById('parseBtn');
      if (parseBtn && !parserUIState.isParsingInProgress) {
        parseBtn.click();
      }
    }
  });
}

/**
 * Ініціалізація поля для ключового слова
 * @param {HTMLElement} useKeywordChk - Чекбокс для активації поля
 * @param {HTMLElement} keywordInput - Поле введення ключового слова
 */
function initKeywordField(useKeywordChk, keywordInput) {
  // Встановлюємо початковий стан
  parserUIState.keywordEnabled = useKeywordChk.checked;
  keywordInput.style.display = parserUIState.keywordEnabled ? 'block' : 'none';
  
  // Додаємо обробник зміни
  useKeywordChk.addEventListener('change', () => {
    parserUIState.keywordEnabled = useKeywordChk.checked;
    
    if (parserUIState.keywordEnabled) {
      // Показуємо поле для введення ключового слова
      keywordInput.style.display = 'block';
      keywordInput.focus(); // Встановлюємо фокус на полі введення
      
      // Плавна анімація появи
      keywordInput.style.opacity = '0';
      setTimeout(() => {
        keywordInput.style.opacity = '1';
      }, 10);
    } else {
      // Плавна анімація зникнення
      keywordInput.style.opacity = '0';
      setTimeout(() => {
        keywordInput.style.display = 'none';
        keywordInput.value = '';
      }, 300);
    }
  });

  // Додаємо обробник для клавіші Enter в полі ключового слова
  keywordInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !parserUIState.isParsingInProgress) {
      e.preventDefault();
      // Знаходимо кнопку парсингу і емулюємо клік
      const parseBtn = document.getElementById('parseBtn');
      if (parseBtn) {
        parseBtn.click();
      }
    }
  });
}

/**
 * Ініціалізація кнопки парсингу з ефектами та індикаторами стану
 * @param {HTMLElement} parseBtn - Кнопка парсингу
 */
function initParseButton(parseBtn) {
  // Додаємо ефект натискання на кнопку
  parseBtn.addEventListener('mousedown', () => {
    parseBtn.classList.add('active');
  });
  
  parseBtn.addEventListener('mouseup', () => {
    parseBtn.classList.remove('active');
  });
  
  parseBtn.addEventListener('mouseleave', () => {
    parseBtn.classList.remove('active');
  });

  // Оригінальний обробник кліку зберігаємо
  const originalClickHandler = parseBtn.onclick;
  
  // Встановлюємо новий обробник з індикацією завантаження
  parseBtn.onclick = (e) => {
    if (parserUIState.isParsingInProgress) {
      return; // Запобігаємо повторним кліком під час парсингу
    }
    
    // Отримуємо текст з текстового поля
    const chatInput = document.getElementById('chatInput');
    if (chatInput && !chatInput.value.trim() && !parserUIState.fileSelected) {
      showNotification('Вставте текст чату або завантажте файл!', 'warning');
      return;
    }
    
    // Показуємо індикатор завантаження
    parserUIState.isParsingInProgress = true;
    
    // Змінюємо вигляд кнопки
    const btnText = parseBtn.querySelector('span:not(.material-icons)');
    const btnIcon = parseBtn.querySelector('.material-icons');
    
    if (btnText) btnText.textContent = 'Обробка...';
    if (btnIcon) btnIcon.textContent = 'hourglass_empty';
    
    parseBtn.classList.add('parsing');
    
    // Викликаємо оригінальний обробник
    if (typeof originalClickHandler === 'function') {
      originalClickHandler.call(parseBtn, e);
    }
    
    // Через деякий час відновлюємо стан кнопки
    setTimeout(() => {
      parserUIState.isParsingInProgress = false;
      
      if (btnText) btnText.textContent = 'Парсити';
      if (btnIcon) btnIcon.textContent = 'search';
      
      parseBtn.classList.remove('parsing');
    }, 1000); // Затримка для візуального ефекту
  };
}

/**
 * Ініціалізація додаткових ефектів для полів вводу
 */
function initInputEffects() {
  // Додаємо анімацію фокусу для всіх полів введення
  const inputs = document.querySelectorAll('textarea, input[type="text"]');
  
  inputs.forEach(input => {
    // Додаємо обробник фокусу
    input.addEventListener('focus', () => {
      input.classList.add('input-focused');
    });
    
    // Додаємо обробник втрати фокусу
    input.addEventListener('blur', () => {
      input.classList.remove('input-focused');
    });
  });
}

/**
 * Оновлення стану відображення статусу бази даних
 * @param {HTMLElement} statusElement - Елемент статусу
 * @param {number} entriesCount - Кількість записів у базі
 */
export function updateDbStatusDisplay(statusElement, entriesCount) {
  if (!statusElement) return;
  
  if (entriesCount > 0) {
    statusElement.innerHTML = `
      <span class="status-indicator loaded"></span>
      База завантажена: ${entriesCount} записів
    `;
    statusElement.classList.add('loaded');
  } else {
    statusElement.innerHTML = `
      <span class="status-indicator"></span>
      База не завантажена
    `;
    statusElement.classList.remove('loaded');
  }
}

// Експортуємо стан інтерфейсу для інших модулів
export { parserUIState };
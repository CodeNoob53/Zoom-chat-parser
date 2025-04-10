/**
 * Утиліти для ефективного оновлення DOM
 */

/**
 * Створює DocumentFragment для пакетного оновлення DOM
 * @returns {DocumentFragment} Новий фрагмент документа
 */
export function createFragment() {
    return document.createDocumentFragment();
  }
  
  /**
   * Порівнює два HTML елементи і оновлює лише змінені атрибути та вміст
   * @param {HTMLElement} oldElement - Поточний елемент DOM
   * @param {HTMLElement} newElement - Новий елемент, який буде використовуватися як шаблон
   * @returns {HTMLElement} Оновлений елемент
   */
  export function updateElement(oldElement, newElement) {
    if (!oldElement || !newElement) return oldElement;
    
    // Якщо типи елементів різні, просто замінюємо
    if (oldElement.nodeName !== newElement.nodeName) {
      oldElement.replaceWith(newElement.cloneNode(true));
      return newElement;
    }
    
    // Оновлюємо атрибути
    const oldAttributes = oldElement.attributes;
    const newAttributes = newElement.attributes;
    
    // Видаляємо атрибути, яких немає в новому елементі
    for (let i = oldAttributes.length - 1; i >= 0; i--) {
      const attrName = oldAttributes[i].name;
      if (!newElement.hasAttribute(attrName)) {
        oldElement.removeAttribute(attrName);
      }
    }
    
    // Додаємо або оновлюємо атрибути з нового елемента
    for (let i = 0; i < newAttributes.length; i++) {
      const attr = newAttributes[i];
      if (oldElement.getAttribute(attr.name) !== attr.value) {
        oldElement.setAttribute(attr.name, attr.value);
      }
    }
    
    // Якщо елементи текстові, оновлюємо текст
    if (newElement.nodeType === Node.TEXT_NODE ||
        (newElement.childNodes.length === 0 && oldElement.childNodes.length === 0)) {
      if (oldElement.textContent !== newElement.textContent) {
        oldElement.textContent = newElement.textContent;
      }
      return oldElement;
    }
    
    // Оновлюємо дочірні елементи
    updateChildren(oldElement, newElement);
    
    return oldElement;
  }
  
  /**
   * Оновлює дочірні елементи, уникаючи зайвих перерендерувань
   * @param {HTMLElement} parent - Батьківський елемент
   * @param {HTMLElement} newParent - Новий батьківський елемент, який служить шаблоном
   */
  function updateChildren(parent, newParent) {
    // Створюємо карти дочірніх елементів для ефективного пошуку
    const oldChildrenMap = new Map();
    const oldKeys = [];
    
    // Ідентифікуємо існуючі елементи по ключах (id або індексу в батьку)
    Array.from(parent.childNodes).forEach((child, i) => {
      const key = child.id || `index_${i}`;
      oldChildrenMap.set(key, child);
      oldKeys.push(key);
    });
    
    // Створюємо нові елементи або оновлюємо існуючі
    const newChildrenArray = Array.from(newParent.childNodes);
    
    // Порівнюємо старі і нові елементи
    const fragment = createFragment();
    
    newChildrenArray.forEach((newChild, i) => {
      // Визначаємо ключ для нового елемента
      const newKey = newChild.id || `index_${i}`;
      
      // Шукаємо відповідний старий елемент
      const oldChild = oldChildrenMap.get(newKey);
      
      if (oldChild) {
        // Оновлюємо існуючий елемент
        updateElement(oldChild, newChild);
        oldChildrenMap.delete(newKey); // Видаляємо з карти, щоб відстежувати використані
        fragment.appendChild(oldChild);
      } else {
        // Створюємо новий елемент
        fragment.appendChild(newChild.cloneNode(true));
      }
    });
    
    // Очищаємо батьківський елемент і додаємо оновлені/нові елементи
    parent.innerHTML = '';
    parent.appendChild(fragment);
  }
  
  /**
   * Створює елемент таблиці з даними
   * @param {string} tagName - Тег елемента
   * @param {Object} attributes - Об'єкт з атрибутами
   * @param {string|HTMLElement|Array} content - Вміст елемента
   * @returns {HTMLElement} Створений елемент
   */
  export function createElement(tagName, attributes = {}, content = null) {
    const element = document.createElement(tagName);
    
    // Встановлюємо атрибути
    Object.entries(attributes).forEach(([key, value]) => {
      if (key === 'className') {
        element.className = value;
      } else if (key === 'style' && typeof value === 'object') {
        Object.entries(value).forEach(([prop, val]) => {
          element.style[prop] = val;
        });
      } else if (key.startsWith('on') && typeof value === 'function') {
        const eventName = key.substring(2).toLowerCase();
        element.addEventListener(eventName, value);
      } else {
        element.setAttribute(key, value);
      }
    });
    
    // Додаємо вміст
    if (content !== null) {
      if (Array.isArray(content)) {
        content.forEach(item => {
          if (item instanceof Node) {
            element.appendChild(item);
          } else {
            element.appendChild(document.createTextNode(String(item)));
          }
        });
      } else if (content instanceof Node) {
        element.appendChild(content);
      } else {
        element.textContent = String(content);
      }
    }
    
    return element;
  }
  
  /**
   * Оновлює таблицю даних ефективно, уникаючи повного перемалювання
   * @param {HTMLElement} tableBody - Елемент tbody таблиці
   * @param {Array} data - Масив даних для відображення
   * @param {Function} rowRenderer - Функція для створення рядка таблиці
   * @param {string} idField - Назва поля, що використовується як унікальний ідентифікатор
   */
  export function updateTable(tableBody, data, rowRenderer, idField = 'id') {
    if (!tableBody || !data || !Array.isArray(data) || !rowRenderer) return;
    
    // Створюємо фрагмент для всіх нових рядків
    const fragment = createFragment();
    
    // Карта існуючих рядків
    const existingRows = new Map();
    
    // Індексуємо існуючі рядки
    Array.from(tableBody.children).forEach(row => {
      const rowId = row.dataset.id || row.getAttribute('data-id');
      if (rowId) {
        existingRows.set(rowId, row);
      }
    });
    
    // Оновлюємо або створюємо рядки
    data.forEach(item => {
      const itemId = String(item[idField] || '');
      
      // Створюємо новий рядок за допомогою функції рендерингу
      const newRow = rowRenderer(item);
      
      // Встановлюємо атрибут id для майбутніх оновлень
      if (itemId) {
        newRow.setAttribute('data-id', itemId);
      }
      
      // Перевіряємо, чи існує такий рядок
      if (itemId && existingRows.has(itemId)) {
        // Оновлюємо існуючий рядок
        const existingRow = existingRows.get(itemId);
        updateElement(existingRow, newRow);
        
        // Додаємо до фрагмента
        fragment.appendChild(existingRow);
        
        // Видаляємо з карти
        existingRows.delete(itemId);
      } else {
        // Додаємо новий рядок
        fragment.appendChild(newRow);
      }
    });
    
    // Очищаємо таблицю і додаємо фрагмент
    tableBody.innerHTML = '';
    tableBody.appendChild(fragment);
  }
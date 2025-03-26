/**
 * Покращена транслітерація кирилиці в латиницю з урахуванням різних варіантів
 * @param {string} text - Текст для транслітерації
 * @returns {string} Транслітерований текст
 */
export function transliterateToLatin(text) {
    if (!text) return '';
    
    // Основна таблиця транслітерації (український стандарт)
    const ukrainianToLatin = {
      'а': 'a', 'б': 'b', 'в': 'v', 'г': 'h', 'ґ': 'g', 'д': 'd', 'е': 'e', 'є': 'ye', 
      'ж': 'zh', 'з': 'z', 'и': 'y', 'і': 'i', 'ї': 'yi', 'й': 'y', 'к': 'k', 'л': 'l', 
      'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 
      'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch', 'ь': '', 
      'ю': 'yu', 'я': 'ya',
      // Великі літери
      'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'H', 'Ґ': 'G', 'Д': 'D', 'Е': 'E', 'Є': 'Ye', 
      'Ж': 'Zh', 'З': 'Z', 'И': 'Y', 'І': 'I', 'Ї': 'Yi', 'Й': 'Y', 'К': 'K', 'Л': 'L', 
      'М': 'M', 'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U', 
      'Ф': 'F', 'Х': 'Kh', 'Ц': 'Ts', 'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Shch', 'Ь': '', 
      'Ю': 'Yu', 'Я': 'Ya'
    };
    
    // Альтернативні варіанти транслітерації для гнучкого пошуку
    const alternatives = {
      'г': ['g', 'h'],    // Може бути 'g' або 'h'
      'Г': ['G', 'H'],
      'и': ['y', 'i', 'i'],   // Може бути 'y' або 'i' або 'i'
      'И': ['Y', 'I', 'I'],
      'і': ['i', 'y', 'i'],   // Може бути 'i' або 'y'
      'І': ['I', 'Y', 'I'],
      'е': ['e', 'ie'],   // Може бути 'e' або 'ie'
      'Е': ['E', 'Ie'],
      'є': ['ye', 'ie', 'je'],
      'Є': ['Ye', 'Ie', 'Je'],
      'ж': ['zh', 'j'],
      'Ж': ['Zh', 'J'],
      'х': ['kh', 'h', 'x'],
      'Х': ['Kh', 'H', 'X'],
      'ц': ['ts', 'c'],
      'Ц': ['Ts', 'C'],
      'ч': ['ch', 'tch'],
      'Ч': ['Ch', 'Tch'],
      'ш': ['sh', 'ch'],
      'Ш': ['Sh', 'Ch'],
      'щ': ['shch', 'sh', 'sch'],
      'Щ': ['Shch', 'Sh', 'Sch'],
      'ю': ['yu', 'iu', 'ju'],
      'Ю': ['Yu', 'Iu', 'Ju'],
      'я': ['ya', 'ia', 'ja'],
      'Я': ['Ya', 'Ia', 'Ja'],
      'й': ['y', 'i', 'j', 'yi'],
      'Й': ['Y', 'I', 'J', 'Yi']
    };
    
    // Результати транслітерації
    let results = ['']; // Початковий пустий рядок
    
    // Транслітеруємо символ за символом
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      let variants = [];
      
      if (ukrainianToLatin[char]) {
        // Основний варіант
        variants.push(ukrainianToLatin[char]);
        
        // Альтернативні варіанти, якщо є
        if (alternatives[char]) {
          variants = variants.concat(alternatives[char]);
        }
      } else {
        // Якщо символ не знайдено в таблиці, просто додаємо його як є
        variants.push(char);
      }
      
      // Створюємо нові варіанти для кожного символу
      const newResults = [];
      for (const result of results) {
        for (const variant of variants) {
          newResults.push(result + variant);
        }
      }
      
      // Оновлюємо результати, але обмежуємо кількість варіантів до 5, щоб уникнути експоненціального зростання
      results = newResults.slice(0, 5);
    }
    
    // Повертаємо найкращий варіант (перший)
    return results[0];
  }
  
  /**
   * Транслітерація латиниці в кирилицю з урахуванням різних варіантів
   * @param {string} text - Текст для транслітерації
   * @returns {string} Транслітерований текст
   */
  export function transliterateToCyrillic(text) {
    if (!text) return '';
    
    // Таблиця транслітерації латиниці в кирилицю
    const latinToCyrillicMap = {
      'a': 'а', 'b': 'б', 'v': 'в', 'h': 'г', 'g': 'ґ', 'd': 'д', 'e': 'е',
      'ye': 'є', 'ie': 'є', 'je': 'є', 'zh': 'ж', 'j': 'ж', 'z': 'з', 'y': 'и', 'i': 'і', 
      'yi': 'ї', 'k': 'к', 'l': 'л', 'm': 'м', 'n': 'н', 'o': 'о', 'p': 'п', 
      'r': 'р', 's': 'с', 't': 'т', 'u': 'у', 'f': 'ф', 'kh': 'х', 'x': 'х',
      'ts': 'ц', 'c': 'ц', 'ch': 'ч', 'sh': 'ш', 'shch': 'щ', 'sch': 'щ',
      'yu': 'ю', 'iu': 'ю', 'ju': 'ю', 'ya': 'я', 'ia': 'я', 'ja': 'я',
      // Великі літери
      'A': 'А', 'B': 'Б', 'V': 'В', 'H': 'Г', 'G': 'Ґ', 'D': 'Д', 'E': 'Е',
      'Ye': 'Є', 'Ie': 'Є', 'Je': 'Є', 'Zh': 'Ж', 'J': 'Ж', 'Z': 'З', 'Y': 'И', 'I': 'І', 
      'Yi': 'Ї', 'K': 'К', 'L': 'Л', 'M': 'М', 'N': 'Н', 'O': 'О', 'P': 'П', 
      'R': 'Р', 'S': 'С', 'T': 'Т', 'U': 'У', 'F': 'Ф', 'Kh': 'Х', 'X': 'Х',
      'Ts': 'Ц', 'C': 'Ц', 'Ch': 'Ч', 'Sh': 'Ш', 'Shch': 'Щ', 'Sch': 'Щ',
      'Yu': 'Ю', 'Iu': 'Ю', 'Ju': 'Ю', 'Ya': 'Я', 'Ia': 'Я', 'Ja': 'Я'
    };
    
    // Патерни для багатобуквених комбінацій (сортуємо за довжиною, щоб спочатку замінювати довші)
    const patterns = [
      'Shch', 'shch', 'Sch', 'sch', 'Tch', 'tch', 'Zh', 'zh', 'Ch', 'ch', 
      'Kh', 'kh', 'Sh', 'sh', 'Ts', 'ts', 'Ya', 'ya', 'Ye', 'ye', 'Yu', 'yu', 
      'Yi', 'yi', 'Ia', 'ia', 'Ie', 'ie', 'Iu', 'iu', 'Ja', 'ja', 'Je', 'je', 'Ju', 'ju'
    ].sort((a, b) => b.length - a.length);
    
    // Попередньо транслітеруємо багатобуквені комбінації
    let result = text;
    for (const pattern of patterns) {
      if (latinToCyrillicMap[pattern]) {
        const regex = new RegExp(pattern, 'g');
        result = result.replace(regex, `#${pattern}#`);
      }
    }
    
    // Замінюємо позначки на відповідні кириличні символи
    for (const pattern of patterns) {
      if (latinToCyrillicMap[pattern]) {
        const regex = new RegExp(`#${pattern}#`, 'g');
        result = result.replace(regex, latinToCyrillicMap[pattern]);
      }
    }
    
    // Транслітеруємо інші символи
    for (let i = 0; i < result.length; i++) {
      const char = result[i];
      if (latinToCyrillicMap[char]) {
        result = result.slice(0, i) + latinToCyrillicMap[char] + result.slice(i + 1);
      }
    }
    
    // Додаткові корекції для окремих випадків
    const corrections = [
      // Виправлення для послідовностей, які могли бути неправильно транслітеровані
      { from: 'йа', to: 'я' },
      { from: 'йе', to: 'є' },
      { from: 'йу', to: 'ю' },
      { from: 'йі', to: 'ї' },
      { from: 'зг', to: 'зґ' }, // "zgh" часто використовується для передачі "зг"
      // Додаткові корекції для великих літер
      { from: 'Йа', to: 'Я' },
      { from: 'Йе', to: 'Є' },
      { from: 'Йу', to: 'Ю' },
      { from: 'Йі', to: 'Ї' },
      { from: 'Зг', to: 'Зґ' }
    ];
    
    for (const correction of corrections) {
      result = result.replace(new RegExp(correction.from, 'g'), correction.to);
    }
    
    return result;
  }
  
  /**
   * Генерує множинні варіанти транслітерації для підвищення ймовірності співпадіння
   * @param {string} text - Текст для транслітерації
   * @returns {string[]} Масив варіантів транслітерації
   */
  export function generateTransliterationVariants(text) {
    if (!text) return [];
    
    // Список результатів
    const results = [];
    
    // Основний варіант транслітерації
    results.push(transliterateToLatin(text));
    
    // Додаткові варіанти для окремих літер
    const alternativeChars = {
      'г': ['g', 'h'],
      'и': ['y', 'i'],
      'і': ['i', 'y', 'yi'],
      'е': ['e', 'ie'],
      'є': ['ye', 'ie', 'je'],
      'ж': ['zh', 'j'],
      'х': ['kh', 'h', 'x'],
      'ц': ['ts', 'c'],
      'ч': ['ch', 'tch'],
      'ш': ['sh'],
      'щ': ['shch', 'sch'],
      'ю': ['yu', 'iu', 'ju'],
      'я': ['ya', 'ia', 'ja']
    };
    
    // Для кожної літери в тексті генеруємо альтернативні варіанти
    for (let i = 0; i < text.length; i++) {
      const char = text[i].toLowerCase();
      if (alternativeChars[char]) {
        for (const altChar of alternativeChars[char]) {
          // Створюємо новий варіант тексту з альтернативною літерою
          const variant = text.slice(0, i) + altChar + text.slice(i + 1);
          const transliteratedVariant = transliterateToLatin(variant);
          if (!results.includes(transliteratedVariant)) {
            results.push(transliteratedVariant);
          }
        }
      }
    }
    
    // Обмежуємо кількість варіантів до розумної кількості
    return results.slice(0, 10);
  }
  
  /**
   * Перевіряє можливі варіанти написання імені з урахуванням транслітерації
   * @param {string} name1 - Перше ім'я для порівняння
   * @param {string} name2 - Друге ім'я для порівняння
   * @param {number} threshold - Поріг схожості (від 0 до 1, де 1 - повний збіг)
   * @returns {boolean} Чи є імена схожими з урахуванням транслітерації
   */
  export function areNamesTransliteratedMatches(name1, name2, threshold = 0.8) {
    if (!name1 || !name2) return false;
    
    // Приводимо до нижнього регістру
    const n1Lower = name1.toLowerCase();
    const n2Lower = name2.toLowerCase();
    
    // Перевіряємо точне співпадіння
    if (n1Lower === n2Lower) return true;
    
    // Визначаємо, чи містять імена кирилицю
    const n1HasCyrillic = /[а-яА-ЯіІїЇєЄґҐ]/.test(name1);
    const n2HasCyrillic = /[а-яА-ЯіІїЇєЄґҐ]/.test(name2);
    
    // Якщо обидва імені на одній писемності, порівнюємо безпосередньо
    if (n1HasCyrillic === n2HasCyrillic) {
      return areStringSimilar(n1Lower, n2Lower, threshold);
    }
    
    // Якщо різні писемності, транслітеруємо
    if (n1HasCyrillic && !n2HasCyrillic) {
      // Транслітеруємо перше ім'я в латиницю
      const variants = generateTransliterationVariants(name1);
      for (const variant of variants) {
        if (areStringSimilar(variant.toLowerCase(), n2Lower, threshold)) {
          return true;
        }
      }
      return false;
    }
    
    if (!n1HasCyrillic && n2HasCyrillic) {
      // Транслітеруємо друге ім'я в латиницю
      const variants = generateTransliterationVariants(name2);
      for (const variant of variants) {
        if (areStringSimilar(n1Lower, variant.toLowerCase(), threshold)) {
          return true;
        }
      }
      return false;
    }
    
    return false;
  }
  
  /**
   * Перевіряє схожість рядків за алгоритмом Левенштейна
   * @param {string} str1 - Перший рядок
   * @param {string} str2 - Другий рядок
   * @param {number} threshold - Поріг схожості (від 0 до 1)
   * @returns {boolean} Чи є рядки достатньо схожими
   */
  function areStringSimilar(str1, str2, threshold = 0.8) {
    // Функція для обчислення відстані Левенштейна
    function levenshteinDistance(a, b) {
      if (a.length === 0) return b.length;
      if (b.length === 0) return a.length;
      
      const matrix = [];
      
      // Ініціалізація матриці
      for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
      }
      
      for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
      }
      
      // Заповнення матриці
      for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
          const cost = a[j - 1] === b[i - 1] ? 0 : 1;
          matrix[i][j] = Math.min(
            matrix[i - 1][j] + 1,      // видалення
            matrix[i][j - 1] + 1,      // вставка
            matrix[i - 1][j - 1] + cost // заміна
          );
        }
      }
      
      return matrix[b.length][a.length];
    }
    
    const distance = levenshteinDistance(str1, str2);
    const maxLength = Math.max(str1.length, str2.length);
    const similarity = 1 - (distance / maxLength);
    
    return similarity >= threshold;
  }
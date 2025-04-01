import { 
    transliterateToLatin,
    transliterateToCyrillic,
    areNamesTransliteratedMatches
  } from './transliteration.js'
  import { areStringSimilar, getSimilarity } from './name-utils.js'
  
  /**
   * Перевірка, чи існує кілька можливих співпадінь для імені
   * @param {string} name - Ім'я для перевірки (нікнейм)
   * @param {Object} nameDatabase - База імен для перевірки
   * @returns {Array} Масив знайдених співпадінь з бази даних
   */
  export function findAllPossibleMatches(name, nameDatabase) {
    const possibleMatches = []
  
    // Якщо ім'я порожнє, повертаємо пустий масив
    if (!name || name.trim() === '') return possibleMatches
  
    // Переводимо ім'я в нижній регістр для пошуку
    const nameLower = name.toLowerCase()
  
    // Отримуємо можливі кириличні варіанти імені
    let cyrillicVariants = []
  
    // Якщо ім'я містить латиницю
    if (/[a-zA-Z]/.test(name)) {
      // Отримуємо основний кириличний варіант
      const mainCyrillicVariant = transliterateToCyrillic(name)
      if (mainCyrillicVariant) {
        cyrillicVariants.push(mainCyrillicVariant.toLowerCase())
  
        // Додаємо варіації для спільних імен
        if (
          nameLower === 'serhiy' ||
          nameLower === 'sergiy' ||
          nameLower === 'serge' ||
          nameLower === 'sergey'
        ) {
          cyrillicVariants.push('сергій')
          cyrillicVariants.push('сергей')
        } else if (nameLower === 'taras') {
          cyrillicVariants.push('тарас')
        } else if (
          nameLower === 'oleksandr' ||
          nameLower === 'alexander' ||
          nameLower === 'alex'
        ) {
          cyrillicVariants.push('олександр')
          cyrillicVariants.push('александр')
        }
      }
    } else {
      // Якщо ім'я вже написане кирилицею, використовуємо його як є
      cyrillicVariants.push(nameLower)
    }
  
    // Перебираємо всі імена в базі даних
    for (const dbName in nameDatabase) {
      const dbNameLower = dbName.toLowerCase()
      const dbNameParts = dbNameLower.split(' ')
  
      // Перевіряємо, чи є співпадіння з кириличними варіантами
      for (const cyrillicVariant of cyrillicVariants) {
        // Перевіряємо, чи це ім'я або прізвище
        if (
          dbNameParts.includes(cyrillicVariant) ||
          (dbNameParts.length > 0 &&
            areStringSimilar(dbNameParts[0], cyrillicVariant, 0.85)) ||
          (dbNameParts.length > 1 &&
            areStringSimilar(dbNameParts[1], cyrillicVariant, 0.85))
        ) {
          // Додаємо знайдене співпадіння
          possibleMatches.push({
            dbName: dbName,
            id: nameDatabase[dbName],
            part: dbNameParts.includes(cyrillicVariant)
              ? dbNameParts.indexOf(cyrillicVariant) === 0
                ? 'surname'
                : 'firstname'
              : areStringSimilar(dbNameParts[0], cyrillicVariant, 0.85)
              ? 'surname'
              : 'firstname'
          })
        }
      }
    }
  
    return possibleMatches
  }
  
  /**
   * Перевірка, чи співпадає однослівний нікнейм з кількома записами в базі
   * @param {string} name - Ім'я для перевірки (нікнейм)
   * @param {Object} nameDatabase - База імен для перевірки
   * @returns {boolean} true, якщо є кілька можливих співпадінь
   */
  export function hasAmbiguousNameMatch(name, nameDatabase) {
    // Якщо ім'я містить пробіли, це не однослівний нікнейм
    if (name.includes(' ')) return false
  
    // Знаходимо всі можливі співпадіння
    const matches = findAllPossibleMatches(name, nameDatabase)
  
    // Якщо знайдено більше одного співпадіння, вважаємо ім'я неоднозначним
    return matches.length > 1
  }
  
  /**
   * Спроба автоматично знайти найкращі співпадіння для нерозпізнаних імен
   * використовуючи загальну схожість
   * @param {Object} matchedNames - Об'єкт з інформацією про вже знайдені співпадіння
   * @param {Set} unrecognizedNames - Множина нерозпізнаних імен
   * @param {Object} nameDatabase - База імен для пошуку співпадінь
   */
  export function tryAutoMatchUnrecognized(matchedNames, unrecognizedNames, nameDatabase) {
    // Якщо нема нерозпізнаних імен або бази імен, виходимо
    if (unrecognizedNames.size === 0 || Object.keys(nameDatabase).length === 0) {
      return
    }
  
    // Обробляємо кожне нерозпізнане ім'я
    unrecognizedNames.forEach(unrecognizedName => {
      // Можливі імена в базі, які ще не були використані
      const potentialDbMatches = []
  
      // Збираємо всі використані ID з matchedNames
      const usedIds = new Set()
      Object.values(matchedNames).forEach(id => {
        if (id !== 'not-in-db') {
          usedIds.add(id)
        }
      })
  
      // Шукаємо найкращі співпадіння в базі за схожістю
      for (const [dbName, dbId] of Object.entries(nameDatabase)) {
        // Пропускаємо вже використані ID
        if (usedIds.has(dbId)) {
          continue
        }
  
        // Використовуємо повний аналіз схожості
        let similarity = 0
  
        // Спочатку спробуємо транслітерацію
        const translit1 = transliterateToLatin(unrecognizedName)
        const translit2 = transliterateToLatin(dbName)
  
        // Оцінюємо схожість на основі різних варіантів транслітерації
        const sim1 = getSimilarity(unrecognizedName, dbName)
        const sim2 = getSimilarity(translit1, translit2)
  
        // Беремо найкращу схожість
        similarity = Math.max(sim1, sim2)
  
        // Додаємо до потенційних співпадінь, якщо схожість вище порогу
        if (similarity > 0.5) {
          potentialDbMatches.push({
            dbName,
            id: dbId,
            similarity,
            matchType: 'auto-fuzzy-match'
          })
        }
      }
  
      // Сортуємо потенційні співпадіння за схожістю
      potentialDbMatches.sort((a, b) => b.similarity - a.similarity)
  
      // Якщо є хороші співпадіння, використовуємо найкраще
      if (
        potentialDbMatches.length > 0 &&
        potentialDbMatches[0].similarity > 0.7
      ) {
        const bestMatch = potentialDbMatches[0]
        matchedNames[unrecognizedName] = bestMatch.id
        matchedNames[unrecognizedName + '_matchInfo'] = {
          matchType: 'auto-match',
          quality: Math.round(bestMatch.similarity * 100),
          dbName: bestMatch.dbName,
          allMatches: potentialDbMatches.slice(0, 3),
          autoMatched: true
        }
  
        // Видаляємо з нерозпізнаних
        unrecognizedNames.delete(unrecognizedName)
      }
    })
  }
  
  /**
   * Знайти найкращі співпадіння для імені
   * @param {string} name - Ім'я для пошуку
   * @param {number} limit - Максимальна кількість співпадінь
   * @param {Object} nameDatabase - База імен для пошуку
   * @param {Object} matchedNames - Співпадіння, що вже знайдені
   * @returns {Array} Масив об'єктів з інформацією про співпадіння
   */
  export function findBestMatches(name, limit = 3, nameDatabase = {}, matchedNames = {}) {
    const matches = []
  
    // Збираємо всі використані ID з matchedNames
    const usedIds = new Set()
    Object.values(matchedNames).forEach(id => {
      if (id !== 'not-in-db') {
        usedIds.add(id)
      }
    })
  
    // Обчислюємо різні варіанти транслітерації для імені
    const nameVariants = [
      name,
      transliterateToLatin(name),
      transliterateToCyrillic(name)
    ]
  
    // Перебираємо всі імена в базі
    for (const [dbName, dbId] of Object.entries(nameDatabase)) {
      // Пропускаємо вже використані ID
      if (usedIds.has(dbId)) {
        continue
      }
  
      // Обчислюємо варіанти транслітерації для імені з бази
      const dbNameVariants = [
        dbName,
        transliterateToLatin(dbName),
        transliterateToCyrillic(dbName)
      ]
  
      // Обчислюємо найкращу схожість між всіма варіантами
      let bestSimilarity = 0
  
      for (const nameVar of nameVariants) {
        for (const dbNameVar of dbNameVariants) {
          const similarity = getSimilarity(nameVar, dbNameVar)
          if (similarity > bestSimilarity) {
            bestSimilarity = similarity
          }
        }
      }
  
      // Якщо схожість вище порогу, додаємо до списку співпадінь
      if (bestSimilarity > 0.5) {
        matches.push({
          id: dbId,
          dbName,
          similarity: bestSimilarity
        })
      }
    }
  
    // Сортуємо за схожістю і обмежуємо кількість
    return matches.sort((a, b) => b.similarity - a.similarity).slice(0, limit)
  }
  
/**
 * Отримати рекомендації для нерозпізнаних імен
 * @param {Array|Set} unrecognizedNames - Список нерозпізнаних імен
 * @param {Object} nameDatabase - База імен
 * @param {Object} matchedNames - Співпадіння, що вже знайдені
 * @returns {Object} Об'єкт з рекомендаціями у форматі {name: [{id, dbName, similarity}, ...], ...}
 */
export function getRecommendations(unrecognizedNames = [], nameDatabase = {}, matchedNames = {}) {
    const recommendations = {};
    
    // Переконаємося, що працюємо з масивом
    const namesArray = Array.isArray(unrecognizedNames) 
      ? unrecognizedNames 
      : [...unrecognizedNames];
  
    // Для кожного нерозпізнаного імені шукаємо рекомендації
    namesArray.forEach(name => {
      // Отримуємо інформацію про співпадіння
      const matchInfo = matchedNames[name + '_matchInfo'] || {};
      
      // Якщо це неоднозначне ім'я (ambiguous-name), використовуємо вже знайдені варіанти
      if (matchInfo.matchType === 'ambiguous-name' && matchInfo.allMatches) {
        // Конвертуємо allMatches у формат рекомендацій
        recommendations[name] = matchInfo.allMatches.map(match => ({
          id: match.id,
          dbName: match.dbName,
          similarity: match.quality ? match.quality / 100 : 0.7
        }));
      } else {
        // Інакше шукаємо найкращі співпадіння
        recommendations[name] = findBestMatches(name, 3, nameDatabase, matchedNames);
      }
    });
  
    return recommendations;
  }
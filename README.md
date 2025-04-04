# Парсер чату Zoom

Веб‑додаток для парсингу чату Zoom і автоматичного порівняння учасників з базою імен.

## Призначення

Додаток створений здебільшого для викладачів, щоб швидко зробити перекличку за допомогою чату Zoom. Після парсингу чату можна автоматично співставити учасників з базою імен, перевірити присутність і зберегти результати.

## Основні можливості

1.  **Завантаження або вставка** тексту чату Zoom.
2.  **Парсинг унікальних імен** учасників, які лишали повідомлення.
3.  **Фільтрація** за ключовим словом у повідомленнях.
4.  **Порівняння з базою імен** для автоматичного визначення реальних імен та прізвищ.
5.  **Автоматична обробка** різних варіантів написання імен (транслітерація, зменшувальні форми).
6.  **Ручне призначення відповідності** для імен, які не вдалося автоматично співставити.
7.  **Сортування** списку за різними колонками.
8.  **Збереження** результатів у файл.
9.  **Зміна теми** (світла/темна).

## Режими роботи

Додаток підтримує два основні режими:

### 1. Базовий режим (без бази імен)

У цьому режимі просто парсяться і відображаються імена учасників із чату. Можна фільтрувати за ключовим словом та сортувати результати.

### 2. Розширений режим (з базою імен)

У цьому режимі додатково виконується автоматичне співставлення імен учасників із базою імен. Додаток намагається:

*   Знайти точні співпадіння
*   Обробити зменшувальні форми імен (Саша → Олександр)
*   Застосувати транслітерацію (Serhiy → Сергій)
*   Запропонувати варіанти для ручного вибору при неоднозначному співпадінні

## Формат чату

Додаток розрахований на стандартний формат чату Zoom:

```
HH:MM:SS From Ім'я Прізвище to Everyone: Текст повідомлення
```

## Особливості парсингу

1.  **Фільтрація відповідей**: Повідомлення з "Replying to..." обробляються і очищаються.
2.  **Видалення емоджі**: Окремі повідомлення з емоджі-реакціями видаляються.
3.  **Тег RNM**: Додаток розпізнає спеціальний тег `rnm:` в повідомленнях для призначення реального імені. Наприклад: `rnm: Іванов Іван`.

## Робота з базою імен

### Формат бази імен

База імен - це текстовий файл, де кожен рядок містить інформацію про одного учасника у форматі:

```
Прізвище Ім'я
```

Кожен запис має бути з нового рядка. ID присвоюється автоматично.

### Механізм порівняння з базою

Додаток використовує багаторівневу систему порівняння імен:

1.  **Точне співпадіння** - перший пріоритет
2.  **Співпадіння через RNM-тег** - пріоритетне співпадіння
3.  **Співпадіння за стандартним порядком** (Прізвище Ім'я)
4.  **Співпадіння за зворотним порядком** (Ім'я Прізвище)
5.  **Співпадіння через транслітерацію** з латиниці/російської на українську
6.  **Співпадіння через зменшувальні форми імен** (Саша → Олександр)
7.  **Нечітке співпадіння** за алгоритмом Левенштейна

### Візуальні індикатори

Додаток використовує різні індикатори для відображення типу співпадіння:

*   **Сірий фон** - учасник не знайдений в базі імен
*   **Фіолетовий індикатор (T)** - знайдено через транслітерацію
*   **Зелений індикатор (V)** - знайдено через зменшувальну форму імені
*   **Помаранчевий індикатор (A)** - автоматично призначена відповідність
*   **Стрілки (↔)** - знайдено в зворотному порядку (Ім'я Прізвище)
*   **Зелений текст імені та прізвища** - знайдено через тег RNM

## Як використовувати

1.  **Відкрийте** додаток за посиланням \[посилання на додаток].
2.  **Вставте** текст чату Zoom або **завантажте** `.txt` файл з чатом.
3.  Якщо потрібно, **увімкніть опцію** "За ключовим словом" і введіть ключове слово для фільтрації.
4.  Якщо потрібно порівняти з базою імен, **увімкніть опцію** "Порівняти з базою імен" і **завантажте** файл бази імен.
5.  Натисніть **"Парсити"**:
    *   У правій панелі з'явиться список знайдених імен.
    *   Якщо було увімкнено порівняння з базою, буде показано результати співпадінь.
6.  Для імен, які не були автоматично знайдені в базі, можна:
    *   **Вибрати** зі списку запропонованих варіантів, натиснувши на стрілку поруч з іменем.
    *   **Призначити вручну**, натиснувши кнопку "Призначити вручну" і вибравши відповідний запис з бази.
7.  **Сортуйте** список, натискаючи на заголовки колонок.
8.  Натисніть **"Зберегти список"**, щоб завантажити файл з результатами.

## Безпека

Додаток включає комплексну систему захисту від потенційних ін'єкцій шкідливого коду при завантаженні файлів:

### Заходи безпеки

1. **Перевірка вхідних файлів**:
   - Валідація типу файлу (дозволені лише текстові файли .txt)
   - Обмеження розміру файлів (5 МБ для чату, 2 МБ для бази імен)
   - Перевірка на наявність шкідливого коду (теги script, JavaScript протоколи)

2. **Санітизація контенту**:
   - Екранування HTML-тегів та спеціальних символів
   - Видалення потенційно небезпечних атрибутів
   - Перевірка та очищення імен користувачів та ID

3. **Захист від ін'єкцій**:
   - Блокування JavaScript URL (javascript:)
   - Виявлення та нейтралізація обробників подій (onclick, onload)
   - Захист від шкідливих функцій (eval, setTimeout, тощо)

4. **Обробка помилок**:
   - Інформативні повідомлення про помилки
   - Безпечна обробка некоректних даних
   - Логування проблем для відстеження

Система безпеки запобігає найпоширенішим видам атак, включаючи XSS-ін'єкції, виконання довільного JavaScript коду та маніпуляції з DOM. Це забезпечує надійний захист від зловмисних файлів, які можуть бути випадково або навмисно завантажені користувачами.

## Розробка

### Структура проєкту

Додаток побудований за модульною структурою з використанням JavaScript, HTML та CSS:

```
├── index.js              # Головний файл
├── index.html            # HTML структура
├── modules/
│   ├── main.js           # Основна логіка додатку
│   ├── dom.js            # Взаємодія з DOM
│   ├── parser.js         # Парсинг чату
│   ├── name-database.js  # Робота з базою імен
│   ├── name-matcher.js   # Алгоритми порівняння імен
│   ├── name-utils.js     # Утиліти для роботи з іменами
│   ├── name-variants.js  # Словник варіантів імен
│   ├── renderer.js       # Рендеринг результатів
│   ├── sorting.js        # Логіка сортування
│   ├── exporter.js       # Експорт результатів
│   ├── transliteration.js # Транслітерація
│   └── ...               # Інші допоміжні модулі
└── styles/
    ├── main.css          # Головний CSS файл
    ├── base/             # Базові стилі, скидання та загальні налаштування
    ├── components/       # Стилі для окремих компонентів інтерфейсу
    ├── layout/           # Стилі для розмітки сторінки
    ├── modules/          # Стилі для модулів
    └── themes/           # Теми оформлення
```

### Запуск локально

1.  Клонуйте репозиторій: `git clone [URL репозиторію]`
2.  Відкрийте `index.html` у вашому браузері (якщо ваша операційна система Windows). Або Live server чи подібні додатки.


### Залежності

*   Відсутні зовнішні залежності.

### Обмеження

*   Парсер розрахований на стандартний формат чату Zoom. Якщо він змінений, можуть знадобитися додаткові налаштування.
*   Поточна версія підтримує експорт тільки в `.txt` формат.
*   Для оптимального порівняння імен, рекомендується використовувати українську мову в базі імен.

## Майбутні покращення

*   Підтримка JSON, CSV та Excel форматів для бази імен та експорту.
*   Розширення словника зменшувальних форм імен.
*   Покращення алгоритмів нечіткого пошуку.
*   Можливість редагувати базу імен безпосередньо в додатку.

----------

**Автор**: [Code Noob](https://github.com/CodeNoob53)   
**Версія**: 2.1  
**Рік**: 2025

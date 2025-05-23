# Парсер чату Zoom

Веб-додаток для парсингу чату Zoom та автоматичного співставлення учасників з базою імен.

## Можливості

- **Обробка чату**
  - Завантаження або вставка тексту чату Zoom
  - Парсинг унікальних імен учасників
  - Фільтрація за ключовим словом
  - Експорт у різних форматах (TXT, CSV, JSON)

- **Співставлення імен**
  - Автоматичне співставлення з базою імен
  - Підтримка варіантів імен та транслітерації
  - Ручне призначення для неспівпадінь
  - Візуальні індикатори типів співпадінь

- **Управління базою даних**
  - Імпорт/експорт бази імен
  - Підтримка форматів TXT, CSV та JSON
  - Автоматичне призначення ID
  - Пошук та фільтрація

- **Інтерфейс користувача**
  - Підтримка світлої/темної теми
  - Сортування за колонками
  - Адаптивний дизайн
  - Інтуїтивне керування

## Встановлення

1. Клонуйте репозиторій:
```bash
git clone https://github.com/yourusername/zoom-chat-parser.git
```

2. Відкрийте `index.html` у браузері або використовуйте локальний сервер.

## Використання

### Базовий режим (без бази імен)

1. Відкрийте додаток
2. Вставте текст чату Zoom або завантажте файл
3. (Опціонально) Увімкніть фільтрацію за ключовим словом
4. Натисніть "Парсити" для обробки чату
5. Перегляньте список унікальних учасників
6. Експортуйте результати за потреби

### Розширений режим (з базою імен)

1. Увімкніть опцію "Порівняти з базою імен"
2. Завантажте файл бази імен
3. Обробіть чат як у базовому режимі
4. Перегляньте автоматичні співпадіння
5. Призначте вручну співпадіння для неспівпадінь
6. Експортуйте фінальні результати

## Формат бази імен

База імен повинна бути текстовим файлом з одним учасником на рядок:
```
Прізвище Ім'я
```

Кожному запису автоматично присвоюється ID.

## Функції безпеки

- Валідація вхідних файлів
- Санітизація контенту
- Захист від шкідливого коду
- Обмеження розміру (5МБ для чату, 2МБ для бази)
- Обробка помилок та логування

## Розробка

Для детальної технічної документації дивіться [DOCUMENTATION.uk.md](DOCUMENTATION.uk.md).

### Структура проекту

```
├── src/
│   ├── core/           # Базова функціональність
│   ├── features/       # Основні функції
│   ├── ui/            # Компоненти інтерфейсу
│   ├── utils/         # Утиліти
│   └── styles/        # CSS стилі
├── index.html         # Головний HTML файл
└── README.md         # Цей файл
```

### Залежності

Зовнішні залежності відсутні.

### Збірка

Проект використовує чистий JavaScript і не потребує етапу збірки. Просто відкрийте `index.html` у браузері або використовуйте локальний сервер.

## Внесення змін

1. Форкніть репозиторій
2. Створіть гілку для вашої функції (`git checkout -b feature/AmazingFeature`)
3. Зробіть коміт змін (`git commit -m 'Add some AmazingFeature'`)
4. Відправте зміни в гілку (`git push origin feature/AmazingFeature`)
5. Відкрийте Pull Request

## Ліцензія

Цей проект ліцензовано під MIT License - дивіться файл [LICENSE](LICENSE) для деталей.

## Автор

[Code Noob](https://github.com/CodeNoob53)

## Версія

2.1 (2025) 
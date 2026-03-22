# Tabrix

**Fast, AI-assisted spreadsheet for large datasets**
**Быстрая таблица с ИИ для работы с большими данными**

---

# 🇷🇺 Русская версия

## О проекте

**Tabrix** — это веб-приложение для работы с таблицами больших объёмов данных.
Проект создаётся как лёгкая и быстрая альтернатива Excel с поддержкой:

* больших таблиц
* серверной сортировки
* аналитики по диапазонам
* работы через LLM (ИИ)
* доступа к данным по координатам
* статистики по колонкам
* поиска строк по значению ячейки

Tabrix ориентирован на скорость, простоту и работу с big data без перегруженного интерфейса.

---

## Возможности

### Таблицы

* Загрузка CSV / Excel
* Просмотр постранично (100 строк)
* Переход к конкретной ячейке
* Ручное редактирование
* Удаление таблиц
* Большие файлы без зависаний

### Сортировка (кэшируется)

* Сортировка по возрастанию / убыванию
* Считается один раз
* Результат сохраняется в БД
* Повторные запросы мгновенные

### Аналитика

* Сумма
* Среднее
* Медиана
* Минимум / максимум
* Количество уникальных значений
* Дисперсия
* Стандартное отклонение

### LLM / ИИ

ИИ может:

* получить значение ячейки по координате
* найти строку по значению ячейки
* анализировать диапазон
* выполнять фильтрацию
* считать статистику
* отвечать на вопросы по таблице

Пример:

> найди все строки где A > 100
> покажи среднее по колонке C
> найди строку где id = 42

---

## Архитектура

```
Frontend (HTML + JS)
        │
        ▼
Flask backend (Python)
        │
        ├── SQLite (таблицы + кэш сортировки)
        │
        └── LLM (Ollama / DeepSeek)
```

---

## Установка

### 1. Клонирование

```
git clone https://github.com/yourrepo/tabrix
cd tabrix
```

### 2. Установка зависимостей

```
pip install flask pandas openpyxl requests
```

### 3. Запуск

```
python app.py
```

Открыть:

```
http://localhost:5000
```

---

## Поддержка LLM (Ollama)

Установить Ollama:

https://ollama.ai

Скачать модель:

```
ollama pull deepseek-r1:8b
```

Запустить:

```
ollama run deepseek-r1:8b
```

После этого ИИ автоматически подключится к Tabrix.

---

## База данных

Используется SQLite:

```
tabrix.db
```

Хранит:

* таблицы
* метаданные
* кэш сортировок
* статистику

---

## Почему Tabrix

* быстрее Excel на больших данных
* открытый код
* встроенный ИИ
* серверная обработка
* минималистичный интерфейс
* нет проприетарных ограничений

---

# 🇬🇧 English Version

## About

**Tabrix** is a fast web-based spreadsheet designed for large datasets.
It is built as a lightweight alternative to Excel with AI integration.

Tabrix focuses on:

* speed
* large data support
* server-side processing
* AI analytics
* clean UI

---

## Features

### Tables

* CSV / Excel upload
* Pagination (100 rows)
* Jump to cell
* Manual editing
* Delete tables
* Large dataset support

### Cached Sorting

* Ascending / descending
* Calculated once
* Stored in database
* Instant reuse

### Analytics

* Sum
* Average
* Median
* Min / Max
* Unique values
* Variance
* Standard deviation

### AI Assistant

The LLM can:

* read cell by coordinates
* find row by value
* filter ranges
* compute statistics
* analyze columns
* answer dataset questions

Example:

> find rows where A > 100
> average of column C
> find row where id = 42

---

## Architecture

```
Frontend (HTML + JS)
        │
        ▼
Flask backend (Python)
        │
        ├── SQLite (tables + sort cache)
        │
        └── LLM (Ollama / DeepSeek)
```

---

## Installation

### Clone

```
git clone https://github.com/yourrepo/tabrix
cd tabrix
```

### Install dependencies

```
pip install flask pandas openpyxl requests
```

### Run

```
python app.py
```

Open:

```
http://localhost:5000
```

---

## LLM Support (Ollama)

Install Ollama:

https://ollama.ai

Pull model:

```
ollama pull deepseek-r1:8b
```

Run:

```
ollama run deepseek-r1:8b
```

AI will automatically connect to Tabrix.

---

## Database

SQLite database:

```
tabrix.db
```

Stores:

* tables
* metadata
* sorting cache
* statistics

---

## License

MIT License

---

## Project Status

Active development 🚧
Core features implemented
AI integration working
Sorting cache implemented

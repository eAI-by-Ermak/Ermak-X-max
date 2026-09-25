# Ermak X Max

Современная студия на **Mistral Conversations API**: чат с Markdown, web search, code interpreter, генерация изображений и OCR. Адаптив под телефон и десктоп.

**Репозиторий:** [eAI-by-Ermak/Ermak-X-max](https://github.com/eAI-by-Ermak/Ermak-X-max)

## Возможности

- Чат на Conversations API (stateful)
- Модели: Small 4, Medium 3.5, Magistral, Codestral, Ministral
- Tools: `web_search`, `web_search_premium`, `code_interpreter`, `image_generation`
- OCR (`mistral-ocr-latest`) для фото и PDF
- Markdown (таблицы, код, списки)
- История диалогов в браузере (localStorage)
- API-ключ хранится только локально у пользователя — в репозиторий не попадает

## Запуск

```bash
npm install
npm run dev
```

Открой приложение → **Настройки** → вставь `MISTRAL_API_KEY`.

Сборка:

```bash
npm run build
npm run preview
```

## Важно

- Ключ **не** коммитьте и **не** публикуйте.
- `mistral-large` на части тарифов недоступен.
- Chat Completions иногда упирается в rate limit — здесь используется Conversations API.
- Прямые запросы из браузера к `api.mistral.ai` зависят от CORS; если браузер блокирует — подними прокси или backend.

## Лицензия

MIT

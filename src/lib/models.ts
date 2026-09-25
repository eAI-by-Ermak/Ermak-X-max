export type ToolId =
  | "web_search"
  | "web_search_premium"
  | "code_interpreter"
  | "image_generation";

export type ModelOption = {
  id: string;
  label: string;
  group: string;
  hint: string;
};

export const MODELS: ModelOption[] = [
  {
    id: "mistral-medium-latest",
    label: "Medium 3.5",
    group: "Флагман",
    hint: "Агентный, код, длинный горизонт",
  },
  {
    id: "mistral-small-latest",
    label: "Small 4",
    group: "Флагман",
    hint: "Быстрый гибрид instruct / reasoning / code",
  },
  {
    id: "magistral-medium-latest",
    label: "Magistral Medium",
    group: "Рассуждение",
    hint: "Глубокое рассуждение",
  },
  {
    id: "magistral-small-latest",
    label: "Magistral Small",
    group: "Рассуждение",
    hint: "Лёгкий reasoning",
  },
  {
    id: "codestral-latest",
    label: "Codestral",
    group: "Код",
    hint: "Completion и генерация кода",
  },
  {
    id: "ministral-14b-latest",
    label: "Ministral 14B",
    group: "Edge",
    hint: "Компактная 14B",
  },
  {
    id: "ministral-8b-latest",
    label: "Ministral 8B",
    group: "Edge",
    hint: "Компактная 8B",
  },
  {
    id: "ministral-3b-latest",
    label: "Ministral 3B",
    group: "Edge",
    hint: "Самая лёгкая",
  },
];

export const TOOLS: { id: ToolId; label: string; hint: string }[] = [
  {
    id: "web_search",
    label: "Web Search",
    hint: "Поиск в интернете с цитатами",
  },
  {
    id: "web_search_premium",
    label: "Web Search Premium",
    hint: "Расширенный поиск, выше лимиты",
  },
  {
    id: "code_interpreter",
    label: "Code Interpreter",
    hint: "Python sandbox, графики, расчёты",
  },
  {
    id: "image_generation",
    label: "Image Generation",
    hint: "Генерация изображений по промпту",
  },
];

export const DEFAULT_MODEL = "mistral-small-latest";
export const DEFAULT_INSTRUCTIONS =
  "Ты Ermak X — точный, спокойный ассистент. Отвечай на языке пользователя. Используй инструменты, когда они нужны. Форматируй ответы в Markdown. Не выдумывай источники.";

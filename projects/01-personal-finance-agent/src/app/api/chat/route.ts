import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";

interface ChatRequestBody {
  question: string;
  history?: { role: "user" | "assistant"; text: string }[];
  context: unknown;
}

const SYSTEM_PROMPT = `Ты — персональный финансовый ассистент, встроенный в это веб-приложение. Пользователь — обычный человек, не финансист, отвечай по-русски, простыми словами, без канцелярита.

Тебе передан JSON с уже посчитанной аналитикой по тратам пользователя (категории, динамика по месяцам, регулярные платежи, подозрительные операции, сводка). Отвечай на вопросы пользователя, опираясь ТОЛЬКО на эти данные — не придумывай операции или суммы, которых там нет. Если данных не хватает для ответа, честно скажи об этом.

Валюта — армянский драм (AMD). Форматируй суммы читаемо, например «180 000 ֏».

Отвечай кратко и по делу — 2-5 предложений или короткий список, без длинных вступлений.`;

export async function POST(request: Request) {
  let body: ChatRequestBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad_request", message: "Некорректное тело запроса" }, { status: 400 });
  }

  if (!body.question || typeof body.question !== "string") {
    return Response.json({ error: "bad_request", message: "Не передан вопрос" }, { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: "not_configured", message: "ANTHROPIC_API_KEY не настроен на сервере" },
      { status: 503 }
    );
  }

  const client = new Anthropic();
  const history = body.history ?? [];

  const messages: Anthropic.MessageParam[] = [
    ...history.map((m) => ({ role: m.role, content: m.text }) satisfies Anthropic.MessageParam),
    {
      role: "user",
      content: `Данные пользователя (JSON):\n${JSON.stringify(body.context)}\n\nВопрос пользователя: ${body.question}`,
    },
  ];

  try {
    const response = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 1024,
      output_config: { effort: "low" },
      system: SYSTEM_PROMPT,
      messages,
    });

    const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === "text");
    if (response.stop_reason === "refusal") {
      return Response.json(
        { error: "refusal", message: "Модель отказалась отвечать на этот вопрос" },
        { status: 200 }
      );
    }

    return Response.json({ answer: textBlock?.text ?? "" });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return Response.json({ error: "invalid_key", message: "Неверный API-ключ" }, { status: 401 });
    }
    if (error instanceof Anthropic.RateLimitError) {
      return Response.json(
        { error: "rate_limited", message: "Превышен лимит запросов, попробуйте позже" },
        { status: 429 }
      );
    }
    if (error instanceof Anthropic.APIError) {
      return Response.json({ error: "api_error", message: error.message }, { status: error.status ?? 500 });
    }
    return Response.json({ error: "unknown_error", message: "Не удалось получить ответ от модели" }, { status: 500 });
  }
}

/**
 * Тонкая обёртка над fetch: подставляет JWT, разбирает форматы ошибок бэкенда,
 * корректно обрабатывает 204 No Content (его возвращает почти каждый мутирующий эндпоинт).
 */

const TOKEN_KEY = "ecommerce.token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

/** Ошибка API с уже вытащенным человекочитаемым текстом. */
export class ApiError extends Error {
  status: number;
  /** Ошибки валидации FluentValidation: { "User.Email": ["Email is required"] } */
  fieldErrors?: Record<string, string[]>;

  constructor(message: string, status: number, fieldErrors?: Record<string, string[]>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

/**
 * Бэкенд отдаёт ошибки в трёх разных форматах:
 *  - ValidationException  → ProblemDetails + extensions.errors  (400)
 *  - остальное            → { error, details }                  (500, details только в DEBUG)
 *  - 401                  → пустое тело от JwtBearer middleware
 * См. REVIEW.md п.3 — стоит свести к одному ProblemDetails.
 */
async function toApiError(response: Response): Promise<ApiError> {
  if (response.status === 401) {
    return new ApiError("Требуется вход в аккаунт", 401);
  }
  if (response.status === 403) {
    return new ApiError("Недостаточно прав для этого действия", 403);
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return new ApiError(`Ошибка сервера (${response.status})`, response.status);
  }

  if (body && typeof body === "object") {
    const b = body as Record<string, unknown>;

    // ProblemDetails от ExceptionHandlingMiddleware.HandleValidationExceptionAsync
    if (b.errors && typeof b.errors === "object") {
      const fieldErrors = b.errors as Record<string, string[]>;
      const first = Object.values(fieldErrors).flat()[0];
      return new ApiError(first ?? String(b.title ?? "Ошибка валидации"), response.status, fieldErrors);
    }

    // { error, details } от HandleGenericExceptionAsync.
    // details содержит реальный текст (в т.ч. "User not found" / "Password incorrect"),
    // поэтому показываем именно его — без него UX слепой.
    if (typeof b.details === "string" && b.details) {
      return new ApiError(b.details, response.status);
    }
    if (typeof b.error === "string" && b.error) {
      return new ApiError(b.error, response.status);
    }
    if (typeof b.title === "string" && b.title) {
      return new ApiError(b.title, response.status);
    }
  }

  return new ApiError(`Ошибка сервера (${response.status})`, response.status);
}

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  /** Токен-override: нужен для админских запросов под тестовым admin-токеном. */
  token?: string | null;
  signal?: AbortSignal;
};

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, token = getToken(), signal } = options;

  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
    throw new ApiError(
      "Не удалось связаться с API. Запущен ли бэкенд на http://localhost:5269?",
      0,
    );
  }

  if (!response.ok) throw await toApiError(response);

  // 204 No Content — возвращают почти все команды (cart, orders/*, products PUT/DELETE)
  if (response.status === 204 || response.headers.get("content-length") === "0") {
    return undefined as T;
  }

  const text = await response.text();
  if (!text) return undefined as T;

  try {
    return JSON.parse(text) as T;
  } catch {
    // POST /api/products отдаёт «голый» Guid — валидный JSON-строка, но подстрахуемся
    return text as unknown as T;
  }
}

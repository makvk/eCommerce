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
 * ExceptionHandlingMiddleware отдаёт единый ProblemDetails (RFC 9457) на все статусы:
 *  - ValidationException     → { title, status, errors: { field: string[] } }        (400)
 *  - доменные исключения     → { title, status, detail: "человеческий текст" }       (400/401/403/404/409/503)
 *  - необработанные ошибки   → { title, status, detail: "общий текст" [, exceptionDetails] } (500, exceptionDetails — только DEBUG)
 *
 * Два случая, когда тела нет вовсе — их формирует не наш middleware, а ASP.NET:
 *  - 401 без токена / с истёкшим токеном — JwtBearer отвечает пустым телом
 *  - 403 при нехватке роли — Authorization middleware тоже отвечает пустым телом
 * Для них используем понятные фразы-заглушки.
 */
async function toApiError(response: Response): Promise<ApiError> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return fallbackError(response.status);
  }

  if (body && typeof body === "object") {
    const b = body as Record<string, unknown>;

    // ValidationException → { errors: { "User.Email": ["..."] } }
    if (b.errors && typeof b.errors === "object") {
      const fieldErrors = b.errors as Record<string, string[]>;
      const first = Object.values(fieldErrors).flat()[0];
      return new ApiError(first ?? String(b.title ?? "Ошибка валидации"), response.status, fieldErrors);
    }

    // Основной текст ошибки от ExceptionHandlingMiddleware
    if (typeof b.detail === "string" && b.detail) {
      return new ApiError(b.detail, response.status);
    }
    // DEBUG-сборка: реальный текст необработанного исключения под 500
    if (typeof b.exceptionDetails === "string" && b.exceptionDetails) {
      return new ApiError(b.exceptionDetails, response.status);
    }
    // Легаси-формат { error, details } — на случай старой сборки бэкенда/мока
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

  return fallbackError(response.status);
}

function fallbackError(status: number): ApiError {
  if (status === 401) return new ApiError("Требуется вход в аккаунт", 401);
  if (status === 403) return new ApiError("Недостаточно прав для этого действия", 403);
  return new ApiError(`Ошибка сервера (${status})`, status);
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

  const isFormData = body instanceof FormData;
  const headers: Record<string, string> = { Accept: "application/json" };
  // Для FormData Content-Type (с boundary) должен выставить сам fetch — не трогаем.
  if (body !== undefined && !isFormData) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(path, {
      method,
      headers,
      body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
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

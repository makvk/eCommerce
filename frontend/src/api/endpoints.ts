import { request } from "./client";
import type {
  AuthResult,
  CartResponse,
  CreateOrderResponse,
  FullName,
  Money,
  OrderDetail,
  OrdersResponse,
  Product,
  Profile,
} from "./types";

/* ─────────────────────────── auth ─────────────────────────── */

export const authApi = {
  /** POST /api/auth/login — тело обёрнуто в { user }, т.к. Command(UserData User) */
  login: (email: string, password: string) =>
    request<AuthResult>("/api/auth/login", {
      method: "POST",
      body: { user: { email, password } },
      token: null,
    }),

  /** POST /api/auth/register */
  register: (email: string, password: string, fullName: FullName) =>
    request<AuthResult>("/api/auth/register", {
      method: "POST",
      body: { user: { email, password, fullName } },
      token: null,
    }),

  /** GET /get-test-admin-token — существует только в DEBUG-сборке (DevelopmentController) */
  testAdminToken: () =>
    request<{ token: string }>("/get-test-admin-token", { token: null }),
};

/* ────────────────────────── products ──────────────────────── */

export const productsApi = {
  /** GET /api/products — без пагинации и фильтров, фильтруем на клиенте */
  list: (signal?: AbortSignal) => request<Product[]>("/api/products", { signal }),

  byId: (id: string, signal?: AbortSignal) =>
    request<Product>(`/api/products/${id}`, { signal }),

  /** POST /api/products (Admin) → Guid нового товара */
  create: (
    body: { name: string; description: string; price: Money; stockQuantity: number },
    token: string,
  ) => request<string>("/api/products", { method: "POST", body, token }),

  /** PUT /api/products/{id} (Admin) → 204 */
  update: (
    id: string,
    body: { name: string; description: string; price: Money; stockQuantity: number },
    token: string,
  ) => request<void>(`/api/products/${id}`, { method: "PUT", body, token }),

  /** DELETE /api/products/{id} (Admin) → 204 */
  remove: (id: string, token: string) =>
    request<void>(`/api/products/${id}`, { method: "DELETE", token }),
};

/* ──────────────────────────── cart ────────────────────────── */

export const cartApi = {
  /** GET /api/cart → { cart: { items }, money } — money уже в валюте пользователя */
  get: (signal?: AbortSignal) => request<CartResponse>("/api/cart", { signal }),

  /** POST /api/cart/items — ВНИМАНИЕ: складывает quantity с текущим, а не заменяет */
  add: (productId: string, quantity: number) =>
    request<void>("/api/cart/items", { method: "POST", body: { productId, quantity } }),

  /** PATCH /api/cart/items — delta != 0; при quantity <= 0 позиция удаляется */
  adjust: (productId: string, delta: number) =>
    request<void>("/api/cart/items", { method: "PATCH", body: { productId, delta } }),

  /** DELETE /api/cart/items/{productId} — в роуте именно productId, не id позиции */
  removeItem: (productId: string) =>
    request<void>(`/api/cart/items/${productId}`, { method: "DELETE" }),

  clear: () => request<void>("/api/cart", { method: "DELETE" }),
};

/* ─────────────────────────── orders ───────────────────────── */

export const ordersApi = {
  /** POST /api/orders — собирает заказ из корзины и списывает баланс */
  create: (address: {
    country: string;
    street: string;
    city: string;
    postalCode: string;
  }) => request<CreateOrderResponse>("/api/orders", { method: "POST", body: { address } }),

  list: (signal?: AbortSignal) => request<OrdersResponse>("/api/orders", { signal }),

  byId: (id: string, signal?: AbortSignal) =>
    request<OrderDetail>(`/api/orders/${id}`, { signal }),

  /** PATCH /api/orders/{id}/cancel — возвращает товары на склад и деньги на баланс */
  cancel: (id: string) => request<void>(`/api/orders/${id}/cancel`, { method: "PATCH" }),

  /* Админские переходы статусов. Порядок жёсткий:
     Created → Processing → Shipped → Delivered */
  takeInProcess: (id: string, token: string) =>
    request<void>(`/api/orders/${id}/processing`, { method: "PATCH", token }),
  markShipped: (id: string, token: string) =>
    request<void>(`/api/orders/${id}/shipped`, { method: "PATCH", token }),
  markDelivered: (id: string, token: string) =>
    request<void>(`/api/orders/${id}/delivered`, { method: "PATCH", token }),
};

/* ─────────────────────────── profile ──────────────────────── */

export const profileApi = {
  get: (signal?: AbortSignal) => request<Profile>("/api/profile", { signal }),

  /** PATCH /api/profile/change-currency — конвертирует баланс по курсу ЦБ */
  changeCurrency: (newCurrency: string) =>
    request<void>("/api/profile/change-currency", {
      method: "PATCH",
      body: { newCurrency },
    }),
};

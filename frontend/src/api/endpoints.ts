import { request } from "./client";
import type {
  AdminOrdersResponse,
  AuthResult,
  CartResponse,
  CreateOrderResponse,
  FullName,
  Money,
  OrderDetail,
  OrdersResponse,
  OrderStatus,
  Product,
  ProductsResponse,
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

/* ────────────────────────── products (public catalog) ──────────────────────── */

export type ProductsListParams = {
  search?: string;
  page?: number;
  pageSize?: number;
};

export const productsApi = {
  /** GET /api/products — поиск + пагинация */
  list: (params: ProductsListParams = {}, signal?: AbortSignal) => {
    const query = new URLSearchParams();
    if (params.search) query.set("search", params.search);
    if (params.page) query.set("page", String(params.page));
    if (params.pageSize) query.set("pageSize", String(params.pageSize));
    const qs = query.toString();
    return request<ProductsResponse>(`/api/products${qs ? `?${qs}` : ""}`, { signal });
  },

  byId: (id: string, signal?: AbortSignal) =>
    request<Product>(`/api/products/${id}`, { signal }),
};

/* ────────────────────────── products (admin) ──────────────────────── */

export const adminProductsApi = {
  list: (params: ProductsListParams = {}, token: string, signal?: AbortSignal) => {
    const query = new URLSearchParams();
    if (params.search) query.set("search", params.search);
    if (params.page) query.set("page", String(params.page));
    if (params.pageSize) query.set("pageSize", String(params.pageSize));
    const qs = query.toString();
    return request<ProductsResponse>(`/api/admin/products${qs ? `?${qs}` : ""}`, {
      token,
      signal,
    });
  },

  byId: (id: string, token: string, signal?: AbortSignal) =>
    request<Product>(`/api/admin/products/${id}`, { token, signal }),

  create: (
    body: { name: string; description: string; price: Money; stockQuantity: number },
    token: string,
  ) => request<string>("/api/admin/products", { method: "POST", body, token }),

  update: (
    id: string,
    body: { name: string; description: string; price: Money; stockQuantity: number },
    token: string,
  ) => request<void>(`/api/admin/products/${id}`, { method: "PUT", body, token }),

  remove: (id: string, token: string) =>
    request<void>(`/api/admin/products/${id}`, { method: "DELETE", token }),

  uploadImage: (id: string, file: File, token: string) => {
    const body = new FormData();
    body.append("file", file);
    return request<{ imageUrl: string }>(`/api/admin/products/${id}/image`, {
      method: "PUT",
      body,
      token,
    });
  },

  removeImage: (id: string, token: string) =>
    request<void>(`/api/admin/products/${id}/image`, { method: "DELETE", token }),
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
};

/* ───────────────────────── orders (admin) ─────────────────────── */

export const adminOrdersApi = {
  /**
   * GET /api/admin/orders (Admin) — список ВСЕХ заказов (не только своих), с фильтром
   * по покупателю/статусу и пагинацией. См. ECommerce.Application.Features.Orders.Admin.GetOrders.
   */
  list: (
    params: {
      customerId?: string;
      status?: OrderStatus;
      activeOnly?: boolean;
      page?: number;
      pageSize?: number;
    } = {},
    token: string,
    signal?: AbortSignal,
  ) => {
    const query = new URLSearchParams();
    if (params.customerId) query.set("customerId", params.customerId);
    if (params.status !== undefined) query.set("status", String(params.status));
    if (params.activeOnly) query.set("activeOnly", "true");
    if (params.page) query.set("page", String(params.page));
    if (params.pageSize) query.set("pageSize", String(params.pageSize));
    const qs = query.toString();
    return request<AdminOrdersResponse>(`/api/admin/orders${qs ? `?${qs}` : ""}`, {
      token,
      signal,
    });
  },

  /** GET /api/admin/orders/{id} (Admin) — любой заказ, без привязки к текущему пользователю */
  byId: (id: string, token: string, signal?: AbortSignal) =>
    request<OrderDetail>(`/api/admin/orders/${id}`, { token, signal }),

  /* Админские переходы статусов. Порядок жёсткий:
     Created → Processing → Shipped → Delivered */
  takeInProcess: (id: string, token: string) =>
    request<void>(`/api/admin/orders/${id}/processing`, { method: "PATCH", token }),
  markShipped: (id: string, token: string) =>
    request<void>(`/api/admin/orders/${id}/shipped`, { method: "PATCH", token }),
  markDelivered: (id: string, token: string) =>
    request<void>(`/api/admin/orders/${id}/delivered`, { method: "PATCH", token }),
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

  /** POST /api/profile/balance — пополняет баланс в текущей валюте пользователя */
  topUp: (amount: number) =>
    request<void>("/api/profile/balance", {
      method: "POST",
      body: { amount },
    }),
};

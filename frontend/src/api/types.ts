/**
 * Типы зеркалят контракты бэкенда один-в-один.
 * Источник правды — record'ы в ECommerce.Domain и ECommerce.Application.Features.
 * System.Text.Json по умолчанию отдаёт camelCase, поэтому имена полей — camelCase.
 */

/** ECommerce.Domain.Records.Money */
export interface Money {
  currency: string;
  amount: number;
}

/** ECommerce.Domain.Records.FullName */
export interface FullName {
  firstName: string;
  lastName: string;
  middleName: string;
}

/** ECommerce.Domain.Records.Address */
export interface Address {
  country: string;
  street: string;
  city: string;
  postalCode: string;
}

/**
 * ECommerce.Domain.Enums.Status — enum : byte.
 * JsonStringEnumConverter на бэке НЕ зарегистрирован, поэтому по сети
 * приезжает число (0..4). Строку тоже поддерживаем — на случай, если
 * конвертер добавят (см. REVIEW.md, п. 2).
 */
export enum OrderStatus {
  Created = 0,
  Processing = 1,
  Shipped = 2,
  Delivered = 3,
  Cancelled = 4,
}

export type RawStatus = OrderStatus | number | string;

/** ECommerce.Domain.Entities.Product — контроллер отдаёт сущность как есть */
export interface Product {
  id: string;
  name: string;
  description: string;
  price: Money;
  stockQuantity: number;
  imageUrl: string | null;
  createdAt: string;
  lastUpdatedAt: string;
}

/** ECommerce.Domain.Entities.CartItem */
export interface CartItem {
  productId: string;
  productName: string;
  quantity: number;
  price: Money;
  imageUrl: string | null;
}

/** GetCart.ResponseDto — обёртка { cart, money } */
export interface CartResponse {
  cart: { items: CartItem[] };
  money: Money;
}

/** GetOrders.OrderItemDto / GetOrderById.OrderItemDto */
export interface OrderItem {
  productId: string;
  title: string;
  quantity: number;
  price: Money;
}

/** GetOrders.OrderDto */
export interface OrderSummary {
  orderId: string;
  status: RawStatus;
  items: OrderItem[];
  totalPrice: Money;
}

/** GetOrders.ResponseDto */
export interface OrdersResponse {
  orders: OrderSummary[];
}

/** GetOrderById.ResponseDto */
export interface OrderDetail {
  id: string;
  customerId: string;
  items: OrderItem[];
  totalPrice: Money;
  address: Address;
  status: RawStatus;
  createdAt: string;
  lastUpdatedAt: string;
}

/** GetProfile.ResponseDto */
export interface Profile {
  email: string;
  balance: Money;
  name: FullName;
}

/** Login.AuthResult / Register.AuthResult */
export interface AuthResult {
  token: string;
}

/** CreateOrder.ResponseDto */
export interface CreateOrderResponse {
  orderId: string;
}

export type Role = "Customer" | "Admin";

/** Валюты из appsettings.json → CurrencySettings.SupportedCurrencies */
export const SUPPORTED_CURRENCIES = ["RUB", "USD", "EUR", "KZT"] as const;
export type Currency = (typeof SUPPORTED_CURRENCIES)[number];

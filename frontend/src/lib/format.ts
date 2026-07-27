import { OrderStatus, type Money, type RawStatus } from "@/api/types";

const CURRENCY_LOCALE: Record<string, string> = {
  RUB: "ru-RU",
  USD: "en-US",
  EUR: "de-DE",
  KZT: "kk-KZ",
};

export function formatMoney(money: Money | null | undefined): string {
  if (!money) return "—";
  const locale = CURRENCY_LOCALE[money.currency] ?? "ru-RU";
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: money.currency,
      maximumFractionDigits: 2,
    }).format(money.amount);
  } catch {
    // Неизвестный код валюты — не роняем рендер
    return `${money.amount.toFixed(2)} ${money.currency}`;
  }
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/** Статус приезжает числом (enum : byte без строкового конвертера) — нормализуем. */
export function normalizeStatus(status: RawStatus): OrderStatus {
  if (typeof status === "number") return status as OrderStatus;
  const byName: Record<string, OrderStatus> = {
    Created: OrderStatus.Created,
    Processing: OrderStatus.Processing,
    Shipped: OrderStatus.Shipped,
    Delivered: OrderStatus.Delivered,
    Cancelled: OrderStatus.Cancelled,
  };
  return byName[status] ?? OrderStatus.Created;
}

export const STATUS_LABEL: Record<OrderStatus, string> = {
  [OrderStatus.Created]: "Создан",
  [OrderStatus.Processing]: "В обработке",
  [OrderStatus.Shipped]: "Отправлен",
  [OrderStatus.Delivered]: "Доставлен",
  [OrderStatus.Cancelled]: "Отменён",
};

/** Классы бейджа под каждый статус. */
export const STATUS_CLASS: Record<OrderStatus, string> = {
  [OrderStatus.Created]: "bg-sky-500/15 text-sky-400 border-sky-500/25",
  [OrderStatus.Processing]: "bg-amber-500/15 text-amber-400 border-amber-500/25",
  [OrderStatus.Shipped]: "bg-violet-500/15 text-violet-400 border-violet-500/25",
  [OrderStatus.Delivered]: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  [OrderStatus.Cancelled]: "bg-rose-500/15 text-rose-400 border-rose-500/25",
};

/** Отменить можно всё, кроме доставленного и уже отменённого (см. CancelOrder.Handler). */
export function canCancel(status: RawStatus): boolean {
  const s = normalizeStatus(status);
  return s !== OrderStatus.Delivered && s !== OrderStatus.Cancelled;
}

/** Плейсхолдер для товаров без картинки — детерминированный градиент по id. */
export function placeholderGradient(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  const h1 = hash % 360;
  const h2 = (h1 + 55) % 360;
  return `linear-gradient(135deg, oklch(0.45 0.16 ${h1}), oklch(0.32 0.12 ${h2}))`;
}

export function initialsOf(name: { firstName?: string; lastName?: string }): string {
  const a = name.firstName?.[0] ?? "";
  const b = name.lastName?.[0] ?? "";
  return (a + b).toUpperCase() || "?";
}

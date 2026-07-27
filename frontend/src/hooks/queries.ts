import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cartApi, ordersApi, productsApi, profileApi } from "@/api/endpoints";
import { ApiError } from "@/api/client";
import { useAuth } from "@/context/AuthContext";

export const qk = {
  products: ["products"] as const,
  product: (id: string) => ["product", id] as const,
  cart: ["cart"] as const,
  orders: ["orders"] as const,
  order: (id: string) => ["order", id] as const,
  profile: ["profile"] as const,
};

/** Единая точка показа ошибок — текст уже разобран в ApiError. */
export function notifyError(error: unknown, fallback = "Что-то пошло не так") {
  const message = error instanceof ApiError ? error.message : fallback;
  toast.error(message);
}

/* ────────────────────────── products ──────────────────────── */

export function useProducts() {
  return useQuery({
    queryKey: qk.products,
    queryFn: ({ signal }) => productsApi.list(signal),
    staleTime: 30_000,
  });
}

export function useProduct(id: string | undefined) {
  return useQuery({
    queryKey: qk.product(id ?? ""),
    queryFn: ({ signal }) => productsApi.byId(id!, signal),
    enabled: Boolean(id),
  });
}

/* ──────────────────────────── cart ────────────────────────── */

export function useCart() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: qk.cart,
    queryFn: ({ signal }) => cartApi.get(signal),
    // Корзина живёт в Redis под userId — без токена запрос смысла не имеет
    enabled: isAuthenticated,
    staleTime: 5_000,
  });
}

export function useAddToCart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, quantity }: { productId: string; quantity: number }) =>
      cartApi.add(productId, quantity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.cart });
      toast.success("Добавлено в корзину");
    },
    onError: (e) => notifyError(e, "Не удалось добавить товар"),
  });
}

export function useAdjustCartItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, delta }: { productId: string; delta: number }) =>
      cartApi.adjust(productId, delta),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.cart }),
    onError: (e) => notifyError(e, "Не удалось изменить количество"),
  });
}

export function useRemoveCartItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (productId: string) => cartApi.removeItem(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.cart });
      toast.success("Товар удалён из корзины");
    },
    onError: (e) => notifyError(e, "Не удалось удалить товар"),
  });
}

export function useClearCart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => cartApi.clear(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.cart });
      toast.success("Корзина очищена");
    },
    onError: (e) => notifyError(e, "Не удалось очистить корзину"),
  });
}

/* ─────────────────────────── orders ───────────────────────── */

export function useOrders() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: qk.orders,
    queryFn: ({ signal }) => ordersApi.list(signal),
    enabled: isAuthenticated,
  });
}

export function useOrder(id: string | undefined) {
  return useQuery({
    queryKey: qk.order(id ?? ""),
    queryFn: ({ signal }) => ordersApi.byId(id!, signal),
    enabled: Boolean(id),
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ordersApi.create,
    onSuccess: () => {
      // Заказ меняет всё сразу: корзина очищена, баланс списан, склад уменьшен
      queryClient.invalidateQueries({ queryKey: qk.cart });
      queryClient.invalidateQueries({ queryKey: qk.orders });
      queryClient.invalidateQueries({ queryKey: qk.profile });
      queryClient.invalidateQueries({ queryKey: qk.products });
    },
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ordersApi.cancel(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: qk.orders });
      queryClient.invalidateQueries({ queryKey: qk.order(id) });
      queryClient.invalidateQueries({ queryKey: qk.profile });
      queryClient.invalidateQueries({ queryKey: qk.products });
      toast.success("Заказ отменён, деньги вернулись на баланс");
    },
    onError: (e) => notifyError(e, "Не удалось отменить заказ"),
  });
}

/* ─────────────────────────── profile ──────────────────────── */

export function useProfile() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: qk.profile,
    queryFn: ({ signal }) => profileApi.get(signal),
    enabled: isAuthenticated,
  });
}

export function useChangeCurrency() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (currency: string) => profileApi.changeCurrency(currency),
    onSuccess: () => {
      // Корзина считается в валюте пользователя — её тоже пересчитать
      queryClient.invalidateQueries({ queryKey: qk.profile });
      queryClient.invalidateQueries({ queryKey: qk.cart });
      toast.success("Валюта изменена");
    },
    onError: (e) => notifyError(e, "Не удалось сменить валюту"),
  });
}

import { Link } from "react-router-dom";
import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/EmptyState";
import { ProductImage } from "@/components/ProductImage";
import {
  useAdjustCartItem,
  useCart,
  useClearCart,
  useProfile,
  useRemoveCartItem,
} from "@/hooks/queries";
import { formatMoney } from "@/lib/format";

export function CartPage() {
  const { data, isLoading } = useCart();
  const { data: profile } = useProfile();
  const adjust = useAdjustCartItem();
  const remove = useRemoveCartItem();
  const clear = useClearCart();

  const items = data?.cart.items ?? [];
  const total = data?.money;

  // Баланс списывается при создании заказа (CreateOrder.Handler)
  const notEnoughMoney =
    Boolean(profile && total) && profile!.balance.amount < total!.amount;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-48" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="space-y-8">
        <h1 className="text-3xl font-semibold tracking-tight">Корзина</h1>
        <EmptyState
          icon={ShoppingCart}
          title="Корзина пуста"
          description="Загляните в каталог — там наверняка есть что-то нужное."
          action={
            <Button asChild>
              <Link to="/">Перейти в каталог</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold tracking-tight">Корзина</h1>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              <Trash2 className="size-4" />
              Очистить
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Очистить корзину?</AlertDialogTitle>
              <AlertDialogDescription>
                Все товары будут удалены. Отменить это действие нельзя.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Отмена</AlertDialogCancel>
              <AlertDialogAction onClick={() => clear.mutate()}>
                Очистить
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.productId} className="overflow-hidden py-0">
              <CardContent className="flex gap-4 p-4">
                <Link to={`/products/${item.productId}`} className="shrink-0">
                  <ProductImage
                    src={item.imageUrl}
                    alt={item.productName}
                    seed={item.productId}
                    className="size-20 rounded-lg"
                  />
                </Link>

                <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        to={`/products/${item.productId}`}
                        className="line-clamp-1 font-medium hover:underline"
                      >
                        {item.productName}
                      </Link>
                      <p className="text-sm text-muted-foreground tabular-nums">
                        {formatMoney(item.price)} за штуку
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => remove.mutate(item.productId)}
                      aria-label="Удалить товар"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center rounded-lg border">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 rounded-r-none"
                        disabled={adjust.isPending}
                        onClick={() =>
                          adjust.mutate({ productId: item.productId, delta: -1 })
                        }
                      >
                        <Minus className="size-3.5" />
                      </Button>
                      <span className="w-10 text-center text-sm font-medium tabular-nums">
                        {item.quantity}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 rounded-l-none"
                        disabled={adjust.isPending}
                        onClick={() =>
                          adjust.mutate({ productId: item.productId, delta: 1 })
                        }
                      >
                        <Plus className="size-3.5" />
                      </Button>
                    </div>
                    <span className="font-semibold tabular-nums">
                      {formatMoney({
                        currency: item.price.currency,
                        amount: item.price.amount * item.quantity,
                      })}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="lg:sticky lg:top-24 lg:h-fit">
          <Card>
            <CardContent className="space-y-4">
              <h2 className="font-semibold">Итого</h2>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Товаров</span>
                <span className="tabular-nums">
                  {items.reduce((s, i) => s + i.quantity, 0)}
                </span>
              </div>

              <Separator />

              <div className="flex items-baseline justify-between">
                <span className="text-muted-foreground">К оплате</span>
                <span className="text-2xl font-semibold tabular-nums">
                  {formatMoney(total)}
                </span>
              </div>

              {profile && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Ваш баланс</span>
                  <span className="tabular-nums">{formatMoney(profile.balance)}</span>
                </div>
              )}

              {notEnoughMoney && (
                <p className="rounded-lg border border-amber-500/25 bg-amber-500/10 p-3 text-sm text-amber-400">
                  На балансе недостаточно средств.{" "}
                  <Link to="/profile" className="underline underline-offset-2">
                    Пополните баланс
                  </Link>{" "}
                  в профиле, затем оформите заказ.
                </p>
              )}

              <Button asChild className="w-full" size="lg">
                <Link to="/checkout">Оформить заказ</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

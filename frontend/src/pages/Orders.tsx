import { Link } from "react-router-dom";
import { ChevronRight, ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { useCancelOrder, useOrders } from "@/hooks/queries";
import { canCancel, formatMoney } from "@/lib/format";

export function OrdersPage() {
  const { data, isLoading } = useOrders();
  const cancel = useCancelOrder();

  const orders = data?.orders ?? [];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-48" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-36 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-semibold tracking-tight">Мои заказы</h1>

      {orders.length === 0 ? (
        <EmptyState
          icon={ReceiptText}
          title="Заказов пока нет"
          description="Оформите первый заказ — он появится здесь."
          action={
            <Button asChild>
              <Link to="/">В каталог</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.orderId}>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <StatusBadge status={order.status} />
                    <span className="font-mono text-xs text-muted-foreground">
                      #{order.orderId.slice(0, 8)}
                    </span>
                  </div>
                  <span className="text-lg font-semibold tabular-nums">
                    {formatMoney(order.totalPrice)}
                  </span>
                </div>

                <Separator />

                <ul className="space-y-1.5 text-sm">
                  {order.items.map((item) => (
                    <li
                      key={item.productId}
                      className="flex justify-between gap-3 text-muted-foreground"
                    >
                      <span className="line-clamp-1">
                        {item.title} × {item.quantity}
                      </span>
                      <span className="shrink-0 tabular-nums">
                        {formatMoney({
                          currency: item.price.currency,
                          amount: item.price.amount * item.quantity,
                        })}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="flex flex-wrap items-center gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/orders/${order.orderId}`}>
                      Подробнее
                      <ChevronRight className="size-4" />
                    </Link>
                  </Button>
                  {canCancel(order.status) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-destructive"
                      disabled={cancel.isPending}
                      onClick={() => cancel.mutate(order.orderId)}
                    >
                      Отменить
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

import { Link, useParams } from "react-router-dom";
import { ArrowLeft, MapPin, PackageX } from "lucide-react";
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
import { StatusBadge } from "@/components/StatusBadge";
import { useCancelOrder, useOrder } from "@/hooks/queries";
import { canCancel, formatDate, formatMoney } from "@/lib/format";
import { OrderStatus } from "@/api/types";
import { normalizeStatus } from "@/lib/format";
import { cn } from "@/lib/utils";

const TIMELINE = [
  { status: OrderStatus.Created, label: "Создан" },
  { status: OrderStatus.Processing, label: "В обработке" },
  { status: OrderStatus.Shipped, label: "Отправлен" },
  { status: OrderStatus.Delivered, label: "Доставлен" },
];

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: order, isLoading, error } = useOrder(id);
  const cancel = useCancelOrder();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <EmptyState
        icon={PackageX}
        title="Заказ не найден"
        description={error ? (error as Error).message : undefined}
        action={
          <Button asChild variant="outline">
            <Link to="/orders">К списку заказов</Link>
          </Button>
        }
      />
    );
  }

  const status = normalizeStatus(order.status);
  const isCancelled = status === OrderStatus.Cancelled;

  return (
    <div className="space-y-8">
      <Button variant="ghost" size="sm" className="-ml-2" asChild>
        <Link to="/orders">
          <ArrowLeft className="size-4" />
          Все заказы
        </Link>
      </Button>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">
            Заказ #{order.id.slice(0, 8)}
          </h1>
          <p className="text-sm text-muted-foreground">
            от {formatDate(order.createdAt)}
          </p>
        </div>
        <StatusBadge status={order.status} className="text-sm" />
      </div>

      {/* Прогресс по статусам. Отменённый заказ выпадает из цепочки — показываем отдельно */}
      {!isCancelled && (
        <div className="flex items-center gap-2">
          {TIMELINE.map((step, index) => {
            const reached = status >= step.status;
            return (
              <div key={step.status} className="flex flex-1 items-center gap-2">
                <div className="flex flex-1 flex-col gap-2">
                  <div
                    className={cn(
                      "h-1 rounded-full transition-colors",
                      reached ? "bg-primary" : "bg-muted",
                    )}
                  />
                  <span
                    className={cn(
                      "text-xs",
                      reached ? "font-medium text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {step.label}
                  </span>
                </div>
                {index < TIMELINE.length - 1 && <div className="w-1" />}
              </div>
            );
          })}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Card>
          <CardContent className="space-y-4">
            <h2 className="font-semibold">Состав заказа</h2>
            <Separator />
            <ul className="divide-y">
              {order.items.map((item) => (
                <li key={item.productId} className="flex justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <Link
                      to={`/products/${item.productId}`}
                      className="line-clamp-1 font-medium hover:underline"
                    >
                      {item.title}
                    </Link>
                    <p className="text-sm text-muted-foreground tabular-nums">
                      {formatMoney(item.price)} × {item.quantity}
                    </p>
                  </div>
                  <span className="shrink-0 font-medium tabular-nums">
                    {formatMoney({
                      currency: item.price.currency,
                      amount: item.price.amount * item.quantity,
                    })}
                  </span>
                </li>
              ))}
            </ul>
            <Separator />
            <div className="flex items-baseline justify-between">
              <span className="font-medium">Итого</span>
              <span className="text-2xl font-semibold tabular-nums">
                {formatMoney(order.totalPrice)}
              </span>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-3">
              <h2 className="flex items-center gap-2 font-semibold">
                <MapPin className="size-4" />
                Доставка
              </h2>
              <address className="text-sm not-italic leading-relaxed text-muted-foreground">
                {order.address.country}
                <br />
                {order.address.city}, {order.address.street}
                <br />
                {order.address.postalCode}
              </address>
            </CardContent>
          </Card>

          {canCancel(order.status) && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="w-full">
                  Отменить заказ
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Отменить заказ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Товары вернутся на склад, а {formatMoney(order.totalPrice)} —
                    на ваш баланс.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Не отменять</AlertDialogCancel>
                  <AlertDialogAction onClick={() => cancel.mutate(order.id)}>
                    Отменить заказ
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>
    </div>
  );
}

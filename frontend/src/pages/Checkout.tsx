import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, CreditCard, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/EmptyState";
import { useCart, useCreateOrder, useProfile, notifyError } from "@/hooks/queries";
import { formatMoney } from "@/lib/format";
import { ApiError } from "@/api/client";

const FIELDS = [
  { key: "country", label: "Страна", placeholder: "Россия", maxLength: 50 },
  { key: "city", label: "Город", placeholder: "Москва", maxLength: 50 },
  { key: "street", label: "Улица и дом", placeholder: "Тверская, 1", maxLength: 50 },
  { key: "postalCode", label: "Индекс", placeholder: "125009", maxLength: 50 },
] as const;

type AddressForm = Record<(typeof FIELDS)[number]["key"], string>;

export function CheckoutPage() {
  const navigate = useNavigate();
  const { data: cart } = useCart();
  const { data: profile } = useProfile();
  const createOrder = useCreateOrder();

  const [address, setAddress] = useState<AddressForm>({
    country: "",
    city: "",
    street: "",
    postalCode: "",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const items = cart?.cart.items ?? [];
  const total = cart?.money;
  const notEnoughMoney =
    Boolean(profile && total) && profile!.balance.amount < total!.amount;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (notEnoughMoney) return;
    setFieldErrors({});

    try {
      const { orderId } = await createOrder.mutateAsync(address);
      toast.success("Заказ оформлен");
      navigate(`/orders/${orderId}`);
    } catch (error) {
      // FluentValidation возвращает ключи вида "Address.City" — приводим к именам полей
      if (error instanceof ApiError && error.fieldErrors) {
        const mapped: Record<string, string> = {};
        for (const [key, messages] of Object.entries(error.fieldErrors)) {
          const field = key.split(".").pop()?.toLowerCase();
          const match = FIELDS.find((f) => f.key.toLowerCase() === field);
          if (match) mapped[match.key] = messages[0];
        }
        setFieldErrors(mapped);
      }
      notifyError(error, "Не удалось оформить заказ");
    }
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={ShoppingCart}
        title="Корзина пуста"
        description="Нечего оформлять — сначала добавьте товары."
        action={
          <Button asChild>
            <Link to="/">В каталог</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-8">
      <Button variant="ghost" size="sm" className="-ml-2" asChild>
        <Link to="/cart">
          <ArrowLeft className="size-4" />
          Назад в корзину
        </Link>
      </Button>

      <h1 className="text-3xl font-semibold tracking-tight">Оформление заказа</h1>

      <form onSubmit={handleSubmit} className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        <Card>
          <CardContent className="space-y-5">
            <div>
              <h2 className="font-semibold">Адрес доставки</h2>
              <p className="text-sm text-muted-foreground">
                Все поля обязательны, максимум 50 символов каждое.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {FIELDS.map(({ key, label, placeholder, maxLength }) => (
                <div key={key} className="space-y-2">
                  <Label htmlFor={key}>{label}</Label>
                  <Input
                    id={key}
                    value={address[key]}
                    maxLength={maxLength}
                    placeholder={placeholder}
                    aria-invalid={Boolean(fieldErrors[key])}
                    onChange={(e) =>
                      setAddress((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                  />
                  {fieldErrors[key] && (
                    <p className="text-xs text-destructive">{fieldErrors[key]}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="lg:sticky lg:top-24 lg:h-fit">
          <Card>
            <CardContent className="space-y-4">
              <h2 className="font-semibold">Ваш заказ</h2>

              <ul className="space-y-2 text-sm">
                {items.map((item) => (
                  <li key={item.productId} className="flex justify-between gap-3">
                    <span className="line-clamp-1 text-muted-foreground">
                      {item.productName} × {item.quantity}
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

              <Separator />

              <div className="flex items-baseline justify-between">
                <span className="text-muted-foreground">К оплате</span>
                <span className="text-2xl font-semibold tabular-nums">
                  {formatMoney(total)}
                </span>
              </div>

              {profile && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Баланс после оплаты</span>
                  <span className="tabular-nums">
                    {formatMoney({
                      currency: profile.balance.currency,
                      amount: profile.balance.amount - (total?.amount ?? 0),
                    })}
                  </span>
                </div>
              )}

              {notEnoughMoney && (
                <p className="rounded-lg border border-amber-500/25 bg-amber-500/10 p-3 text-sm text-amber-400">
                  На балансе недостаточно средств.{" "}
                  <Link to="/profile" className="underline underline-offset-2">
                    Пополните баланс
                  </Link>
                  , затем оформите заказ.
                </p>
              )}

              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={createOrder.isPending || notEnoughMoney}
              >
                <CreditCard className="size-4" />
                {createOrder.isPending ? "Оформляем…" : "Оплатить с баланса"}
              </Button>

              <p className="text-xs text-muted-foreground">
                Сумма спишется с внутреннего баланса. Товары зарезервируются на складе,
                корзина очистится.
              </p>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}

import { useState, type FormEvent } from "react";
import { Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useChangeCurrency, useProfile, useTopUpBalance } from "@/hooks/queries";
import { formatMoney, initialsOf } from "@/lib/format";
import { SUPPORTED_CURRENCIES } from "@/api/types";

const CURRENCY_LABELS: Record<string, string> = {
  RUB: "Рубль (₽)",
  USD: "Доллар ($)",
  EUR: "Евро (€)",
  KZT: "Тенге (₸)",
};

const PRESET_AMOUNTS = [500, 1000, 5000, 10000] as const;

export function ProfilePage() {
  const { data: profile, isLoading } = useProfile();
  const changeCurrency = useChangeCurrency();
  const topUp = useTopUpBalance();
  const [amount, setAmount] = useState("");

  if (isLoading || !profile) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  const fullName = [profile.name.lastName, profile.name.firstName, profile.name.middleName]
    .filter(Boolean)
    .join(" ");

  function handleTopUp(event: FormEvent) {
    event.preventDefault();
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return;
    topUp.mutate(value, {
      onSuccess: () => setAmount(""),
    });
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-semibold tracking-tight">Профиль</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="space-y-5">
            <div className="flex items-center gap-4">
              <Avatar className="size-14">
                <AvatarFallback className="text-lg">
                  {initialsOf(profile.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate font-medium">{fullName}</p>
                <p className="truncate text-sm text-muted-foreground">{profile.email}</p>
              </div>
            </div>

            <Separator />

            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Имя</dt>
                <dd className="font-medium">{profile.name.firstName}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Фамилия</dt>
                <dd className="font-medium">{profile.name.lastName}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Отчество</dt>
                <dd className="font-medium">{profile.name.middleName || "—"}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-5">
            <h2 className="flex items-center gap-2 font-semibold">
              <Wallet className="size-4" />
              Баланс
            </h2>

            <p className="text-4xl font-semibold tabular-nums">
              {formatMoney(profile.balance)}
            </p>

            <Separator />

            <form onSubmit={handleTopUp} className="space-y-3">
              <Label htmlFor="top-up-amount">Пополнить баланс</Label>
              <div className="flex flex-wrap gap-2">
                {PRESET_AMOUNTS.map((preset) => (
                  <Button
                    key={preset}
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={topUp.isPending}
                    onClick={() => setAmount(String(preset))}
                  >
                    +{preset.toLocaleString("ru-RU")}
                  </Button>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  id="top-up-amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  placeholder={`Сумма в ${profile.balance.currency}`}
                  value={amount}
                  disabled={topUp.isPending}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <Button type="submit" disabled={topUp.isPending || !amount}>
                  {topUp.isPending ? "…" : "Пополнить"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Сумма зачисляется в текущей валюте счёта ({profile.balance.currency}).
                Платёжный шлюз не подключён — это учебное пополнение.
              </p>
            </form>

            <Separator />

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="currency">
                Валюта счёта
              </label>
              <Select
                value={profile.balance.currency}
                onValueChange={(value) => changeCurrency.mutate(value)}
                disabled={changeCurrency.isPending}
              >
                <SelectTrigger id="currency" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_CURRENCIES.map((currency) => (
                    <SelectItem key={currency} value={currency}>
                      {CURRENCY_LABELS[currency] ?? currency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Баланс пересчитается по курсу ЦБ РФ. Курсы обновляются фоновым
                воркером раз в 12 часов.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

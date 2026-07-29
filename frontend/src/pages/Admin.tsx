import { useState, type ChangeEvent, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { ProductImage } from "@/components/ProductImage";
import { useAuth } from "@/context/AuthContext";
import { useAdminOrderTransition, useAdminOrders, useAdminProducts, notifyError } from "@/hooks/queries";
import { adminProductsApi } from "@/api/endpoints";
import { formatMoney, STATUS_LABEL, normalizeStatus } from "@/lib/format";
import { OrderStatus, SUPPORTED_CURRENCIES, type Currency, type Product } from "@/api/types";

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

const PAGE_SIZE = 10;

const STATUS_FILTER_OPTIONS = [
  OrderStatus.Created,
  OrderStatus.Processing,
  OrderStatus.Shipped,
  OrderStatus.Delivered,
  OrderStatus.Cancelled,
] as const;

const CURRENCY_LABELS: Record<Currency, string> = {
  RUB: "₽ RUB",
  USD: "$ USD",
  EUR: "€ EUR",
  KZT: "₸ KZT",
};

export function AdminPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Админка</h1>
        <p className="text-muted-foreground">
          Работает на dev-токене из <code className="text-xs">/get-test-admin-token</code>.
          Он доступен только в DEBUG-сборке бэкенда.
        </p>
      </div>

      <Tabs defaultValue="products">
        <TabsList>
          <TabsTrigger value="products">Товары</TabsTrigger>
          <TabsTrigger value="orders">Заказы</TabsTrigger>
        </TabsList>
        <TabsContent value="products" className="mt-6">
          <ProductsTab />
        </TabsContent>
        <TabsContent value="orders" className="mt-6">
          <OrdersTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ───────────────────────────── товары ───────────────────────────── */

type ProductForm = {
  name: string;
  description: string;
  amount: string;
  currency: Currency;
  stockQuantity: string;
};

const EMPTY_FORM: ProductForm = {
  name: "",
  description: "",
  amount: "",
  currency: "RUB",
  stockQuantity: "",
};

function ProductsTab() {
  const { adminToken } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useAdminProducts({
    search: search || undefined,
    page,
    pageSize: PAGE_SIZE,
  });
  const products = data?.products ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    queryClient.invalidateQueries({ queryKey: ["products"] });
  };

  const save = useMutation({
    mutationFn: async () => {
      const body = {
        name: form.name.trim(),
        description: form.description.trim(),
        price: { currency: form.currency, amount: Number(form.amount) },
        stockQuantity: Number(form.stockQuantity),
      };
      if (editing) return adminProductsApi.update(editing.id, body, adminToken!);
      return adminProductsApi.create(body, adminToken!);
    },
    onSuccess: () => {
      invalidate();
      setDialogOpen(false);
      toast.success(editing ? "Товар обновлён" : "Товар добавлен");
    },
    onError: (e) => notifyError(e, "Не удалось сохранить товар"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminProductsApi.remove(id, adminToken!),
    onSuccess: () => {
      invalidate();
      toast.success("Товар удалён");
    },
    onError: (e) => notifyError(e, "Не удалось удалить товар"),
  });

  const uploadImage = useMutation({
    mutationFn: (file: File) => adminProductsApi.uploadImage(editing!.id, file, adminToken!),
    onSuccess: (result) => {
      invalidate();
      setEditing((prev) => (prev ? { ...prev, imageUrl: result.imageUrl } : prev));
      toast.success("Картинка загружена");
    },
    onError: (e) => notifyError(e, "Не удалось загрузить картинку"),
  });

  const removeImage = useMutation({
    mutationFn: () => adminProductsApi.removeImage(editing!.id, adminToken!),
    onSuccess: () => {
      invalidate();
      setEditing((prev) => (prev ? { ...prev, imageUrl: null } : prev));
      toast.success("Картинка удалена");
    },
    onError: (e) => notifyError(e, "Не удалось удалить картинку"),
  });

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast.error("Допустимые форматы: JPEG, PNG, WebP");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      toast.error("Максимальный размер файла — 5 МБ");
      return;
    }
    uploadImage.mutate(file);
  }

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(product: Product) {
    setEditing(product);
    setForm({
      name: product.name,
      description: product.description,
      amount: String(product.price.amount),
      currency: (SUPPORTED_CURRENCIES.includes(product.price.currency as Currency)
        ? product.price.currency
        : "RUB") as Currency,
      stockQuantity: String(product.stockQuantity),
    });
    setDialogOpen(true);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    save.mutate();
  }

  function applySearch() {
    setSearch(searchInput.trim());
    setPage(1);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {totalCount} товаров в каталоге
        </p>
        <div className="flex flex-wrap gap-2">
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applySearch()}
            placeholder="Поиск…"
            className="w-48"
          />
          <Button type="button" variant="outline" onClick={applySearch}>
            Найти
          </Button>
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            Добавить товар
          </Button>
        </div>
      </div>

      <Card className="py-0">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !products.length ? (
            <div className="p-6">
              <EmptyState
                icon={Plus}
                title="Товаров нет"
                description="Добавьте первый товар, чтобы он появился в каталоге."
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14" />
                  <TableHead>Название</TableHead>
                  <TableHead className="hidden md:table-cell">Описание</TableHead>
                  <TableHead className="text-right">Цена</TableHead>
                  <TableHead className="text-right">Склад</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <ProductImage
                        src={product.imageUrl}
                        alt={product.name}
                        seed={product.id}
                        className="size-10 rounded-md"
                      />
                    </TableCell>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell className="hidden max-w-xs truncate text-muted-foreground md:table-cell">
                      {product.description}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(product.price)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {product.stockQuantity}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => openEdit(product)}
                          aria-label="Редактировать"
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-muted-foreground hover:text-destructive"
                              aria-label="Удалить"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Удалить «{product.name}»?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Товар удалится из каталога навсегда.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Отмена</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => remove.mutate(product.id)}
                              >
                                Удалить
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="icon"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-sm text-muted-foreground tabular-nums">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editing ? "Редактировать товар" : "Новый товар"}
              </DialogTitle>
              <DialogDescription>
                Цену можно задать в любой поддерживаемой валюте (RUB, USD, EUR, KZT).
                При оплате сумма конвертируется в валюту баланса покупателя.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {editing ? (
                <div className="space-y-2">
                  <Label>Картинка</Label>
                  <div className="flex items-center gap-3">
                    <ProductImage
                      src={editing.imageUrl}
                      alt={editing.name}
                      seed={editing.id}
                      className="size-16 rounded-md shrink-0"
                    />
                    <div className="flex flex-col gap-2">
                      <Input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        disabled={uploadImage.isPending}
                        onChange={handleImageChange}
                        className="max-w-64"
                      />
                      <p className="text-xs text-muted-foreground">
                        JPEG, PNG или WebP, до 5 МБ.
                      </p>
                      {editing.imageUrl && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-fit"
                          disabled={removeImage.isPending}
                          onClick={() => removeImage.mutate()}
                        >
                          Удалить картинку
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Картинку можно будет загрузить после сохранения товара.
                </p>
              )}
              <div className="space-y-2">
                <Label htmlFor="p-name">Название</Label>
                <Input
                  id="p-name"
                  required
                  maxLength={50}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-desc">Описание</Label>
                <Textarea
                  id="p-desc"
                  required
                  maxLength={500}
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2 sm:col-span-1">
                  <Label htmlFor="p-currency">Валюта</Label>
                  <Select
                    value={form.currency}
                    onValueChange={(value) =>
                      setForm({ ...form, currency: value as Currency })
                    }
                  >
                    <SelectTrigger id="p-currency" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPORTED_CURRENCIES.map((currency) => (
                        <SelectItem key={currency} value={currency}>
                          {CURRENCY_LABELS[currency]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-1">
                  <Label htmlFor="p-price">Цена</Label>
                  <Input
                    id="p-price"
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  />
                </div>
                <div className="space-y-2 sm:col-span-1">
                  <Label htmlFor="p-stock">На складе</Label>
                  <Input
                    id="p-stock"
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={form.stockQuantity}
                    onChange={(e) =>
                      setForm({ ...form, stockQuantity: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Отмена
              </Button>
              <Button type="submit" disabled={save.isPending}>
                {save.isPending ? "Сохраняем…" : "Сохранить"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ───────────────────────────── заказы ───────────────────────────── */

function OrdersTab() {
  const { isAdmin } = useAuth();
  const [page, setPage] = useState(1);
  // active = Created/Processing/Shipped — с ними админ ещё может взаимодействовать
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all" | "active">("active");

  const { data, isLoading } = useAdminOrders({
    page,
    pageSize: PAGE_SIZE,
    status: typeof statusFilter === "number" ? statusFilter : undefined,
    activeOnly: statusFilter === "active",
  });

  const transition = useAdminOrderTransition();

  const orders = data?.orders ?? [];
  const totalCount = data?.totalCount ?? 0;
  const hasNextPage = page * PAGE_SIZE < totalCount;

  function handleStatusFilterChange(value: string) {
    if (value === "all" || value === "active") setStatusFilter(value);
    else setStatusFilter(Number(value) as OrderStatus);
    setPage(1);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {totalCount} заказ{totalCount === 1 ? "" : "ов"}
          {statusFilter === "active" ? " в работе" : ""} —{" "}
          <code className="text-xs">GET /api/admin/orders</code>
        </p>
        <Select value={String(statusFilter)} onValueChange={handleStatusFilterChange}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Статус" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Активные (можно обработать)</SelectItem>
            <SelectItem value="all">Все статусы</SelectItem>
            {STATUS_FILTER_OPTIONS.map((status) => (
              <SelectItem key={status} value={String(status)}>
                {STATUS_LABEL[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!isAdmin ? (
        <EmptyState
          icon={TriangleAlert}
          title="Нужен вход как админ"
          description="Список тянется под dev-токеном администратора."
        />
      ) : isLoading ? (
        <Skeleton className="h-40 w-full rounded-xl" />
      ) : orders.length === 0 ? (
        <EmptyState
          icon={TriangleAlert}
          title={statusFilter === "active" ? "Нет активных заказов" : "Заказов нет"}
          description={
            statusFilter === "active"
              ? "Все заказы уже доставлены или отменены. Переключите фильтр на «Все статусы»."
              : undefined
          }
        />
      ) : (
        <>
          <Card className="py-0">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Заказ</TableHead>
                    <TableHead>Покупатель</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead className="text-right">Сумма</TableHead>
                    <TableHead className="text-right">Действие</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => {
                    const status = normalizeStatus(order.status);
                    const next = nextTransition(status);
                    return (
                      <TableRow key={order.orderId}>
                        <TableCell className="font-mono text-xs">
                          #{order.orderId.slice(0, 8)}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {order.customerId.slice(0, 8)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={order.status} />
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatMoney(order.totalPrice)}
                        </TableCell>
                        <TableCell className="text-right">
                          {next ? (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={transition.isPending}
                              onClick={() =>
                                transition.mutate({ id: order.orderId, to: next.to })
                              }
                            >
                              {next.label}
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              финальный статус
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Страница {page}</p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="size-4" />
                Назад
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!hasNextPage}
                onClick={() => setPage((p) => p + 1)}
              >
                Вперёд
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/** Переходы жёстко зашиты в хендлерах: Created → Processing → Shipped → Delivered. */
function nextTransition(
  status: OrderStatus,
): { to: OrderStatus.Processing | OrderStatus.Shipped | OrderStatus.Delivered; label: string } | null {
  switch (status) {
    case OrderStatus.Created:
      return { to: OrderStatus.Processing, label: "Взять в работу" };
    case OrderStatus.Processing:
      return { to: OrderStatus.Shipped, label: "Отправить" };
    case OrderStatus.Shipped:
      return { to: OrderStatus.Delivered, label: "Доставлен" };
    default:
      return null;
  }
}

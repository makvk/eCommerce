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
import { useAdminOrderTransition, useAdminOrders, useProducts, qk, notifyError } from "@/hooks/queries";
import { productsApi } from "@/api/endpoints";
import { formatMoney, STATUS_LABEL, normalizeStatus } from "@/lib/format";
import { OrderStatus, type Product } from "@/api/types";

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

/** Цена товара создаётся только в базовой валюте — AddProduct.CommandValidator это требует. */
const BASE_CURRENCY = "RUB";

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
  stockQuantity: string;
};

const EMPTY_FORM: ProductForm = {
  name: "",
  description: "",
  amount: "",
  stockQuantity: "",
};

function ProductsTab() {
  const { adminToken } = useAuth();
  const queryClient = useQueryClient();
  const { data: products, isLoading } = useProducts();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: qk.products });

  const save = useMutation({
    mutationFn: async () => {
      const body = {
        name: form.name.trim(),
        description: form.description.trim(),
        price: { currency: BASE_CURRENCY, amount: Number(form.amount) },
        stockQuantity: Number(form.stockQuantity),
      };
      if (editing) return productsApi.update(editing.id, body, adminToken!);
      return productsApi.create(body, adminToken!);
    },
    onSuccess: () => {
      invalidate();
      setDialogOpen(false);
      toast.success(editing ? "Товар обновлён" : "Товар добавлен");
    },
    onError: (e) => notifyError(e, "Не удалось сохранить товар"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => productsApi.remove(id, adminToken!),
    onSuccess: () => {
      invalidate();
      toast.success("Товар удалён");
    },
    onError: (e) => notifyError(e, "Не удалось удалить товар"),
  });

  const uploadImage = useMutation({
    mutationFn: (file: File) => productsApi.uploadImage(editing!.id, file, adminToken!),
    onSuccess: (result) => {
      invalidate();
      setEditing((prev) => (prev ? { ...prev, imageUrl: result.imageUrl } : prev));
      toast.success("Картинка загружена");
    },
    onError: (e) => notifyError(e, "Не удалось загрузить картинку"),
  });

  const removeImage = useMutation({
    mutationFn: () => productsApi.removeImage(editing!.id, adminToken!),
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
      stockQuantity: String(product.stockQuantity),
    });
    setDialogOpen(true);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    save.mutate();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {products?.length ?? 0} товаров в каталоге
        </p>
        <Button onClick={openCreate}>
          <Plus className="size-4" />
          Добавить товар
        </Button>
      </div>

      <Card className="py-0">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !products?.length ? (
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editing ? "Редактировать товар" : "Новый товар"}
              </DialogTitle>
              <DialogDescription>
                Цена задаётся в {BASE_CURRENCY} — этого требует валидатор бэкенда.
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
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="p-price">Цена, {BASE_CURRENCY}</Label>
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
                <div className="space-y-2">
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
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");

  const { data, isLoading } = useAdminOrders({
    page,
    pageSize: PAGE_SIZE,
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  const transition = useAdminOrderTransition();

  const orders = data?.orders ?? [];
  const totalCount = data?.totalCount ?? 0;
  const hasNextPage = page * PAGE_SIZE < totalCount;

  function handleStatusFilterChange(value: string) {
    setStatusFilter(value === "all" ? "all" : (Number(value) as OrderStatus));
    setPage(1);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {totalCount} заказ{totalCount === 1 ? "" : "ов"} всего — <code>GET /api/admin/orders</code>{" "}
          показывает заказы всех покупателей.
        </p>
        <Select value={String(statusFilter)} onValueChange={handleStatusFilterChange}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Статус" />
          </SelectTrigger>
          <SelectContent>
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
        <EmptyState icon={TriangleAlert} title="Заказов нет" />
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

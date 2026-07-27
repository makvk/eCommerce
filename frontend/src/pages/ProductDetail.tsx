import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Minus, PackageX, Plus, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { ProductImage } from "@/components/ProductImage";
import { useAddToCart, useProduct } from "@/hooks/queries";
import { useAuth } from "@/context/AuthContext";
import { formatDate, formatMoney } from "@/lib/format";

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { data: product, isLoading, error } = useProduct(id);
  const addToCart = useAddToCart();
  const [quantity, setQuantity] = useState(1);

  if (isLoading) {
    return (
      <div className="grid gap-10 lg:grid-cols-2">
        <Skeleton className="aspect-square w-full rounded-2xl" />
        <div className="space-y-4">
          <Skeleton className="h-9 w-2/3" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-4/5" />
          <Skeleton className="h-12 w-40" />
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <EmptyState
        icon={PackageX}
        title="Товар не найден"
        description={error ? (error as Error).message : undefined}
        action={
          <Button asChild variant="outline">
            <Link to="/">Вернуться в каталог</Link>
          </Button>
        }
      />
    );
  }

  const outOfStock = product.stockQuantity <= 0;
  const maxQuantity = Math.max(product.stockQuantity, 1);

  return (
    <div className="space-y-8">
      <Button variant="ghost" size="sm" className="-ml-2" onClick={() => navigate(-1)}>
        <ArrowLeft className="size-4" />
        Назад
      </Button>

      <div className="grid gap-10 lg:grid-cols-2">
        <ProductImage
          src={product.imageUrl}
          alt={product.name}
          seed={product.id}
          className="aspect-square w-full rounded-2xl border"
        />

        <div className="flex flex-col gap-6">
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold tracking-tight">{product.name}</h1>
            <p className="leading-relaxed text-muted-foreground">{product.description}</p>
          </div>

          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-semibold tabular-nums">
              {formatMoney(product.price)}
            </span>
            {outOfStock ? (
              <Badge
                variant="outline"
                className="border-rose-500/25 bg-rose-500/15 text-rose-400"
              >
                Нет в наличии
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="border-emerald-500/25 bg-emerald-500/15 text-emerald-400"
              >
                В наличии: {product.stockQuantity}
              </Badge>
            )}
          </div>

          <Separator />

          {!outOfStock && (
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center rounded-lg border">
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-r-none"
                  disabled={quantity <= 1}
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                >
                  <Minus className="size-4" />
                </Button>
                <span className="w-12 text-center text-sm font-medium tabular-nums">
                  {quantity}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-l-none"
                  disabled={quantity >= maxQuantity}
                  onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
                >
                  <Plus className="size-4" />
                </Button>
              </div>

              <Button
                size="lg"
                className="flex-1 sm:flex-none"
                disabled={!isAuthenticated || addToCart.isPending}
                onClick={() =>
                  addToCart.mutate({ productId: product.id, quantity })
                }
              >
                <ShoppingCart className="size-4" />
                {isAuthenticated ? "Добавить в корзину" : "Войдите, чтобы купить"}
              </Button>
            </div>
          )}

          {!isAuthenticated && (
            <p className="text-sm text-muted-foreground">
              <Link to="/login" className="text-primary underline-offset-4 hover:underline">
                Войдите
              </Link>{" "}
              или{" "}
              <Link
                to="/register"
                className="text-primary underline-offset-4 hover:underline"
              >
                зарегистрируйтесь
              </Link>
              , чтобы добавлять товары в корзину.
            </p>
          )}

          <dl className="grid grid-cols-2 gap-4 rounded-xl border p-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Добавлен</dt>
              <dd className="mt-0.5 font-medium">{formatDate(product.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Обновлён</dt>
              <dd className="mt-0.5 font-medium">{formatDate(product.lastUpdatedAt)}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}

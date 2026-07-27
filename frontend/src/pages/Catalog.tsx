import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PackageSearch, Plus, Search, ServerCrash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/EmptyState";
import { ProductImage } from "@/components/ProductImage";
import { useAddToCart, useProducts } from "@/hooks/queries";
import { useAuth } from "@/context/AuthContext";
import { formatMoney } from "@/lib/format";
import type { Product } from "@/api/types";

type SortKey = "new" | "price-asc" | "price-desc" | "name";

const SORT_LABELS: Record<SortKey, string> = {
  new: "Сначала новые",
  "price-asc": "Сначала дешёвые",
  "price-desc": "Сначала дорогие",
  name: "По названию",
};

export function CatalogPage() {
  const { data: products, isLoading, error } = useProducts();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("new");
  const [inStockOnly, setInStockOnly] = useState(false);

  // GET /api/products не умеет ни поиск, ни сортировку, ни пагинацию
  // (GetProducts.Query пустой) — поэтому всё считаем на клиенте. REVIEW.md п.6
  const visible = useMemo(() => {
    if (!products) return [];
    const q = search.trim().toLowerCase();

    const filtered = products.filter((p) => {
      if (inStockOnly && p.stockQuantity <= 0) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
      );
    });

    const sorted = [...filtered];
    switch (sort) {
      case "price-asc":
        sorted.sort((a, b) => a.price.amount - b.price.amount);
        break;
      case "price-desc":
        sorted.sort((a, b) => b.price.amount - a.price.amount);
        break;
      case "name":
        sorted.sort((a, b) => a.name.localeCompare(b.name, "ru"));
        break;
      case "new":
        sorted.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        break;
    }
    return sorted;
  }, [products, search, sort, inStockOnly]);

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Каталог</h1>
        <p className="text-muted-foreground">
          {isLoading
            ? "Загружаем товары…"
            : `${visible.length} ${plural(visible.length, "товар", "товара", "товаров")}`}
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по названию и описанию"
            className="pl-9"
          />
        </div>
        <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
          <SelectTrigger className="sm:w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(SORT_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant={inStockOnly ? "default" : "outline"}
          onClick={() => setInStockOnly((v) => !v)}
        >
          В наличии
        </Button>
      </div>

      {error ? (
        <EmptyState
          icon={ServerCrash}
          title="Каталог не загрузился"
          description={(error as Error).message}
        />
      ) : isLoading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-4/3 w-full rounded-xl" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={PackageSearch}
          title={products?.length ? "Ничего не нашлось" : "В каталоге пока пусто"}
          description={
            products?.length
              ? "Попробуйте изменить запрос или снять фильтры."
              : "Добавьте товары через админку — включите её в меню профиля."
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProductCard({ product }: { product: Product }) {
  const { isAuthenticated } = useAuth();
  const addToCart = useAddToCart();
  const outOfStock = product.stockQuantity <= 0;

  return (
    <Card className="group gap-0 overflow-hidden py-0 transition-colors hover:border-primary/40">
      <Link to={`/products/${product.id}`} className="block">
        <ProductImage
          src={product.imageUrl}
          alt={product.name}
          seed={product.id}
          className="aspect-4/3 w-full"
        />
      </Link>
      <CardContent className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex-1 space-y-1">
          <Link
            to={`/products/${product.id}`}
            className="line-clamp-1 font-medium hover:underline"
          >
            {product.name}
          </Link>
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {product.description}
          </p>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-lg font-semibold tabular-nums">
            {formatMoney(product.price)}
          </span>
          {outOfStock ? (
            <Badge variant="outline" className="border-rose-500/25 bg-rose-500/15 text-rose-400">
              Нет в наличии
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground">
              на складе {product.stockQuantity}
            </span>
          )}
        </div>

        <Button
          className="w-full"
          disabled={outOfStock || addToCart.isPending || !isAuthenticated}
          onClick={() => addToCart.mutate({ productId: product.id, quantity: 1 })}
        >
          <Plus className="size-4" />
          {isAuthenticated ? "В корзину" : "Войдите, чтобы купить"}
        </Button>
      </CardContent>
    </Card>
  );
}

function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

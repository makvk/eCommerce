import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  LogOut,
  Package,
  ReceiptText,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Store,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/context/AuthContext";
import { useCart, useProfile, notifyError } from "@/hooks/queries";
import { formatMoney, initialsOf } from "@/lib/format";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", label: "Каталог", icon: Store, end: true },
  { to: "/orders", label: "Заказы", icon: ReceiptText, end: false },
];

export function Header() {
  const { isAuthenticated, isAdmin, email, logout, enableAdmin, disableAdmin } = useAuth();
  const navigate = useNavigate();
  const { data: cart } = useCart();
  const { data: profile } = useProfile();

  const itemCount = cart?.cart.items.reduce((sum, i) => sum + i.quantity, 0) ?? 0;

  async function handleAdminToggle() {
    if (isAdmin) {
      disableAdmin();
      toast.info("Режим администратора выключен");
      return;
    }
    try {
      await enableAdmin();
      toast.success("Режим администратора включён");
      navigate("/admin");
    } catch (e) {
      notifyError(e, "Не удалось получить admin-токен. Бэкенд собран в Release?");
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
        <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ShoppingBag className="size-4" />
          </div>
          <span className="hidden sm:inline">Store</span>
        </Link>

        <Separator orientation="vertical" className="hidden h-6 sm:block" />

        <nav className="flex items-center gap-1">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}>
              {({ isActive }) => (
                <span
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="size-4" />
                  <span className="hidden sm:inline">{label}</span>
                </span>
              )}
            </NavLink>
          ))}
          {isAdmin && (
            <NavLink to="/admin">
              {({ isActive }) => (
                <span
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Package className="size-4" />
                  <span className="hidden sm:inline">Админка</span>
                </span>
              )}
            </NavLink>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {isAuthenticated && profile && (
            <span className="hidden rounded-md bg-muted px-2.5 py-1 text-sm font-medium tabular-nums md:inline">
              {formatMoney(profile.balance)}
            </span>
          )}

          <Button asChild variant="ghost" size="icon" className="relative">
            <Link to="/cart" aria-label="Корзина">
              <ShoppingCart className="size-5" />
              {itemCount > 0 && (
                <Badge className="absolute -right-1 -top-1 size-5 justify-center rounded-full p-0 text-[10px] tabular-nums">
                  {itemCount > 99 ? "99+" : itemCount}
                </Badge>
              )}
            </Link>
          </Button>

          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar className="size-8">
                    <AvatarFallback className="text-xs">
                      {profile ? initialsOf(profile.name) : <User className="size-4" />}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel className="font-normal">
                  <p className="truncate text-sm font-medium">
                    {profile
                      ? `${profile.name.firstName} ${profile.name.lastName}`
                      : "Профиль"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => navigate("/profile")}>
                  <User className="size-4" />
                  Профиль и баланс
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => navigate("/orders")}>
                  <ReceiptText className="size-4" />
                  Мои заказы
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={handleAdminToggle}>
                  <ShieldCheck className="size-4" />
                  {isAdmin ? "Выключить админку" : "Войти как админ"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={logout}>
                  <LogOut className="size-4" />
                  Выйти
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" size="sm">
                <Link to="/login">Войти</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/register">Регистрация</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

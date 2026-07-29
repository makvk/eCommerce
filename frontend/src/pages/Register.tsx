import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { notifyError } from "@/hooks/queries";
import { ApiError } from "@/api/client";
import { AuthShell } from "@/pages/Login";

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    middleName: "",
    email: "",
    password: "",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);

  function update(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFieldErrors({});
    setPending(true);
    try {
      await register(form.email, form.password, {
        firstName: form.firstName,
        lastName: form.lastName,
        // MiddleName в БД nullable, но record FullName требует string —
        // шлём пустую строку, иначе EF ругнётся на null
        middleName: form.middleName,
      });
      toast.success("Аккаунт создан");
      navigate("/", { replace: true });
    } catch (error) {
      if (error instanceof ApiError && error.fieldErrors) {
        const mapped: Record<string, string> = {};
        for (const [key, messages] of Object.entries(error.fieldErrors)) {
          const field = key.split(".").pop();
          if (field) mapped[field.charAt(0).toLowerCase() + field.slice(1)] = messages[0];
        }
        setFieldErrors(mapped);
      }
      notifyError(error, "Не удалось зарегистрироваться");
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthShell
      title="Регистрация"
      subtitle="Создайте аккаунт — это займёт полминуты."
      footer={
        <>
          Уже есть аккаунт?{" "}
          <Link to="/login" className="text-primary underline-offset-4 hover:underline">
            Войти
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="lastName">Фамилия</Label>
            <Input
              id="lastName"
              required
              maxLength={50}
              value={form.lastName}
              onChange={(e) => update("lastName", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="firstName">Имя</Label>
            <Input
              id="firstName"
              required
              maxLength={50}
              value={form.firstName}
              onChange={(e) => update("firstName", e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="middleName">
            Отчество <span className="text-muted-foreground">(необязательно)</span>
          </Label>
          <Input
            id="middleName"
            maxLength={50}
            value={form.middleName}
            onChange={(e) => update("middleName", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            maxLength={150}
            value={form.email}
            aria-invalid={Boolean(fieldErrors.email)}
            onChange={(e) => update("email", e.target.value)}
            placeholder="you@example.com"
          />
          {fieldErrors.email && (
            <p className="text-xs text-destructive">{fieldErrors.email}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Пароль</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={form.password}
            aria-invalid={Boolean(fieldErrors.password)}
            onChange={(e) => update("password", e.target.value)}
            placeholder="Минимум 8 символов"
          />
          {fieldErrors.password && (
            <p className="text-xs text-destructive">{fieldErrors.password}</p>
          )}
        </div>

        <Button type="submit" className="w-full" size="lg" disabled={pending}>
          {pending ? "Создаём аккаунт…" : "Зарегистрироваться"}
        </Button>

        <p className="text-xs text-muted-foreground">
          Баланс нового аккаунта — 0 ₽. Пополнить его можно в профиле после входа.
        </p>
      </form>
    </AuthShell>
  );
}

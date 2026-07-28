/**
 * Мок бэкенда для разработки фронта без Postgres/Redis/dotnet.
 * Повторяет контракты ECommerce.Api один-в-один, включая формат ошибок.
 * Данные живут в памяти и сбрасываются при перезапуске.
 *
 *   node mock-server.mjs        → http://localhost:5269
 *
 * Это НЕ замена настоящему API: логика упрощена, авторизация фейковая.
 */
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";

const PORT = Number(process.env.MOCK_PORT ?? 5269);

/* ─────────────────────────── данные ─────────────────────────── */

const now = () => new Date().toISOString();

const products = [
  ["Механическая клавиатура Aurora", "75% раскладка, свитчи с тактильным откликом, hot-swap и алюминиевый корпус.", 12990, 14],
  ["Наушники Vellum ANC", "Беспроводные, активное шумоподавление, 40 часов автономности.", 18490, 7],
  ["Монитор Nord 27\" 4K", "IPS-матрица, 144 Гц, покрытие DCI-P3 98%, USB-C с зарядкой 90 Вт.", 54900, 3],
  ["Мышь Slate Pro", "Лёгкая, 54 грамма, сенсор 26 000 DPI, беспроводная зарядка.", 7490, 22],
  ["Веб-камера Lumen 4K", "Автофокус, HDR, два микрофона с шумоподавлением.", 9990, 0],
  ["Док-станция Harbor 12-в-1", "Два HDMI 4K60, Ethernet, картридер, Power Delivery 100 Вт.", 15900, 9],
  ["Коврик Desk Mat XL", "900×400 мм, прошитые края, водоотталкивающее покрытие.", 2490, 41],
  ["Подставка Arc Stand", "Алюминий, регулировка высоты и угла, под ноутбуки до 16\".", 5990, 16],
].map(([name, description, amount, stockQuantity]) => ({
  id: randomUUID(),
  name,
  description,
  price: { currency: "RUB", amount },
  stockQuantity,
  imageUrl: null,
  createdAt: now(),
  lastUpdatedAt: now(),
}));

/** email → { id, email, password, name, balance } */
const customers = new Map();
/** userId → [{ productId, productName, quantity, price, imageUrl }] */
const carts = new Map();
/** orderId → order */
const orders = new Map();

const RATES = { RUB: 1, USD: 92.5, EUR: 100.2, KZT: 0.19 };

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

function convert(money, currency) {
  if (money.currency === currency) return { ...money };
  const inRub = money.amount * RATES[money.currency];
  return { currency, amount: Math.round((inRub / RATES[currency]) * 100) / 100 };
}

/* ──────────────────────── псевдо-JWT ─────────────────────────── */

const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url");

function makeToken(userId, role, email) {
  const payload = {
    "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier": userId,
    "http://schemas.microsoft.com/ws/2008/06/identity/claims/role": role,
    "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress": email,
    exp: Math.floor(Date.now() / 1000) + 3600,
  };
  return `${b64({ alg: "none", typ: "JWT" })}.${b64(payload)}.mock`;
}

function readToken(req) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(header.slice(7).split(".")[1], "base64url").toString(),
    );
    return {
      userId: payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"],
      role: payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"],
      email: payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"],
    };
  } catch {
    return null;
  }
}

/* ──────────────────────── ответы/ошибки ──────────────────────── */

function json(res, status, body) {
  const text = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(text);
}

const noContent = (res) => {
  res.writeHead(204, { "Access-Control-Allow-Origin": "*" });
  res.end();
};

const STATUS_TITLE = {
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  409: "Conflict",
  503: "Service Unavailable",
  500: "Internal Server Error",
};

/** Тот же формат ProblemDetails, что у ExceptionHandlingMiddleware.HandleExceptionAsync. Дефолт — 404, т.к. большинство доменных ошибок здесь это NotFoundException. */
const fail = (res, message, status = 404) =>
  json(res, status, {
    title: STATUS_TITLE[status] ?? "Error",
    status,
    detail: message,
  });

/** Тот же формат, что у HandleValidationExceptionAsync */
const invalid = (res, errors) =>
  json(res, 400, {
    type: "https://tools.ietf.org/html/rfc9110#section-15.5.1",
    title: "One or more validation errors occurred.",
    status: 400,
    errors,
  });

function readBody(req) {
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    });
  });
}

function readRawBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

/** Мини-парсер multipart/form-data — только для загрузки картинки товара, без внешних зависимостей. */
function parseMultipart(buffer, contentType) {
  const boundaryMatch = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType ?? "");
  const boundary = boundaryMatch?.[1] ?? boundaryMatch?.[2];
  const fields = {};
  const files = {};
  if (!boundary) return { fields, files };

  const boundaryBuf = Buffer.from(`--${boundary}`);
  let start = buffer.indexOf(boundaryBuf) + boundaryBuf.length;
  while (start > boundaryBuf.length - 1) {
    const nextBoundary = buffer.indexOf(boundaryBuf, start);
    if (nextBoundary === -1) break;
    let part = buffer.subarray(start, nextBoundary);
    if (part.subarray(0, 2).toString() === "\r\n") part = part.subarray(2);
    if (part.subarray(-2).toString() === "\r\n") part = part.subarray(0, -2);

    const headerEnd = part.indexOf("\r\n\r\n");
    if (headerEnd !== -1) {
      const headerStr = part.subarray(0, headerEnd).toString("utf8");
      const content = part.subarray(headerEnd + 4);
      const nameMatch = /name="([^"]+)"/i.exec(headerStr);
      const filenameMatch = /filename="([^"]*)"/i.exec(headerStr);
      const contentTypeMatch = /Content-Type:\s*([^\r\n]+)/i.exec(headerStr);

      if (nameMatch) {
        if (filenameMatch) {
          files[nameMatch[1]] = {
            filename: filenameMatch[1],
            contentType: contentTypeMatch?.[1]?.trim() ?? "application/octet-stream",
            data: content,
          };
        } else {
          fields[nameMatch[1]] = content.toString("utf8");
        }
      }
    }

    start = nextBoundary + boundaryBuf.length;
    if (buffer.subarray(start, start + 2).toString() === "--") break;
  }
  return { fields, files };
}

/* ─────────────────────────── роутинг ─────────────────────────── */

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;
  const method = req.method ?? "GET";

  if (method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type,Authorization",
    });
    return res.end();
  }

  const auth = readToken(req);
  const isMultipart = (req.headers["content-type"] ?? "").startsWith("multipart/form-data");
  let body = {};
  let multipart = null;
  if (["POST", "PUT", "PATCH"].includes(method)) {
    if (isMultipart) multipart = parseMultipart(await readRawBody(req), req.headers["content-type"]);
    else body = await readBody(req);
  }
  const requireAuth = () => {
    if (!auth) {
      res.writeHead(401, { "Access-Control-Allow-Origin": "*" });
      res.end();
      return false;
    }
    return true;
  };

  /** Как настоящий Authorization middleware: 401 без токена, 403 при недостатке роли — оба пустые. */
  const requireAdmin = () => {
    if (!requireAuth()) return false;
    if (auth.role !== "Admin") {
      res.writeHead(403, { "Access-Control-Allow-Origin": "*" });
      res.end();
      return false;
    }
    return true;
  };

  /* health / dev */
  if (path === "/health") return json(res, 200, { status: "ok", message: "ok" });
  if (path === "/get-test-admin-token")
    return json(res, 200, { token: makeToken("00000000-0000-0000-0000-000000000000", "Admin", "test-admin") });

  /* auth */
  if (path === "/api/auth/register" && method === "POST") {
    const u = body.user ?? {};
    const errors = {};
    if (!u.email) errors["User.Email"] = ["'Email' must not be empty."];
    if (!u.password || u.password.length < 8)
      errors["User.Password"] = ["'Password' must be at least 8 characters."];
    if (Object.keys(errors).length) return invalid(res, errors);
    if (customers.has(u.email)) return fail(res, "Email already exists", 400);

    const customer = {
      id: randomUUID(),
      email: u.email,
      password: u.password,
      name: u.fullName ?? { firstName: "", lastName: "", middleName: "" },
      // Настоящий бэк выдаёт 0 — здесь даём стартовый баланс, чтобы флоу заказа было видно
      balance: { currency: "RUB", amount: 150000 },
    };
    customers.set(u.email, customer);
    return json(res, 200, { token: makeToken(customer.id, "Customer", customer.email) });
  }

  if (path === "/api/auth/login" && method === "POST") {
    const u = body.user ?? {};
    const errors = {};
    if (!u.email) errors["User.Email"] = ["Email is required"];
    if (!u.password) errors["User.Password"] = ["Password is required"];
    if (Object.keys(errors).length) return invalid(res, errors);

    const customer = customers.get(u.email);
    // Одно сообщение на оба случая — не палим, зарегистрирован ли email (см. Login.Handler)
    if (!customer || customer.password !== u.password)
      return fail(res, "Invalid email or password", 401);
    return json(res, 200, { token: makeToken(customer.id, "Customer", customer.email) });
  }

  /* products */
  if (path === "/api/products" && method === "GET") return json(res, 200, products);

  if (path === "/api/products" && method === "POST") {
    if (!requireAdmin()) return;
    const product = {
      id: randomUUID(),
      name: body.name,
      description: body.description,
      price: body.price,
      stockQuantity: body.stockQuantity,
      imageUrl: null,
      createdAt: now(),
      lastUpdatedAt: now(),
    };
    products.unshift(product);
    return json(res, 201, product.id);
  }

  const productImageMatch = path.match(/^\/api\/products\/([\w-]+)\/image$/);
  if (productImageMatch) {
    if (!requireAdmin()) return;
    const index = products.findIndex((p) => p.id === productImageMatch[1]);
    if (index === -1) return fail(res, "Product not found");

    if (method === "PUT") {
      const file = multipart?.files?.file;
      if (!file || !file.data.length) return fail(res, "File is empty", 400);
      if (!ALLOWED_IMAGE_TYPES.includes(file.contentType))
        return invalid(res, { ContentType: ["Unsupported image type. Allowed: jpeg, png, webp"] });
      if (file.data.length > MAX_IMAGE_SIZE_BYTES)
        return invalid(res, { ContentLength: [`Image must be between 1 byte and ${MAX_IMAGE_SIZE_BYTES / 1024 / 1024} MB`] });

      // Настоящий бэк грузит файл в MinIO и отдаёт публичный http(s)-URL;
      // мок хранит всё в памяти, поэтому кладём картинку прямо в data:-URL.
      const imageUrl = `data:${file.contentType};base64,${file.data.toString("base64")}`;
      products[index] = { ...products[index], imageUrl, lastUpdatedAt: now() };
      return json(res, 200, { imageUrl });
    }
    if (method === "DELETE") {
      products[index] = { ...products[index], imageUrl: null, lastUpdatedAt: now() };
      return noContent(res);
    }
  }

  const productMatch = path.match(/^\/api\/products\/([\w-]+)$/);
  if (productMatch) {
    const index = products.findIndex((p) => p.id === productMatch[1]);
    if (method === "GET")
      return index === -1
        ? fail(res, `Product with id ${productMatch[1]} was not found.`)
        : json(res, 200, products[index]);
    if (!requireAdmin()) return;
    if (index === -1) return fail(res, "Product not found");
    if (method === "PUT") {
      products[index] = { ...products[index], ...body, lastUpdatedAt: now() };
      return noContent(res);
    }
    if (method === "DELETE") {
      products.splice(index, 1);
      return noContent(res);
    }
  }

  /* cart */
  if (path === "/api/cart") {
    if (!requireAuth()) return;
    const customer = [...customers.values()].find((c) => c.id === auth.userId);
    const currency = customer?.balance.currency ?? "RUB";
    const items = carts.get(auth.userId) ?? [];

    if (method === "GET") {
      const amount = items.reduce(
        (sum, i) => sum + convert(i.price, currency).amount * i.quantity,
        0,
      );
      return json(res, 200, {
        cart: { items },
        money: { currency, amount: Math.round(amount * 100) / 100 },
      });
    }
    if (method === "DELETE") {
      carts.delete(auth.userId);
      return noContent(res);
    }
  }

  if (path === "/api/cart/items") {
    if (!requireAuth()) return;
    const items = carts.get(auth.userId) ?? [];

    if (method === "POST") {
      const product = products.find((p) => p.id === body.productId);
      if (!product) return fail(res, "Product not found");
      if (body.quantity > product.stockQuantity)
        return fail(res, "Quantity greater than stock quantity", 400);

      const existing = items.find((i) => i.productId === body.productId);
      if (existing) existing.quantity += body.quantity;
      else
        items.push({
          productId: product.id,
          productName: product.name,
          quantity: body.quantity,
          price: product.price,
          imageUrl: product.imageUrl,
        });
      carts.set(auth.userId, items);
      return noContent(res);
    }

    if (method === "PATCH") {
      const item = items.find((i) => i.productId === body.productId);
      if (!item) return fail(res, "Cart item not found");
      const product = products.find((p) => p.id === body.productId);
      const next = item.quantity + body.delta;
      if (next <= 0) items.splice(items.indexOf(item), 1);
      else if (product && next > product.stockQuantity)
        return fail(res, "Quantity exceeds stock quantity", 400);
      else item.quantity = next;
      carts.set(auth.userId, items);
      return noContent(res);
    }
  }

  const cartItemMatch = path.match(/^\/api\/cart\/items\/([\w-]+)$/);
  if (cartItemMatch && method === "DELETE") {
    if (!requireAuth()) return;
    const items = carts.get(auth.userId) ?? [];
    const index = items.findIndex((i) => i.productId === cartItemMatch[1]);
    if (index === -1) return fail(res, "Cart item not found");
    items.splice(index, 1);
    carts.set(auth.userId, items);
    return noContent(res);
  }

  /* orders */
  if (path === "/api/orders") {
    if (!requireAuth()) return;

    if (method === "GET") {
      const list = [...orders.values()]
        .filter((o) => o.customerId === auth.userId)
        .map((o) => ({
          orderId: o.id,
          status: o.status,
          items: o.items,
          totalPrice: o.totalPrice,
        }));
      return json(res, 200, { orders: list });
    }

    if (method === "POST") {
      const address = body.address ?? {};
      const errors = {};
      for (const field of ["Country", "City", "Street", "PostalCode"]) {
        const key = field.charAt(0).toLowerCase() + field.slice(1);
        if (!address[key]) errors[`Address.${field}`] = [`'${field}' must not be empty.`];
      }
      if (Object.keys(errors).length) return invalid(res, errors);

      const customer = [...customers.values()].find((c) => c.id === auth.userId);
      const items = carts.get(auth.userId) ?? [];
      if (!customer || items.length === 0) return fail(res, "Cart is empty", 400);

      const currency = customer.balance.currency;
      let amount = 0;
      const orderItems = [];
      for (const item of items) {
        const product = products.find((p) => p.id === item.productId);
        if (!product || product.stockQuantity < item.quantity)
          return fail(res, `Current quantity ${item.quantity} is less than stock quantity`, 400);
        const price = convert(item.price, currency);
        product.stockQuantity -= item.quantity;
        amount += price.amount * item.quantity;
        orderItems.push({
          productId: item.productId,
          title: item.productName,
          quantity: item.quantity,
          price,
        });
      }
      amount = Math.round(amount * 100) / 100;
      if (amount > customer.balance.amount)
        return fail(res, `Amount ${amount} is greater than current amount`, 400);

      customer.balance.amount = Math.round((customer.balance.amount - amount) * 100) / 100;

      const order = {
        id: randomUUID(),
        customerId: auth.userId,
        items: orderItems,
        totalPrice: { currency, amount },
        address,
        status: 0,
        createdAt: now(),
        lastUpdatedAt: now(),
      };
      orders.set(order.id, order);
      carts.delete(auth.userId);
      return json(res, 201, { orderId: order.id });
    }
  }

  // Заказы конкретного покупателя — как GetOrderById/CancelOrder, скоуп по CustomerId.
  const orderMatch = path.match(/^\/api\/orders\/([\w-]+)(?:\/(cancel))?$/);
  if (orderMatch) {
    if (!requireAuth()) return;
    const order = orders.get(orderMatch[1]);
    // Чужой заказ не отличаем от несуществующего — ровно как настоящий бэкенд
    if (!order || order.customerId !== auth.userId) return fail(res, "Order not found", 404);
    const action = orderMatch[2];

    if (method === "GET" && !action) return json(res, 200, order);

    if (method === "PATCH" && action === "cancel") {
      if (order.status === 3 || order.status === 4)
        return fail(res, "Cannot cancel order", 400);
      const customer = [...customers.values()].find((c) => c.id === order.customerId);
      if (customer) {
        const refund = convert(order.totalPrice, customer.balance.currency);
        customer.balance.amount = Math.round((customer.balance.amount + refund.amount) * 100) / 100;
      }
      for (const item of order.items) {
        const product = products.find((p) => p.id === item.productId);
        if (product) product.stockQuantity += item.quantity;
      }
      order.status = 4;
      order.lastUpdatedAt = now();
      return noContent(res);
    }
  }

  /* orders (admin) — без привязки к CustomerId, как AdminOrdersController */
  if (path === "/api/admin/orders" && method === "GET") {
    if (!requireAdmin()) return;

    const customerIdFilter = url.searchParams.get("customerId");
    const statusFilter = url.searchParams.get("status");
    const page = Math.max(1, Number(url.searchParams.get("page") ?? 1) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get("pageSize") ?? 20) || 20));

    let list = [...orders.values()];
    if (customerIdFilter) list = list.filter((o) => o.customerId === customerIdFilter);
    if (statusFilter !== null && statusFilter !== "")
      list = list.filter((o) => String(o.status) === statusFilter);

    list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    const totalCount = list.length;
    const paged = list.slice((page - 1) * pageSize, page * pageSize).map((o) => ({
      orderId: o.id,
      customerId: o.customerId,
      status: o.status,
      items: o.items,
      totalPrice: o.totalPrice,
      createdAt: o.createdAt,
      lastUpdatedAt: o.lastUpdatedAt,
    }));

    return json(res, 200, { orders: paged, totalCount, page, pageSize });
  }

  const adminOrderMatch = path.match(
    /^\/api\/admin\/orders\/([\w-]+)(?:\/(processing|shipped|delivered))?$/,
  );
  if (adminOrderMatch) {
    if (!requireAdmin()) return;
    const order = orders.get(adminOrderMatch[1]);
    if (!order) return fail(res, "Order not found", 404);
    const action = adminOrderMatch[2];

    if (method === "GET" && !action) return json(res, 200, order);

    if (method === "PATCH" && action) {
      const required = { processing: 0, shipped: 1, delivered: 2 }[action];
      const target = { processing: 1, shipped: 2, delivered: 3 }[action];
      if (order.status !== required) return fail(res, `Cannot set status to ${action}`, 400);
      order.status = target;
      order.lastUpdatedAt = now();
      return noContent(res);
    }
  }

  /* profile */
  if (path === "/api/profile" && method === "GET") {
    if (!requireAuth()) return;
    const customer = [...customers.values()].find((c) => c.id === auth.userId);
    if (!customer) return fail(res, "Customer not found");
    return json(res, 200, {
      email: customer.email,
      balance: customer.balance,
      name: customer.name,
    });
  }

  if (path === "/api/profile/change-currency" && method === "PATCH") {
    if (!requireAuth()) return;
    const customer = [...customers.values()].find((c) => c.id === auth.userId);
    if (!customer) return fail(res, "User not found");
    if (!RATES[body.newCurrency])
      return invalid(res, { NewCurrency: ["Currency not supported"] });
    customer.balance = convert(customer.balance, body.newCurrency);
    return noContent(res);
  }

  fail(res, `Route not found: ${method} ${path}`, 404);
});

server.listen(PORT, () => {
  console.log(`[mock] ECommerce API работает на http://localhost:${PORT}`);
  console.log(`[mock] Зарегистрируйте любой аккаунт — стартовый баланс 150 000 ₽`);
});

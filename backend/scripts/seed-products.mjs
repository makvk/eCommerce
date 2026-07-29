#!/usr/bin/env node
/**
 * Seed catalog products and attach images (downloaded from Unsplash, uploaded to MinIO via API).
 * Usage: node scripts/seed-products.mjs [API_BASE]
 */
import { randomUUID } from "node:crypto";
import { writeFile, unlink, mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { Blob } from "node:buffer";

const API = process.argv[2] ?? "http://localhost:5269";
const TMP = join(tmpdir(), `ecommerce-seed-${randomUUID()}`);

/** @type {{ name: string, description: string, amount: number, stock: number, image: string }[]} */
const CATALOG = [
  {
    name: "Клавиатура Aurora 75%",
    description: "Механическая клавиатура, hot-swap, алюминиевый корпус, тактильные свитчи.",
    amount: 12990,
    stock: 14,
    image: "https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?auto=format&fit=crop&w=800&q=80",
  },
  {
    name: "Наушники Vellum ANC",
    description: "Беспроводные наушники с активным шумоподавлением и 40 часами автономности.",
    amount: 18490,
    stock: 7,
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80",
  },
  {
    name: "Монитор Nord 27 4K",
    description: "IPS 27\", 144 Гц, покрытие DCI-P3 98%, USB-C зарядка 90 Вт.",
    amount: 54900,
    stock: 3,
    image: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=800&q=80",
  },
  {
    name: "Мышь Slate Pro",
    description: "Лёгкая беспроводная мышь 54 г, сенсор 26 000 DPI, зарядка.",
    amount: 7490,
    stock: 22,
    image: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=800&q=80",
  },
  {
    name: "Веб-камера Lumen 4K",
    description: "Автофокус, HDR, два микрофона с шумоподавлением.",
    amount: 9990,
    stock: 11,
    image: "https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?auto=format&fit=crop&w=800&q=80",
  },
  {
    name: "Док-станция Harbor 12в1",
    description: "Два HDMI 4K60, Ethernet, картридер, Power Delivery 100 Вт.",
    amount: 15900,
    stock: 9,
    image: "https://images.unsplash.com/photo-1625948515291-69613efd103f?auto=format&fit=crop&w=800&q=80",
  },
  {
    name: "Коврик Desk Mat XL",
    description: "900×400 мм, прошитые края, водоотталкивающее покрытие.",
    amount: 2490,
    stock: 41,
    image: "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&w=800&q=80",
  },
  {
    name: "Подставка Arc Stand",
    description: "Алюминиевая подставка с регулировкой высоты под ноутбуки до 16\".",
    amount: 5990,
    stock: 16,
    image: "https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?auto=format&fit=crop&w=800&q=80",
  },
  {
    name: "SSD Nova 2TB NVMe",
    description: "PCIe 4.0, до 7000 МБ/с, радиатор в комплекте.",
    amount: 14990,
    stock: 18,
    image: "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?auto=format&fit=crop&w=800&q=80",
  },
  {
    name: "Колонка Pulse Mini",
    description: "Портативная Bluetooth-колонка, IPX7, 12 часов звука.",
    amount: 4590,
    stock: 25,
    image: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=800&q=80",
  },
  {
    name: "Зарядка Volt 65W GaN",
    description: "Компактное зарядное устройство GaN, 2×USB-C + USB-A.",
    amount: 3990,
    stock: 33,
    image: "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=800&q=80",
  },
  {
    name: "Рюкзак Transit Day",
    description: "Городской рюкзак 20 л с отделением под ноутбук 16\".",
    amount: 6790,
    stock: 12,
    image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80",
  },
];

async function api(path, { method = "GET", token, body, formData } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: formData ?? (body !== undefined ? JSON.stringify(body) : undefined),
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : undefined;
  } catch {
    data = text;
  }
  if (!res.ok) {
    throw new Error(`${method} ${path} → ${res.status}: ${text}`);
  }
  return data;
}

async function downloadImage(url, destPath) {
  const res = await fetch(url, {
    headers: { "User-Agent": "ECommerceStore-seed/1.0" },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`download ${url} → ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const type = res.headers.get("content-type") ?? "image/jpeg";
  await writeFile(destPath, buf);
  return { path: destPath, type: type.split(";")[0].trim(), size: buf.length };
}

async function main() {
  await mkdir(TMP, { recursive: true });
  console.log(`API: ${API}`);

  const { token } = await api("/get-test-admin-token");
  console.log("admin token ok");

  // Remove leftover seed-test product if present
  const existing = await api("/api/admin/products?pageSize=100", { token });
  for (const p of existing.products ?? []) {
    if (p.name === "Seed Test") {
      await api(`/api/admin/products/${p.id}`, { method: "DELETE", token });
      console.log("removed Seed Test");
    }
  }

  const created = [];
  for (const item of CATALOG) {
    const already = (existing.products ?? []).find((p) => p.name === item.name);
    if (already) {
      console.log(`skip create (exists): ${item.name}`);
      created.push({ id: already.id, ...item });
      continue;
    }
    const id = await api("/api/admin/products", {
      method: "POST",
      token,
      body: {
        name: item.name,
        description: item.description,
        price: { currency: "RUB", amount: item.amount },
        stockQuantity: item.stock,
      },
    });
    const productId = typeof id === "string" ? id : String(id).replaceAll('"', "");
    console.log(`created: ${item.name} (${productId})`);
    created.push({ id: productId, ...item });
  }

  // Also attach images to older products that still have null imageUrl
  const refreshed = await api("/api/admin/products?pageSize=100", { token });
  const needImage = (refreshed.products ?? []).filter((p) => !p.imageUrl);
  const byName = Object.fromEntries(CATALOG.map((c) => [c.name, c]));

  const fallbacks = [
    "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1593640408182-31c70c8268f5?auto=format&fit=crop&w=800&q=80",
  ];

  let i = 0;
  for (const p of needImage) {
    const catalogItem = byName[p.name] ?? created.find((c) => c.id === p.id);
    const imageUrl = catalogItem?.image ?? fallbacks[i % fallbacks.length];
    i += 1;
    const filePath = join(TMP, `${p.id}.jpg`);
    try {
      const img = await downloadImage(imageUrl, filePath);
      const bytes = await readFile(filePath);
      const form = new FormData();
      const contentType = img.type.startsWith("image/") ? img.type : "image/jpeg";
      form.append("file", new Blob([bytes], { type: contentType }), `${p.id}.jpg`);
      const result = await api(`/api/admin/products/${p.id}/image`, {
        method: "PUT",
        token,
        formData: form,
      });
      console.log(`image ok: ${p.name} → ${result.imageUrl}`);
    } catch (err) {
      console.error(`image fail: ${p.name}:`, err.message);
    } finally {
      await unlink(filePath).catch(() => {});
    }
  }

  const final = await api("/api/products?pageSize=100");
  console.log(`\nDone. Catalog now has ${final.totalCount} products.`);
  const withImages = (final.products ?? []).filter((p) => p.imageUrl).length;
  console.log(`With images: ${withImages}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

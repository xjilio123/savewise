import { expect, test } from "@playwright/test";

test.describe("PWA instalable", () => {
  test("el manifest describe la app para instalarla", async ({ request }) => {
    const respuesta = await request.get("/manifest.webmanifest", { maxRedirects: 0 });
    expect(respuesta.status()).toBe(200);
    const manifest = await respuesta.json();
    expect(manifest).toMatchObject({ name: "SaveWise", display: "standalone", start_url: "/" });
    expect(manifest.icons).toHaveLength(3);
  });

  test("el service worker se sirve sin caché y sin pasar por el login", async ({ request }) => {
    const respuesta = await request.get("/sw.js", { maxRedirects: 0 });
    expect(respuesta.status()).toBe(200);
    expect(respuesta.headers()["content-type"]).toContain("javascript");
    expect(respuesta.headers()["cache-control"]).toContain("no-store");
    expect(await respuesta.text()).toContain("NO guarda páginas ni datos financieros");
  });

  test("los íconos están disponibles", async ({ request }) => {
    for (const ruta of ["/iconos/icono-192.png", "/iconos/icono-512.png", "/apple-icon.png"]) {
      const respuesta = await request.get(ruta, { maxRedirects: 0 });
      expect(respuesta.status(), ruta).toBe(200);
      expect(respuesta.headers()["content-type"]).toBe("image/png");
    }
  });

  test("la pantalla sin conexión es pública y no tiene datos", async ({ page }) => {
    await page.goto("/offline");
    await expect(page.getByRole("heading", { name: "Sin conexión" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Reintentar" })).toHaveAttribute("href", "/");
  });
});

test.describe("Endpoint del Atajo de Siri", () => {
  test("rechaza peticiones sin token", async ({ request }) => {
    const respuesta = await request.post("/api/atajo", { data: { monto: 10, concepto: "Café" } });
    expect(respuesta.status()).toBe(401);
  });

  test("rechaza tokens con formato inválido sin consultar la base", async ({ request }) => {
    for (const authorization of ["Bearer corto", "Basic abc", "Bearer ' OR 1=1 --"]) {
      const respuesta = await request.post("/api/atajo", { headers: { authorization }, data: { monto: 10, concepto: "x" } });
      expect(respuesta.status(), authorization).toBe(401);
    }
  });

  test("rechaza cuerpos inválidos o demasiado grandes", async ({ request }) => {
    const authorization = `Bearer ${"a".repeat(43)}`;
    const noJson = await request.post("/api/atajo", { headers: { authorization }, data: "no es json" });
    expect(noJson.status()).toBe(400);
    const montoMalo = await request.post("/api/atajo", { headers: { authorization }, data: { monto: -5, concepto: "x" } });
    expect(montoMalo.status()).toBe(400);
    const grande = await request.post("/api/atajo", { headers: { authorization }, data: { monto: 1, concepto: "x".repeat(5000) } });
    expect(grande.status()).toBe(413);
  });

  test("no acepta GET", async ({ request }) => {
    expect((await request.get("/api/atajo")).status()).toBe(405);
  });
});

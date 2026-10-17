import { expect, test } from "@playwright/test";

const RUTAS_PRIVADAS = [
  "/",
  "/historial",
  "/historial?tipo=GASTO&pagina=2",
  "/historial/00000000-0000-0000-0000-000000000000",
  "/agregar",
  "/ahorros",
  "/para-mi",
  "/dashboard",
  "/dashboard?vista=anio",
  "/ajustes",
  "/bienvenida",
  "/categorias",
  "/deudas",
  "/agregar?tipo=GASTO&deuda=00000000-0000-0000-0000-000000000000",
  "/api/exportar",
  "/api/respaldo",
];

test.describe("Sin sesión no se ve nada privado", () => {
  for (const ruta of RUTAS_PRIVADAS) {
    test(`${ruta} redirige al login`, async ({ request }) => {
      const respuesta = await request.get(ruta, { maxRedirects: 0 });
      expect(respuesta.status()).toBe(307);
      expect(new URL(respuesta.headers().location!, "http://localhost").pathname).toBe("/login");
    });
  }

  test("la vitrina de datos ficticios no existe en producción", async ({ request }) => {
    const respuesta = await request.get("/vitrina?p=inicio", { maxRedirects: 0 });
    expect(respuesta.status()).toBe(307);
  });
});

test.describe("Cabeceras de seguridad", () => {
  test("el login envía CSP estricta y cabeceras de protección", async ({ request }) => {
    const respuesta = await request.get("/login");
    const h = respuesta.headers();
    const csp = h["content-security-policy"] ?? "";

    expect(csp).toMatch(/script-src 'self' 'nonce-[A-Za-z0-9+/=]+' 'strict-dynamic'/);
    expect(csp).not.toContain("unsafe-eval");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(h["x-frame-options"]).toBe("DENY");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["strict-transport-security"]).toContain("max-age=63072000");
    expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(h["x-powered-by"]).toBeUndefined();
  });

  test("cada request recibe un nonce distinto", async ({ request }) => {
    const nonce = async () =>
      (await request.get("/login")).headers()["content-security-policy"]?.match(/nonce-([^']+)/)?.[1];
    expect(await nonce()).not.toBe(await nonce());
  });

  test("todos los scripts de la página llevan nonce y no hay errores de CSP", async ({ page }) => {
    const errores: string[] = [];
    page.on("console", (m) => m.type() === "error" && errores.push(m.text()));
    await page.goto("/login");

    await expect(page.getByRole("button", { name: "Continuar con Google" })).toBeVisible();
    const sinNonce = await page.locator("script:not([nonce])").count();
    expect(sinNonce).toBe(0);
    expect(errores).toEqual([]);
  });
});

test.describe("Cron diario", () => {
  test("rechaza llamadas sin el secreto", async ({ request }) => {
    expect((await request.get("/api/cron/diario")).status()).toBe(401);
  });

  test("rechaza un secreto incorrecto", async ({ request }) => {
    const respuesta = await request.get("/api/cron/diario", { headers: { authorization: "Bearer adivinanza" } });
    expect(respuesta.status()).toBe(401);
  });
});

test.describe("Tema claro / oscuro", () => {
  test("la cookie del tema fija la apariencia", async ({ page, context }) => {
    await context.addCookies([{ name: "tema", value: "oscuro", url: "http://localhost:3000" }]);
    await page.goto("/login");
    await expect(page.locator("html")).toHaveAttribute("data-tema", "oscuro");
  });

  test("un valor manipulado se ignora y no se inyecta en la página", async ({ page, context }) => {
    await context.addCookies([{ name: "tema", value: 'oscuro"><img/src=x/onerror=alert(1)>', url: "http://localhost:3000" }]);
    await page.goto("/login");
    await expect(page.locator("html")).not.toHaveAttribute("data-tema", /.*/);
    expect(await page.locator("img[src=x]").count()).toBe(0);
  });
});

test.describe("Ocultar montos", () => {
  test("la cookie llega al servidor y la página ya viene oculta", async ({ page, context }) => {
    await context.addCookies([{ name: "privado", value: "1", url: "http://localhost:3000" }]);
    await page.goto("/login");
    await expect(page.locator("html")).toHaveAttribute("data-privado", "");
  });

  test("cualquier otro valor no activa el modo oculto", async ({ page, context }) => {
    await context.addCookies([{ name: "privado", value: "si", url: "http://localhost:3000" }]);
    await page.goto("/login");
    await expect(page.locator("html")).not.toHaveAttribute("data-privado", /.*/);
  });
});

import { describe, expect, it } from "vitest";
import { endpointPermitido, esquemaAtajo, esquemaSuscripcion, generarToken, huellaToken, tokenDeCabecera } from "./pwa";

describe("endpointPermitido (anti-SSRF en notificaciones)", () => {
  it.each([
    "https://web.push.apple.com/QGuQyavXutnMH8",
    "https://api.push.apple.com/3/device/abc",
    "https://fcm.googleapis.com/fcm/send/abc:123",
    "https://updates.push.services.mozilla.com/wpush/v2/abc",
    "https://wns2-par02p.notify.windows.com/w/?token=abc",
  ])("acepta %s", (url) => {
    expect(endpointPermitido(url)).toBe(true);
  });

  it.each([
    ["http sin cifrar", "http://web.push.apple.com/abc"],
    ["host de un atacante", "https://evil.example.com/push"],
    ["imitación de dominio", "https://web.push.apple.com.evil.com/abc"],
    ["dirección interna", "https://169.254.169.254/latest/meta-data"],
    ["localhost", "https://localhost/push"],
    ["puerto raro", "https://web.push.apple.com:8443/abc"],
    ["texto que no es URL", "no-es-una-url"],
  ])("rechaza %s", (_, url) => {
    expect(endpointPermitido(url)).toBe(false);
  });

  it("valida la forma completa de la suscripción", () => {
    const valida = { endpoint: "https://web.push.apple.com/abc", keys: { p256dh: "x".repeat(87), auth: "y".repeat(22) } };
    expect(esquemaSuscripcion.safeParse(valida).success).toBe(true);
    expect(esquemaSuscripcion.safeParse({ ...valida, keys: { p256dh: "corta", auth: "y" } }).success).toBe(false);
  });
});

describe("Token del Atajo de Siri", () => {
  it("genera tokens de 256 bits, distintos y con formato válido", () => {
    const a = generarToken();
    const b = generarToken();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(tokenDeCabecera(`Bearer ${a}`)).toBe(a);
  });

  it("la huella es SHA-256 en hexadecimal (lo único que se guarda)", () => {
    expect(huellaToken("hola")).toBe("b221d9dbb083a7f33428d7c2a3c3198ae925614d70210e28716ccaa7cd4ddb79");
  });

  it.each([null, "", "Basic abc", "Bearer corto", "Bearer con espacios y más", `Bearer ${"a".repeat(200)}`, "Bearer abc;DROP"])(
    "rechaza la cabecera %s",
    (cabecera) => {
      expect(tokenDeCabecera(cabecera)).toBeNull();
    },
  );

  it("acepta montos con coma decimal y aplica el tipo por defecto", () => {
    expect(esquemaAtajo.parse({ monto: "12,50", concepto: " Café " })).toEqual({ monto: 12.5, concepto: "Café", tipo: "GASTO" });
    expect(esquemaAtajo.parse({ monto: 8.22, concepto: "Spotify", tipo: "OCIO" }).monto).toBe(8.22);
  });

  it.each([
    { monto: "-3", concepto: "x" },
    { monto: "0", concepto: "x" },
    { monto: "1.234", concepto: "x" },
    { monto: "10", concepto: "" },
    { monto: "10", concepto: "x", tipo: "AHORRO" },
  ])("rechaza %o", (cuerpo) => {
    expect(esquemaAtajo.safeParse(cuerpo).success).toBe(false);
  });
});

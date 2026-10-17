import { describe, expect, it } from "vitest";
import { construirCsp, generarNonce } from "./csp";

const supabaseUrl = "https://abc123.supabase.co";

describe("construirCsp", () => {
  it("en producción no permite eval ni estilos inline en etiquetas", () => {
    const csp = construirCsp({ nonce: "n0nce", desarrollo: false, supabaseUrl });
    expect(csp).not.toContain("unsafe-eval");
    expect(csp).toContain("style-src-elem 'self' 'nonce-n0nce'");
    expect(csp).toContain("upgrade-insecure-requests");
  });

  it("solo ejecuta scripts con el nonce del request", () => {
    const csp = construirCsp({ nonce: "abc", desarrollo: false, supabaseUrl });
    expect(csp).toContain("script-src 'self' 'nonce-abc' 'strict-dynamic'");
  });

  it("bloquea iframes, plugins y formularios externos", () => {
    const csp = construirCsp({ nonce: "x", desarrollo: false, supabaseUrl });
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("form-action 'self'");
  });

  it("solo se conecta al propio sitio y a Supabase", () => {
    const csp = construirCsp({ nonce: "x", desarrollo: false, supabaseUrl: `${supabaseUrl}/` });
    expect(csp).toContain("connect-src 'self' https://abc123.supabase.co;");
  });

  it("genera un nonce distinto en cada llamada", () => {
    expect(generarNonce()).not.toBe(generarNonce());
  });
});

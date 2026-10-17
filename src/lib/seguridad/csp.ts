type OpcionesCsp = {
  nonce: string;
  desarrollo: boolean;
  supabaseUrl: string;
};

export function generarNonce(): string {
  return btoa(crypto.randomUUID());
}

// CSP estricta basada en nonce, según la guía de Next.js 16.
// Los atributos style="" se permiten (no ejecutan código); las etiquetas <script> y <style> no.
export function construirCsp({ nonce, desarrollo, supabaseUrl }: OpcionesCsp): string {
  const supabase = new URL(supabaseUrl).origin;
  const estilos = desarrollo ? "'self' 'unsafe-inline'" : `'self' 'nonce-${nonce}'`;

  const directivas = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${desarrollo ? " 'unsafe-eval'" : ""}`,
    `style-src ${estilos}`,
    `style-src-elem ${estilos}`,
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    `connect-src 'self' ${supabase}`,
    "worker-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];

  if (!desarrollo) directivas.push("upgrade-insecure-requests");
  return directivas.join("; ");
}

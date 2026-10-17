# Seguridad

SaveWise maneja datos financieros personales, así que la seguridad se diseña desde el inicio.

## Reportar una vulnerabilidad

No abras un issue público. Usa **Security → Report a vulnerability** en este repositorio
(reporte privado de GitHub). Respondo en cuanto pueda.

## Qué protege a la app

| Capa | Control |
|---|---|
| Base de datos | RLS en todas las tablas: cada fila solo la ve su dueño. Registro cerrado por lista de correos permitidos. Claves foráneas compuestas impiden apuntar a datos de otro usuario. |
| Servidor | Cada Server Action verifica la sesión con `getUser()` y valida la entrada con Zod. El `user_id` sale de la sesión, nunca del formulario. |
| Navegador | CSP estricta con nonce por request (`strict-dynamic`, sin `unsafe-eval` en producción), `frame-ancestors 'none'`, HSTS, `nosniff`, `Referrer-Policy` y `Permissions-Policy`. |
| Secretos | Solo la clave *publishable* (pública por diseño, limitada por RLS) llega al navegador. Ningún secreto se versiona. |
| Código | React escapa el texto; `dangerouslySetInnerHTML`, `eval` y `new Function` están prohibidos por ESLint. |

## Pruebas automáticas (GitHub Actions)

- **Calidad:** ESLint, TypeScript estricto y pruebas con Vitest (validación de entradas, CSP, cálculos).
- **Dependencias:** `npm audit` de producción en cada push; Dependabot semanal.
- **Secretos:** Gitleaks sobre todo el historial.
- **Análisis estático:** Semgrep (JavaScript, TypeScript, React, OWASP Top 10).
- **Base de datos:** pgTAP prueba las políticas RLS en un Supabase local.
- **Ataque simulado:** escaneo base de OWASP ZAP contra la app compilada.

## Límites conocidos

- Las cookies de sesión de `@supabase/ssr` no son HttpOnly: el cliente del navegador las necesita.
  La defensa contra su robo es la CSP estricta, que impide ejecutar scripts inyectados.
- `npm audit` reporta una vulnerabilidad en `braces`, dependencia de ESLint que solo se usa en
  desarrollo y no llega a producción. Aún no tiene versión corregida.

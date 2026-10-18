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
- **E2E (Playwright):** ninguna ruta privada responde sin sesión, CSP y cabeceras presentes,
  nonce distinto por request, cron rechaza llamadas sin secreto, la vitrina no existe en producción.

## Otras medidas

- **Cadena de suministro:** las acciones de GitHub se fijan por SHA verificado contra el tag oficial;
  Dependabot espera 7 días antes de proponer versiones nuevas; las versiones mayores que el ecosistema
  aún no soporta (TypeScript 7, ESLint 10) se bloquean a propósito.
- **Cron diario:** protegido con un secreto aleatorio de 256 bits comparado en tiempo constante.
- **Tipo de cambio:** se consulta desde el servidor a un host fijo con códigos validados (sin SSRF)
  y queda congelado en cada movimiento.
- **Búsqueda:** los comodines de LIKE se escapan; los parámetros de la URL se validan uno por uno.
- **Notificaciones push:** solo se aceptan endpoints de los servicios oficiales (Apple, Google, Mozilla,
  Microsoft); cualquier otra URL se rechaza para evitar SSRF. Las claves VAPID privadas viven solo en Vercel.
- **Atajo de Siri:** token aleatorio de 256 bits que se muestra una sola vez; la base solo guarda su
  huella SHA-256. Límite de 10 registros por minuto y revocable desde Ajustes.
- **Funciones con privilegios:** `registrar_por_atajo` y `recordatorios_del_dia` son `SECURITY DEFINER`
  y las puede llamar `anon`, a propósito: cada una exige su propio secreto (token o secreto del cron,
  comparados por huella). Es un permiso mínimo frente a usar la clave `service_role`, que salta todo RLS.
- **Service worker:** no guarda páginas ni datos financieros en el teléfono; solo archivos estáticos
  y una pantalla sin conexión. Los avisos solo pueden abrir rutas internas de la app.
- **Deudas:** cada pago es un gasto con `(deuda_id, user_id)` como llave compuesta: no se puede
  vincular un pago a la deuda de otra persona. pgTAP lo prueba junto con RLS y los avisos de pago.
- **Resumen con IA (Gemini):** la llamada sale solo del servidor, con la clave en la cabecera
  `x-goog-api-key` (nunca en la URL ni en el navegador). Se envían únicamente totales agregados y
  nombres de categorías; nunca conceptos, notas, fechas ni correos, porque la capa gratuita de Google
  puede usar los datos para mejorar sus modelos. La respuesta se muestra como texto plano (React la
  escapa) y se recorta; el nombre del modelo se valida para que no altere la URL. Sin la variable
  `GEMINI_API_KEY` la función no aparece.
- **Respaldo:** el plan gratis de Supabase no ofrece copias descargables, así que la app genera un
  respaldo JSON completo (`/api/respaldo`, sesión verificada con `getUser` y RLS). No incluye correo,
  suscripciones push ni el token del Atajo. Un aviso push el día 1 de cada mes recuerda descargarlo.
- **Tema y ocultar montos:** dos cookies sin datos personales. `tema` es HttpOnly y el servidor solo
  acepta `auto`, `claro` u `oscuro`; `privado` solo se activa con el valor `1`. Cualquier otro valor se
  ignora (hay pruebas E2E con una cookie manipulada que intenta inyectar HTML). Ocultar montos es solo
  visual: protege de miradas en público, no es un control de acceso.
- **Confirmación antes de borrar:** eliminar un aporte, un registro, un movimiento o una deuda, dejar de
  repetir algo y revocar el token del Atajo piden confirmación en una alerta (`<dialog>` nativo). Al
  abrirla no queda ningún botón enfocado, así Enter nunca borra por accidente. "Borrar todos mis datos"
  exige escribir BORRAR (validado en el servidor) y ofrece descargar el respaldo antes.
- **Redirecciones:** después de eliminar, la app solo vuelve a `/historial`, `/ahorros` o `/dashboard`
  (lista cerrada; no hay redirecciones abiertas).
- **Colores de categorías:** un índice único `(user_id, color)` impide que dos categorías compartan color.
- **Mantener despierta:** el flujo `mantener-despierta.yml` no usa secretos ni acciones de terceros,
  tiene `permissions: {}` y solo pide la pantalla pública `/login`.
- **Cola sin conexión:** los movimientos guardados sin internet llevan un UUID generado en el teléfono,
  así reintentar nunca los duplica.

## Límites conocidos

- Las cookies de sesión de `@supabase/ssr` no son HttpOnly: el cliente del navegador las necesita.
  La defensa contra su robo es la CSP estricta, que impide ejecutar scripts inyectados.
- `npm audit` reporta una vulnerabilidad en `braces` (GHSA-vfj7-8cjw-p6xm), que aparece como 5 avisos
  porque llega en cadena desde el plugin de ESLint de Next (`eslint-config-next` › `fast-glob` ›
  `micromatch` › `braces`). Solo se usa en desarrollo y no llega a producción
  (`npm audit --omit=dev`: 0 vulnerabilidades). Aún no hay versión corregida (la última, 3.0.3, está afectada).
- Ocultar montos no cifra nada: los montos viajan al teléfono y solo se esconden en pantalla.

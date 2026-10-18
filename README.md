# SaveWise

**Cada sol con un propósito.** App de finanzas personales para iPhone y Android: escribes tu sueldo, lo
repartes en gastos, ahorros y una bolsa “Para mí”, y siempre ves cuánto queda sin asignar.

> *Personal finance PWA for iPhone and Android. Next.js 16 + Supabase, zero-cost hosting, security-first: strict
> nonce-based CSP, Row Level Security tested with pgTAP, and a CI pipeline with Gitleaks, Semgrep and OWASP ZAP.*

## Qué hace

- **Sueldo mensual** en soles (u otra moneda base) que se reparte en cuatro colores:
  rojo gastos, verde ahorros, morado Para mí y azul sin asignar.
- **Metas de ahorro** con anillo de progreso y cuota mensual sugerida.
- **Para mí:** bolsa de ocio con lo que puedes gastar por día.
- **Consejos** calculados con reglas (50/30/20, ritmo de gasto, dinero sin destino).
- **Historial** con páginas de 20 y filtros por fechas, tipo, categoría y texto; editar y eliminar.
- **Dashboard** con dona por categoría y vista anual.
- **Multimoneda:** cada movimiento guarda su tipo de cambio del día
  ([ExchangeRate-API](https://www.exchangerate-api.com)).
- **Tu mes** empieza el día que cobras.
- **Planificación:** topes por categoría con aviso al 80 %, cierre de mes, fondo de emergencia
  y proyección de cada meta al 31 de diciembre.
- **Deudas y tarjetas:** saldo, cuotas que faltan según la TEA y aviso un día antes de pagar.
- **Día a día:** frecuentes de un toque, nota en cada movimiento, calendario de pagos (con "dejar de
  repetir"), comparación por categoría frente al mes anterior, reto de 52 semanas y aviso si ayer no
  registraste nada.
- **Ocultar montos:** un ojo en cada pantalla cambia todas las cifras por `S/ ••••`; las frases se siguen leyendo.
- **Confirmación antes de borrar:** alerta al estilo iOS para eliminar o dejar de repetir; borrar todo exige escribir BORRAR.
- **Categorías propias:** crea, renombra o elimina categorías; hasta 12, cada una con su color de sistema de iOS.
- **Metas y deudas editables:** editar, archivar o eliminar metas (moviendo sus aportes) y editar deudas.
- **Me deben:** lista de préstamos que hiciste, que marcas como cobrados.
- **Gastos hormiga y patrimonio neto:** gastos chicos repetidos del mes y la evolución de ahorros + te deben − deudas.
- **Avisos inteligentes:** resumen del periodo el día de cobro y "¿Sigues usando…?" cada 3 renovaciones.
- **Respaldo completo** en JSON (que también se restaura desde la app, sin duplicar) y exportación CSV para Google Sheets, con recordatorio mensual.
- **Resumen con IA (opcional):** Gemini resume tu mes a partir de totales agregados, nunca de tus conceptos.
- Modo claro, oscuro o automático (elegible en Ajustes), diseño al estilo iOS.
- **Instalable** en iPhone (Compartir › Añadir a pantalla de inicio) y en Android (botón "Instalar" de Chrome),
  con avisos push y modo sin conexión.

## Stack

| Capa | Tecnología |
|---|---|
| App | Next.js 16 (App Router, Server Actions), React 19, TypeScript estricto |
| Estilos | Tailwind CSS 4, colores de sistema de iOS |
| Datos y login | Supabase: Postgres, Auth con Google, RLS |
| Validación | Zod 4 |
| Pruebas | Vitest, pgTAP, Playwright (E2E) |
| IA | Gemini (capa gratuita, sin facturación) |
| Hosting | Vercel Hobby (costo 0) en São Paulo, junto a la base |

## Seguridad

Ver [SECURITY.md](SECURITY.md): defensa en capas, pruebas automáticas y límites conocidos.

## Desarrollo local

```bash
cp .env.example .env.local   # completa con tu proyecto Supabase
npm install
npm run dev
npm run verificar            # lint + tipos + pruebas
```

Las migraciones están en `supabase/migrations` y las pruebas de RLS en `supabase/tests`
(`supabase test db`, requiere Docker).

## Fluidez

- La app y la base están en São Paulo (`gru1` y `sa-east-1`); las consultas tardan menos de 6 ms.
- Pestañas precargadas y en caché 60 s; Lighthouse móvil: rendimiento 98, accesibilidad 100.
- El plan gratis de Vercel "duerme" la app tras un rato sin uso. Un flujo de GitHub Actions
  (`mantener-despierta.yml`) la visita cada 10 minutos de 6:00 a 23:59 (hora de Lima), sin costo.

## Roadmap

- [x] Fase 0: base segura (Supabase + RLS, CSP, pipeline de seguridad)
- [x] Fase 1: sueldo, gastos, ahorros, Para mí, Inicio en claro y oscuro
- [x] Fase 2: Historial con páginas y filtros, editar y eliminar, Dashboard, multimoneda, día de pago
- [x] Fase 3: PWA instalable, offline con cola de envío, avisos push y Atajo de Siri; app en São Paulo junto a la base
- [x] Fase 4: exportar a CSV (Google Sheets) y gastos recurrentes automáticos
- [x] Fase 5: topes, cierre de mes, fondo de emergencia, proyección anual, deudas y resumen con IA
- [x] Mejoras: tema elegible, ocultar montos, confirmaciones, colores únicos, soporte Android
- [ ] Más adelante: invitar personas (cada una con su cuenta privada; compartir datos entre personas queda fuera)

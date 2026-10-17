# SaveWise

**Cada sol con un propósito.** App de finanzas personales para iPhone: escribes tu sueldo, lo
repartes en gastos, ahorros y una bolsa “Para mí”, y siempre ves cuánto queda sin asignar.

> *Personal finance PWA for iPhone. Next.js 16 + Supabase, zero-cost hosting, security-first: strict
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
- **Resumen con IA (opcional):** Gemini resume tu mes a partir de totales agregados, nunca de tus conceptos.
- Modo claro y oscuro automáticos, diseño al estilo iOS.

## Stack

| Capa | Tecnología |
|---|---|
| App | Next.js 16 (App Router, Server Actions), React 19, TypeScript estricto |
| Estilos | Tailwind CSS 4, colores de sistema de iOS |
| Datos y login | Supabase: Postgres, Auth con Google, RLS |
| Validación | Zod 4 |
| Pruebas | Vitest, pgTAP |
| Hosting | Vercel Hobby (costo 0) |

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

## Roadmap

- [x] Fase 0: base segura (Supabase + RLS, CSP, pipeline de seguridad)
- [x] Fase 1: sueldo, gastos, ahorros, Para mí, Inicio en claro y oscuro
- [x] Fase 2: Historial con páginas y filtros, editar y eliminar, Dashboard, multimoneda, día de pago
- [x] Fase 3: PWA instalable, offline con cola de envío, avisos push y Atajo de Siri; app en São Paulo junto a la base
- [x] Fase 4: exportar a CSV (Google Sheets) y gastos recurrentes automáticos
- [x] Fase 5: topes, cierre de mes, fondo de emergencia, proyección anual, deudas y resumen con IA
- [ ] Siguiente: invitar personas

import { formatearDinero, validarSalida } from "@/lib/dinero";
import { esquemaAtajo, tokenDeCabecera } from "@/lib/pwa";
import { crearClienteAnonimo } from "@/lib/supabase/anonimo";

// Endpoint del Atajo de Siri. Responde texto plano para que Atajos lo muestre tal cual.
// Autenticación: "Authorization: Bearer <token personal>". La base valida el token por su huella
// y aplica el límite de 10 registros por minuto.

/** La base avisa "Sin dinero|PEN|120.50" cuando el gasto supera lo que queda sin asignar. */
const SIN_DINERO = /Sin dinero\|([A-Z]{3})\|(-?\d+(?:\.\d+)?)/;

const texto = (mensaje: string, status: number) =>
  new Response(mensaje, { status, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });

export async function POST(request: Request) {
  const token = tokenDeCabecera(request.headers.get("authorization"));
  if (!token) return texto("Falta un token válido", 401);

  const cuerpo = await request.text();
  if (cuerpo.length > 2_000) return texto("Petición demasiado grande", 413);

  let json: unknown;
  try {
    json = JSON.parse(cuerpo);
  } catch {
    return texto("El cuerpo debe ser JSON", 400);
  }

  const datos = esquemaAtajo.safeParse(json);
  if (!datos.success) return texto(datos.error.issues[0]?.message ?? "Datos inválidos", 400);

  const { data, error } = await crearClienteAnonimo().rpc("registrar_por_atajo", {
    p_token: token,
    p_monto: datos.data.monto,
    p_concepto: datos.data.concepto,
    p_tipo: datos.data.tipo,
    p_categoria: datos.data.categoria,
  });

  if (error) {
    if (error.message.includes("Token inválido")) return texto("Token inválido o revocado", 401);
    if (error.message.includes("Demasiados")) return texto("Demasiados registros, espera un minuto", 429);
    const sinDinero = SIN_DINERO.exec(error.message);
    if (sinDinero) {
      const aviso = validarSalida("GASTO", datos.data.monto, Number(sinDinero[2]), sinDinero[1]);
      return texto(aviso ?? "No tienes dinero sin asignar", 409);
    }
    return texto("No se pudo guardar", 400);
  }

  return texto(`Guardado: ${data.concepto} · ${formatearDinero(Number(data.monto), data.moneda)}`, 201);
}

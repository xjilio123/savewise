-- Los pagos recurrentes de una deuda siguen vinculados a ella; si la deuda está cerrada, no se repiten.
create or replace function public.generar_recurrentes(p_token text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hoy date := (now() at time zone 'America/Lima')::date;
  v_total integer := 0;
  v_nuevos integer;
begin
  if not private.cron_autorizado(p_token) then
    raise exception 'No autorizado';
  end if;

  for i in 1..3 loop
    with ultimos as (
      select distinct on (m.user_id, lower(m.concepto)) m.*
      from public.movimientos m
      order by m.user_id, lower(m.concepto), m.fecha desc, m.creado desc
    ),
    insertados as (
      insert into public.movimientos
        (user_id, fecha, tipo, categoria_id, meta_id, deuda_id, concepto, monto, moneda, tipo_cambio, recurrente, nota)
      select
        u.user_id, (u.fecha + interval '1 month')::date, u.tipo, u.categoria_id, u.meta_id, u.deuda_id,
        u.concepto, u.monto, u.moneda, u.tipo_cambio, true, 'Registrado automáticamente'
      from ultimos u
      left join public.deudas d on d.id = u.deuda_id
      where u.recurrente
        and (u.fecha + interval '1 month')::date <= v_hoy
        and coalesce(d.cerrada, false) = false
      returning 1
    )
    select count(*) into v_nuevos from insertados;

    v_total := v_total + v_nuevos;
    exit when v_nuevos = 0;
  end loop;

  return v_total;
end;
$$;

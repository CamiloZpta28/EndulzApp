import type { NextRequest } from "next/server";

import { sweepOrphanDeliveryPhotos } from "@/lib/delivery-photos";
import { missingPushEnv, sendPush } from "@/lib/push";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatGroupDate } from "@/lib/format";

/**
 * El cron de recordatorios.
 *
 * Corre una vez al día (ver `vercel.json`), pregunta a la base qué avisos
 * faltan por mandar hoy y los manda. Toda la lógica de "a quién y cuándo"
 * vive en `public.pending_reminders()`: en SQL es una consulta, en TypeScript
 * habrían sido cuatro viajes y un montón de bucles.
 *
 * Es idempotente a propósito: cada envío se anota en `reminder_log` y la
 * consulta descarta lo ya anotado. Si Vercel reintenta, o si alguien lo
 * dispara a mano, nadie recibe el mismo recordatorio dos veces.
 *
 * Runtime Node (el de por defecto): `web-push` firma con crypto de Node y no
 * corre en edge.
 */

/** Vercel corta las funciones a los 10s por defecto; esto puede mandar varias. */
export const maxDuration = 60;

type Pending = {
  group_id: string;
  group_name: string;
  emoji: string | null;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  kind: string;
  target_date: string;
  days_before: number;
};

function buildMessage(row: Pending) {
  const fecha = formatGroupDate(row.target_date);
  const cuando =
    row.days_before === 0
      ? "es hoy"
      : `es el ${fecha?.absolute ?? row.target_date}`;
  const emoji = row.emoji ? `${row.emoji} ` : "";

  if (row.kind === "reveal") {
    return {
      title: `${emoji}${row.group_name}`,
      body:
        row.days_before === 0
          ? "¡Hoy es el descubrimiento! Se revela quién le tenía a quién."
          : `El descubrimiento ${cuando}. Ve teniendo listo el regalo.`,
      tag: `reveal-${row.group_id}-${row.target_date}`,
    };
  }

  return {
    title: `${emoji}${row.group_name}`,
    body:
      row.days_before === 0
        ? "¡Hoy es la endulzada! No se te olvide llevarla."
        : `La endulzada ${cuando}. Ya puedes ir comprando.`,
    tag: `endulzada-${row.group_id}-${row.target_date}`,
  };
}

export async function GET(request: NextRequest) {
  // Vercel Cron manda `Authorization: Bearer $CRON_SECRET`. Sin esto la ruta
  // sería un botón público para mandarle notificaciones a todo el mundo.
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json({ error: "Falta CRON_SECRET" }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  // Cada variable que falta se reporta por nombre. Un cron que se cae con un
  // 500 vacío no se puede depurar: hay que abrir los logs para descubrir algo
  // que la respuesta podía decir de una.
  const faltantes = missingPushEnv();

  if (faltantes.length > 0) {
    return Response.json(
      { error: `Faltan variables de entorno: ${faltantes.join(", ")}` },
      { status: 500 },
    );
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("pending_reminders", {
    p_today: null,
  });

  if (error) {
    // El caso típico: el patch 010 no se corrió y la función no existe.
    return Response.json(
      {
        error: error.message,
        pista:
          error.code === "42883" || /pending_reminders/.test(error.message)
            ? "Parece que falta correr supabase/patches/010-notificaciones.sql"
            : undefined,
      },
      { status: 500 },
    );
  }

  const rows = (data ?? []) as Pending[];
  let sent = 0;
  let dropped = 0;
  let failures = 0;

  for (const row of rows) {
    const result = await sendPush(supabase, row, {
      ...buildMessage(row),
      url: `/g/${row.group_id}`,
    });

    if (result === "sent") {
      await supabase.rpc("mark_reminder_sent", {
        p_group: row.group_id,
        p_user: row.user_id,
        p_kind: row.kind,
        p_target_date: row.target_date,
        p_days_before: row.days_before,
      });
      sent++;
    } else if (result === "dropped") {
      dropped++;
    } else {
      failures++;
    }
  }

  // De paso, una vez al día: las fotos de entregas que ya no existen. No
  // tumba el cron si falla — los recordatorios son lo importante.
  const fotos = await sweepOrphanDeliveryPhotos(supabase).catch((error) => {
    console.error("limpieza de fotos falló:", error);
    return null;
  });

  return Response.json({
    pendientes: rows.length,
    enviados: sent,
    suscripciones_muertas: dropped,
    fallos: failures,
    fotos_huerfanas_borradas: fotos,
  });
}

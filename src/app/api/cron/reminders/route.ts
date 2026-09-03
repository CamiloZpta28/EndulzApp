import type { NextRequest } from "next/server";
import webpush from "web-push";

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
  const faltantes = [
    ["SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY],
    ["NEXT_PUBLIC_VAPID_PUBLIC_KEY", process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY],
    ["VAPID_PRIVATE_KEY", process.env.VAPID_PRIVATE_KEY],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (faltantes.length > 0) {
    return Response.json(
      { error: `Faltan variables de entorno: ${faltantes.join(", ")}` },
      { status: 500 },
    );
  }

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:hola@endulzapp.app";
  webpush.setVapidDetails(subject, publicKey!, privateKey!);

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
  const failures: string[] = [];

  for (const row of rows) {
    const message = buildMessage(row);
    try {
      await webpush.sendNotification(
        {
          endpoint: row.endpoint,
          keys: { p256dh: row.p256dh, auth: row.auth },
        },
        JSON.stringify({ ...message, url: `/g/${row.group_id}` }),
      );

      await supabase.rpc("mark_reminder_sent", {
        p_group: row.group_id,
        p_user: row.user_id,
        p_kind: row.kind,
        p_target_date: row.target_date,
        p_days_before: row.days_before,
      });
      sent++;
    } catch (pushError) {
      const status = (pushError as { statusCode?: number }).statusCode;
      // 404/410 = el navegador desechó esa suscripción. Se borra o el cron la
      // reintentaría todos los días para siempre.
      if (status === 404 || status === 410) {
        await supabase.rpc("drop_push_subscription", {
          p_endpoint: row.endpoint,
        });
        dropped++;
      } else {
        failures.push(`${status ?? "?"}`);
      }
    }
  }

  return Response.json({
    pendientes: rows.length,
    enviados: sent,
    suscripciones_muertas: dropped,
    fallos: failures,
  });
}

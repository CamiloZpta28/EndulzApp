import { getEndulzadas, getGroup, getUser } from "@/lib/db";

/**
 * Las fechas del grupo como archivo `.ics`.
 *
 * Es el complemento de las notificaciones push, no un reemplazo: el calendario
 * del teléfono avisa aunque la app no esté instalada, aunque el navegador no
 * soporte push, y aunque la persona nunca dé el permiso. Y sobrevive a que
 * este servidor se caiga, que es más de lo que puede decir un cron.
 *
 * Cada evento lleva su propio `VALARM` a 3 días y otro el mismo día, igual que
 * los recordatorios push, para que quien use los dos no reciba avisos en
 * momentos distintos.
 */

/** RFC 5545: las líneas van con CRLF y el texto escapa `\` `;` `,` y saltos. */
function escapeText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** `YYYY-MM-DD` -> `YYYYMMDD`, el formato de fecha sin hora del estándar. */
function toDateValue(iso: string) {
  return iso.replace(/-/g, "");
}

/** Día siguiente: en eventos de día completo, `DTEND` es exclusivo. */
function nextDay(iso: string) {
  const date = new Date(`${iso}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

function buildEvent({
  uid,
  date,
  summary,
  description,
  stamp,
}: {
  uid: string;
  date: string;
  summary: string;
  description: string;
  stamp: string;
}) {
  return [
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${toDateValue(date)}`,
    `DTEND;VALUE=DATE:${nextDay(date)}`,
    `SUMMARY:${escapeText(summary)}`,
    `DESCRIPTION:${escapeText(description)}`,
    "BEGIN:VALARM",
    "TRIGGER:-P3D",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapeText(`${summary} — en 3 días`)}`,
    "END:VALARM",
    "BEGIN:VALARM",
    "TRIGGER:-PT9H",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapeText(`${summary} — hoy`)}`,
    "END:VALARM",
    "END:VEVENT",
  ];
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // RLS decide: si no eres del grupo, `getGroup` devuelve null y esto es 404.
  const user = await getUser();
  if (!user) return new Response("No autorizado", { status: 401 });

  const group = await getGroup(id);
  if (!group) return new Response("No encontrado", { status: 404 });

  const endulzadas = await getEndulzadas(id);
  const stamp = `${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//EndulzApp//Amigo Secreto//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(group.name)}`,
  ];

  endulzadas.forEach((endulzada, index) => {
    lines.push(
      ...buildEvent({
        uid: `endulzada-${endulzada.id}@endulzapp`,
        date: endulzada.happens_on,
        stamp,
        summary: `${group.emoji ?? "🍬"} Endulzada ${index + 1} · ${group.name}`,
        description: `Llevar la endulzada del grupo ${group.name}.`,
      }),
    );
  });

  if (group.reveal_at) {
    lines.push(
      ...buildEvent({
        uid: `reveal-${group.id}@endulzapp`,
        date: group.reveal_at,
        stamp,
        summary: `${group.emoji ?? "🎁"} Descubrimiento · ${group.name}`,
        description: `Día del descubrimiento del grupo ${group.name}: se revela quién le tenía a quién.`,
      }),
    );
  }

  lines.push("END:VCALENDAR");

  // Nombre de archivo sin acentos ni espacios: algunos clientes de correo y
  // gestores de descargas se atragantan con ellos.
  const safeName =
    group.name
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase() || "grupo";

  return new Response(`${lines.join("\r\n")}\r\n`, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="endulzapp-${safeName}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}

import { downloadDeliveryPhoto, deliveryPhotosEnabled } from "@/lib/delivery-photos";
import { getUser } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

/**
 * La foto de una entrega.
 *
 * El bucket es privado y sin políticas, así que el navegador nunca habla con
 * Storage: pide esta ruta, y esta ruta pregunta a la base —con la sesión de
 * quien pide— si esa entrega es suya, como quien da o quien recibe. Solo
 * entonces la descarga con la llave de servicio y la sirve.
 *
 * `Cache-Control: private, immutable` porque la dirección lleva `?v=` con el
 * nombre del archivo: si cambian la foto, cambia la dirección.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; deliveryId: string }> },
) {
  const { id, deliveryId } = await params;

  const user = await getUser();
  if (!user) return new Response(null, { status: 401 });
  if (!deliveryPhotosEnabled()) return new Response(null, { status: 404 });

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("my_group_deliveries", {
    p_group: id,
  });
  // Un error y "no es tuya" responden igual: 404. Distinguirlos le diría a
  // quien pregunta que la entrega existe.
  const delivery = error
    ? undefined
    : data?.find((row) => row.delivery_id === deliveryId);
  if (!delivery?.photo_path) return new Response(null, { status: 404 });

  const blob = await downloadDeliveryPhoto(delivery.photo_path);
  if (!blob) return new Response(null, { status: 404 });

  return new Response(blob, {
    headers: {
      "Content-Type": blob.type || "image/webp",
      "Cache-Control": "private, max-age=86400, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

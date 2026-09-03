import { Ban, Candy, Gift } from "lucide-react";

import type { WishlistType } from "@/lib/types";

/**
 * Cómo se presenta cada sección de una lista, en un solo lugar.
 *
 * Estaba repetido en tres componentes y al agregar los vetados habría que
 * haberlo escrito tres veces más.
 *
 * `hasBudget: false` en vetados porque un veto no tiene tope: no es una
 * categoría de gasto, es una advertencia.
 *
 * El color de los vetados es un neutro y no un rojo: en tema claro el
 * `--primary` ya es rojo y el `--destructive` también, así que un tercer rojo
 * se habría perdido entre los otros dos. Lo que comunica «prohibido» acá es el
 * icono de prohibido y el borde punteado, no el tono.
 */
export const WISHLIST_META: Record<
  WishlistType,
  {
    label: string;
    icon: typeof Candy;
    color: string;
    soft: string;
    hint: string;
    hasBudget: boolean;
    /** Borde punteado: marca visualmente que es una lista de "no". */
    dashed: boolean;
  }
> = {
  endulzada: {
    label: "Endulzada",
    icon: Candy,
    color: "var(--endulzada)",
    soft: "var(--endulzada-soft)",
    hint: "Dulces, mecato, cafecitos — las cositas del día a día.",
    hasBudget: true,
    dashed: false,
  },
  regalo: {
    label: "Regalo",
    icon: Gift,
    color: "var(--regalo)",
    soft: "var(--regalo-soft)",
    hint: "El regalo grande del final.",
    hasBudget: true,
    dashed: false,
  },
  vetado: {
    label: "Vetado",
    icon: Ban,
    color: "var(--vetado)",
    soft: "var(--vetado-soft)",
    hint: "Lo que NO quieres recibir: alergias, cosas repetidas, lo que no te gusta.",
    hasBudget: false,
    dashed: true,
  },
};

/** El orden en que se pintan las secciones. Los vetados van al final. */
export const WISHLIST_ORDER: WishlistType[] = ["endulzada", "regalo", "vetado"];

import type { MetadataRoute } from "next";

/**
 * Para instalarla en el celular. Los íconos los sirven `icon.tsx` y
 * `apple-icon.tsx`, que Next expone en estas rutas.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "EndulzApp — Amigo Secreto",
    short_name: "EndulzApp",
    description:
      "El amigo secreto del parche: invita con un enlace, pon los topes y sortea sin trampas.",
    start_url: "/dashboard",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fdf7f7",
    theme_color: "#e0475f",
    lang: "es-CO",
    icons: [
      { src: "/icon", sizes: "64x64", type: "image/png" },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}

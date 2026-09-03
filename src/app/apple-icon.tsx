import { ImageResponse } from "next/og";

/**
 * El ícono para cuando se agrega al inicio del celular.
 *
 * iOS le pone las esquinas redondeadas por su cuenta y no respeta la
 * transparencia, así que el fondo va macizo y el dibujo con margen para que
 * el recorte no lo muerda.
 */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(140deg, #e0475f 0%, #c0304d 100%)",
        }}
      >
        <svg width="124" height="124" viewBox="0 0 48 48">
          <rect x="7" y="20" width="34" height="21" rx="5" fill="#fff" />
          <rect x="21.5" y="20" width="5" height="21" fill="#e0475f" />
          <rect x="5" y="16" width="38" height="8" rx="3" fill="#fff" />
          <rect x="21.5" y="16" width="5" height="8" fill="#e0475f" />
          <circle cx="16" cy="11" r="7" fill="#f0a02c" />
          <circle cx="32" cy="11" r="7" fill="#8b6ef0" />
          <circle cx="24" cy="13.5" r="3.5" fill="#fff" />
        </svg>
      </div>
    ),
    size,
  );
}

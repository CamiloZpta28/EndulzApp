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
          <rect x="22" y="26" width="4" height="18" rx="2" fill="rgba(255,255,255,.8)" />
          <circle cx="24" cy="19" r="15" fill="#fff" />
          <path
            d="M24 19 m0 -10 a10 10 0 1 1 -7.07 17.07 a7 7 0 1 0 9.9 -9.9 a4 4 0 1 1 -5.66 5.66"
            fill="none"
            stroke="#e0475f"
            strokeWidth="3.2"
            strokeLinecap="round"
          />
        </svg>
      </div>
    ),
    size,
  );
}

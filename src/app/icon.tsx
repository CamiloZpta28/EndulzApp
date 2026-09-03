import { ImageResponse } from "next/og";

/**
 * El favicon, generado del mismo logo.
 *
 * Los colores van escritos a mano en vez de con `var(--…)`: esto se rasteriza
 * en el servidor con Satori, donde no existen las variables CSS del tema.
 */
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#e0475f",
          borderRadius: 14,
        }}
      >
        <svg width="48" height="48" viewBox="0 0 48 48">
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

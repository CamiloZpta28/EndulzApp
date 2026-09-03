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

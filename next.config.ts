import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      /**
       * Por defecto son 1 MB, y una foto de celular los pasa sin esfuerzo: el
       * POST se rechazaba con `Body exceeded 1 MB limit` ANTES de que la
       * accion corriera, asi que ninguna validacion propia alcanzaba a dar un
       * mensaje — llegaba un 500 pelado.
       *
       * Las fotos ya se comprimen en el navegador (`lib/image-shrink.ts`), asi
       * que esto es la red de seguridad, no el camino normal. El techo queda
       * por encima de `MAX_IMAGE_BYTES` (3 MB) para dejarle aire al
       * multipart: los separadores y las cabeceras de cada parte suman unos
       * 10-20 KB, mas los otros campos del formulario.
       */
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;

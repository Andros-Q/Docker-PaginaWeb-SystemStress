/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // <--- ¡ESTA LÍNEA ES CRÍTICA! Indica a Next.js que cree el servidor ejecutable
  // ... si tienes otras configuraciones aquí, déjalas abajo
};

module.exports = nextConfig;

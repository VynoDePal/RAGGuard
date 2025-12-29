import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,

  // Exclure dashcraft-app du build du backend
  typescript: {
    ignoreBuildErrors: false,
  },
  
  // CORS headers pour permettre les requêtes cross-origin depuis le dashboard
  async headers() {
    return [
      {
        // Appliquer les headers CORS à toutes les routes API
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, X-User-Id, X-Tenant-Id' },
        ],
      },
    ];
  },
};

export default nextConfig;

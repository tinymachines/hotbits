import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@duckdb/duckdb-wasm'],
  allowedDevOrigins: ['hotbits.tinymachines.ai'],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    
    // Handle WASM files
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'webassembly/async',
    });

    // Experiments for WASM
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };

    return config;
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'unsafe-none'
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'unsafe-none'
          }
        ]
      }
    ];
  }
};

export default nextConfig;

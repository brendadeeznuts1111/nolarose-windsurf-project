// bun.config.ts - Bun Build Configuration
// Optimized build configuration for DuoPlus Admin System

import type { BunPlugin } from "bun";

const isDevelopment = process.env.NODE_ENV === "development";
const isProduction = process.env.NODE_ENV === "production";

// Environment-specific plugins
const plugins: BunPlugin[] = [];

// Add environment variable replacement plugin for production builds
if (isProduction) {
  plugins.push({
    name: "env-replacer",
    setup(build) {
      build.onLoad({ filter: /\.(ts|js)$/ }, async (args) => {
        const contents = await Bun.file(args.path).text();
        
        // Replace process.env with actual values for production
        const processed = contents
          .replace(/process\.env\.NODE_ENV/g, `"${process.env.NODE_ENV}"`)
          .replace(/Bun\.env\.DUOPLUS_DEBUG/g, process.env.DUOPLUS_DEBUG === "true" ? "true" : "false")
          .replace(/Bun\.env\.DUOPLUS_METRICS_ENABLED/g, process.env.DUOPLUS_METRICS_ENABLED === "true" ? "true" : "false");
        
        return { contents: processed, loader: "ts" };
      });
    },
  });
}

export default {
  // Entry points
  entrypoints: {
    "duoplus-admin": "./cli/admin.ts",
    "duoplus-demo": "./duoplus-admin-demo.ts",
    "duoplus-server": "./src/admin/server.ts",
  },
  
  // Output configuration
  outdir: "./dist",
  
  // Target environment
  target: "bun",
  
  // Minification for production
  minify: isProduction,
  
  // Source maps for development
  sourcemap: isDevelopment ? "inline" : false,
  
  // External dependencies (not bundled)
  external: [
    "sqlite3",
    "aws-sdk",
    "lightning",
  ],
  
  // Plugins
  plugins,
  
  // Define global constants
  define: {
    __VERSION__: JSON.stringify(require("./package.json").version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __ENVIRONMENT__: JSON.stringify(process.env.NODE_ENV || "development"),
  },
  
  // Optimization settings
  optimize: isProduction,
  
  // Asset configuration
  assetNames: "[name]-[hash].[ext]",
  
  // Chunk configuration for better caching
  splitting: true,
  chunkNames: "[name]-[hash]",
  
  // Environment-specific settings
  ...(isDevelopment && {
    // Development-specific settings
    watch: true,
    liveReload: true,
    logLevel: "debug",
  }),
  
  ...(isProduction && {
    // Production-specific settings
    treeShaking: true,
    deadCodeElimination: true,
  }),
  
  // Meta configuration
  meta: {
    name: "DuoPlus Admin System",
    description: "Production-grade financial infrastructure for family pool admins",
    version: require("./package.json").version,
    author: "DuoPlus Team",
    license: "MIT",
  },
  
  // Loader configuration for different file types
  loader: {
    ".env": "text",
    ".md": "text",
    ".sql": "text",
  },
  
  // Resolve configuration
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
    alias: {
      "@": "./src",
      "@/config": "./src/config",
      "@/admin": "./src/admin",
      "@/compliance": "./src/compliance",
      "@/pools": "./src/pools",
    },
  },
  
  // Headers for production builds
  headers: isProduction ? {
    "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
  } : undefined,
};

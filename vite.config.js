import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/",
  server: {
    // 1️⃣ bind to 0.0.0.0 so external (ngrok) can reach you
    host: true, // equivalent to host: '0.0.0.0'
    port: 3000,

    // 2️⃣ allow your specific ngrok tunnel (or all sub-domains)
    allowedHosts: [
      "localhost",
      // your exact tunnel:
      "2aaf-102-88-112-78.ngrok-free.app",
      // —or— to allow any ngrok-free.app subdomain:
      // ".ngrok-free.app"
    ],
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ["console.log", "console.warn"],
      },
      format: {
        comments: false,
      },
      mangle: true,
    },
  },
});

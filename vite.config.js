import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/",
  server: {
    port: 3000, // 👈 Set dev server port here
  },
  define: {
    global: {}, // 👈 Needed for Buffer to work
  },
  optimizeDeps: {
    include: ["buffer"], // 👈 Ensures buffer is bundled correctly
  },
  build: {
    outDir: "dist",
    sourcemap: false, // Disable source maps in production
    minify: "terser", // Use Terser
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

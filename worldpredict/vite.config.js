import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // Proxy API calls đến backend trong dev mode
    proxy: {
      "/api": {
        target: "https://worldpredict-backend.onrender.com",
        changeOrigin: true,
      },
    },
  },
});

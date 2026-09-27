import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  base: "/media-demo/",
  build: {
    rollupOptions: {
      input: {
        main: "index.html",
        waveform: "waveform/index.html",
      },
    },
  },
  test: {
    environment: "node",
    passWithNoTests: true,
  },
});

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { fileURLToPath } from 'url'; // Import fileURLToPath for ESM __dirname equivalent

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(async () => ({ // Make the function async
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    (await import("@dyad-sh/react-vite-component-tagger")).default(), // Dynamic import
    react()
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
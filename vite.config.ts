import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(async () => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    (await import("@dyad-sh/react-vite-component-tagger")).default(),
    react({
      jsxImportSource: "react" // Explicitly tell SWC to use React's JSX runtime
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
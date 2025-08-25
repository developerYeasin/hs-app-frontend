import { createRoot } from "react-dom/client";
import App from "./App.tsx"; // Note the .tsx extension
import "./globals.css";

createRoot(document.getElementById("root")!).render(<App />);
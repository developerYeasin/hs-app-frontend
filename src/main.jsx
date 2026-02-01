import { createRoot } from "react-dom/client";
import App from "./App.jsx"; // Note the .jsx extension
import "./globals.css";

createRoot(document.getElementById("root")).render(<App />);
import "./app";   // first: defineApp() runs before any kit module reads its config
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles/globals.css";
import { registerSW } from "@tinymachines/kit/lib/pwa";
import { startTheme } from "@tinymachines/kit/lib/theme";

startTheme();
registerSW();

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);

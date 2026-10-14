// Hands the app's configuration to the kit. main.tsx imports this file first, so defineApp() has
// run before any kit module reads its config.
import { defineApp } from "@tinymachines/kit/app";
import { APP } from "./app.config";
defineApp(APP);

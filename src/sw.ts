/// <reference lib="webworker" />
// The service worker: the kit's, with this app's choices. The build fills in self.__WB_MANIFEST. The instrument's
// own addresses (src/api-paths.ts) pass straight through: never cached, never answered by the shell.
import { startWorker } from "@tinymachines/kit/sw";
import { API_PATH } from "./api-paths";
declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: { url: string; revision: string | null }[] };
startWorker({ manifest: self.__WB_MANIFEST, prefix: "hotbits", pass: API_PATH, force: import.meta.env.VITE_FORCE_UPDATE === "1" });

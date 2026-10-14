/// <reference lib="webworker" />
// The service worker: the kit's, with this app's choices. The build fills in self.__WB_MANIFEST.
import { startWorker } from "@tinymachines/kit/sw";
declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: { url: string; revision: string | null }[] };
startWorker({ manifest: self.__WB_MANIFEST, prefix: "hotbits", pass: /^\/api(\/|$)/, force: import.meta.env.VITE_FORCE_UPDATE === "1" });

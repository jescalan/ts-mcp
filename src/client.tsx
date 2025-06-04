import { hydrateRoot } from "react-dom/client";
import { StartClient } from "@tanstack/react-start";

import { createRouter } from "./router";

if (typeof window !== "undefined") {
  window.process.on = () => {};
}

const router = createRouter();

hydrateRoot(document, <StartClient router={router} />);

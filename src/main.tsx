import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "@/app/App";
import "@/app/styles.css";
import { MockShipmentEventSource } from "@/mocks/realtime-source";

const appRealtimeSource = new MockShipmentEventSource();
const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("The application root element was not found.");
}

async function enableMocking() {
  if (!import.meta.env.DEV) {
    return;
  }

  const { worker } = await import("@/mocks/browser");
  await worker.start({ onUnhandledRequest: "bypass" });
}

void enableMocking().then(() => {
  createRoot(rootElement).render(
    <StrictMode>
      <App realtimeSource={appRealtimeSource} />
    </StrictMode>,
  );
});

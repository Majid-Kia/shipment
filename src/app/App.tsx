import { RouterProvider } from "react-router";

import { AppProviders } from "@/app/providers";
import { browserRouter } from "@/app/router";
import type { ShipmentEventSource } from "@/realtime/contracts";

function App({ realtimeSource }: { realtimeSource: ShipmentEventSource }) {
  return (
    <AppProviders realtimeSource={realtimeSource}>
      <RouterProvider router={browserRouter} />
    </AppProviders>
  );
}

export default App;

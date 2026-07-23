import { RouterProvider } from "react-router";

import { AppProviders } from "@/app/providers";
import { browserRouter } from "@/app/router";

function App() {
  return (
    <AppProviders>
      <RouterProvider router={browserRouter} />
    </AppProviders>
  );
}

export default App;

import { Navigate, type RouteObject, createBrowserRouter } from "react-router";

import { AppShell } from "@/app/shell";
import { OperationsPage } from "@/features/operations/ui/OperationsPage";

export const appRoutes = [
  {
    element: <AppShell />,
    children: [
      {
        index: true,
        element: <Navigate replace to="/operations" />,
      },
      {
        path: "operations",
        element: <OperationsPage />,
      },
      {
        path: "*",
        element: <Navigate replace to="/operations" />,
      },
    ],
  },
] satisfies RouteObject[];

export const browserRouter = createBrowserRouter(appRoutes);

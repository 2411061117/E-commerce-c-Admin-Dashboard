import { createBrowserRouter } from "react-router-dom";
import { RootLayout } from "../app/RootLayout";
import { RequireAdmin } from "../modules/auth/RouteGuards";
import { HomePage } from "../pages/HomePage";
import { LoginPage } from "../pages/LoginPage";
import { NotFoundPage } from "../pages/NotFoundPage";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    path: "/",
    element: (
      <RequireAdmin>
        <RootLayout />
      </RequireAdmin>
    ),
    children: [
      { index: true, element: <HomePage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);

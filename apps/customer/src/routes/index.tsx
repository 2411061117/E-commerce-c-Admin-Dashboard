import { createBrowserRouter } from "react-router-dom";
import { RootLayout } from "../app/RootLayout";
import { RequireAuth } from "../modules/auth/RouteGuards";
import { AccountPage } from "../pages/AccountPage";
import { HomePage } from "../pages/HomePage";
import { LoginPage } from "../pages/LoginPage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { RegisterPage } from "../pages/RegisterPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "login", element: <LoginPage /> },
      { path: "register", element: <RegisterPage /> },
      {
        path: "account",
        element: (
          <RequireAuth>
            <AccountPage />
          </RequireAuth>
        ),
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);

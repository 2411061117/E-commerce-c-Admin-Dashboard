import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConfigProvider } from "antd";
import { type ReactNode, useState } from "react";
import { AuthProvider } from "../modules/auth/AuthProvider";

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider>
        <AuthProvider>{children}</AuthProvider>
      </ConfigProvider>
    </QueryClientProvider>
  );
}

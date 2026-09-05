import type { Session, User } from "@ecommerce/supabase-client";
import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { ConfigErrorScreen } from "../../app/ConfigErrorScreen";
import { getSupabaseClient } from "../../lib/supabase";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  isInitializing: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [configError, setConfigError] = useState<Error | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    let client;
    try {
      client = getSupabaseClient();
    } catch (error) {
      setConfigError(error as Error);
      setIsInitializing(false);
      return;
    }

    client.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsInitializing(false);
    });

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      if (event === "SIGNED_OUT") {
        queryClient.clear();
      }
    });

    return () => subscription.unsubscribe();
  }, [queryClient]);

  if (configError) {
    return <ConfigErrorScreen message={configError.message} />;
  }

  return (
    <AuthContext.Provider
      value={{ session, user: session?.user ?? null, isInitializing }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}

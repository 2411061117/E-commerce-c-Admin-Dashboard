import type { SignInInput } from "@ecommerce/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchProfile, signIn, signOut } from "./api";
import { useAuth } from "./AuthProvider";

export function useProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["profile", user?.id],
    queryFn: () => {
      if (!user) {
        throw new Error("No authenticated user");
      }
      return fetchProfile(user.id);
    },
    enabled: !!user,
  });
}

export function useSignIn() {
  return useMutation({
    mutationFn: (input: SignInInput) => signIn(input),
  });
}

export function useSignOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: signOut,
    onSuccess: () => {
      queryClient.clear();
    },
  });
}

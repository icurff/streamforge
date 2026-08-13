import { useMutation, useQueryClient } from "@tanstack/react-query";
import CustomAxios from "@/config/CustomAxios";
import { AppUser } from "@/hooks/User/useListUsers";

export type CreateUserInput = {
  username: string;
  email: string;
  password: string;
  isAdmin?: boolean;
};

async function createUser(input: CreateUserInput): Promise<void> {
  // Create via auth sign-up (returns a message only)
  await CustomAxios.post("/api/auth/sign-up", {
    username: input.username,
    email: input.email,
    password: input.password,
  });

  // Optionally promote to admin: fetch users to find newly created user by email or username
  if (input.isAdmin) {
    const res = await CustomAxios.get<AppUser[]>("/api/users/");
    const users = res.data ?? [];
    const created = users.find(
      (u) => u.email?.toLowerCase() === input.email.toLowerCase() || u.username === input.username
    );
    if (created?.id) {
      await CustomAxios.put(`/api/users/${created.id}/roles`, {
        roles: ["ROLE_USER", "ROLE_ADMIN"],
      });
    }
  }
}

export function useCreateUserMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createUser,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });
}



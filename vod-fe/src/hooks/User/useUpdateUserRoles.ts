import { useMutation, useQueryClient } from "@tanstack/react-query";
import CustomAxios from "@/config/CustomAxios";

export type UpdateUserRolesInput = {
  userId: string;
  roles: ("ROLE_USER" | "ROLE_ADMIN")[];
};

async function updateUserRoles({ userId, roles }: UpdateUserRolesInput): Promise<void> {
  await CustomAxios.put(`/api/users/${userId}/roles`, { roles });
}

export function useUpdateUserRolesMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateUserRoles,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });
}









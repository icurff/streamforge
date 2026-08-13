import { useMutation, useQueryClient } from "@tanstack/react-query";
import CustomAxios from "@/config/CustomAxios";

async function deleteUser(userId: string): Promise<void> {
  await CustomAxios.delete(`/api/users/${userId}`);
}

export function useDeleteUserMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteUser,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });
}









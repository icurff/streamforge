import { useMutation, useQueryClient } from "@tanstack/react-query";
import CustomAxios from "@/config/CustomAxios";

async function deleteServer(serverId: string): Promise<void> {
  await CustomAxios.delete(`/api/servers/${serverId}`);
}

export function useDeleteServerMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteServer,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin", "servers"] });
    },
  });
}









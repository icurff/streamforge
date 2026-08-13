import { useMutation, useQueryClient } from "@tanstack/react-query";
import CustomAxios from "@/config/CustomAxios";

export type UpdateServerInput = {
  serverId: string;
  name: string;
  ip: string;
};

async function updateServer({ serverId, name, ip }: UpdateServerInput): Promise<void> {
  await CustomAxios.put(`/api/servers/${serverId}`, { name, ip });
}

export function useUpdateServerMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateServer,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin", "servers"] });
    },
  });
}









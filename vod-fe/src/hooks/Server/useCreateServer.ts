import { useMutation, useQueryClient } from "@tanstack/react-query";
import CustomAxios from "@/config/CustomAxios";

export type CreateServerInput = {
  name: string;
  ip: string;
};

async function createServer(input: CreateServerInput): Promise<void> {
  await CustomAxios.post(`/api/servers/`, input);
}

export function useCreateServerMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createServer,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin", "servers"] });
    },
  });
}









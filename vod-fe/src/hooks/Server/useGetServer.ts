import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import CustomAxios from "@/config/CustomAxios";
import type { AppServer } from "@/hooks/Server/useListServers";

async function fetchServer(serverId: string): Promise<AppServer> {
  const res = await CustomAxios.get<AppServer>(`/api/servers/${serverId}`);
  return res.data;
}

export function useGetServer(serverId: string | undefined): UseQueryResult<AppServer, Error> {
  return useQuery<AppServer, Error>({
    queryKey: ["admin", "servers", serverId],
    queryFn: () => fetchServer(serverId as string),
    enabled: !!serverId,
  });
}









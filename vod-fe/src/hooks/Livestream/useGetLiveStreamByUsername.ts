import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import axios from "@/config/CustomAxios";

export type LiveStreamInfo = {
  id?: string;
  username: string;
  title?: string;
  description?: string;
  isLive: boolean;
  streamEndpoint?: string;
  message?: string;
};

async function fetchLiveStreamByUsername(
  username: string
): Promise<LiveStreamInfo> {
  const res = await axios.get(`/api/livestream/user/${username}`);
  return res.data as LiveStreamInfo;
}

export function useGetLiveStreamByUsername(
  username: string
): UseQueryResult<LiveStreamInfo, Error> {
  return useQuery({
    queryKey: ["liveStream", username],
    queryFn: () => fetchLiveStreamByUsername(username),
    enabled: !!username,
    refetchInterval: (data) => {
      // Poll every 5 seconds if live, otherwise every 30 seconds
      return data?.isLive ? 5000 : 30000;
    },
  });
}





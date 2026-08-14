import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import axios from "@/config/CustomAxios";

type LikeInfo = {
  likeCount: number;
  isLiked: boolean;
};

async function fetchLikeInfo(contentId: string): Promise<LikeInfo> {
  const res = await axios.get(`/api/videos/${contentId}/like-info`);
  return res.data;
}

export function useGetLikeInfo(
  contentId: string, 
  contentType: string = "video",
  enabled = true
): UseQueryResult<LikeInfo, Error> {
  return useQuery({
    queryKey: ["likeInfo", contentId, contentType],
    queryFn: () => fetchLikeInfo(contentId),
    enabled: enabled && !!contentId,
  });
}

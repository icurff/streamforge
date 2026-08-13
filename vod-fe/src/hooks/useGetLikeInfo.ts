import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import axios from "@/config/CustomAxios";

type LikeInfo = {
  likeCount: number;
  isLiked: boolean;
};

async function fetchLikeInfo(contentId: string, contentType: "video" | "livestream"): Promise<LikeInfo> {
  const endpoint = contentType === "video"
    ? `/api/videos/${contentId}/like-info`
    : `/api/livestream/${contentId}/like-info`;
  const res = await axios.get(endpoint);
  return res.data;
}

export function useGetLikeInfo(
  contentId: string, 
  contentType: "video" | "livestream",
  enabled = true
): UseQueryResult<LikeInfo, Error> {
  return useQuery({
    queryKey: ["likeInfo", contentId, contentType],
    queryFn: () => fetchLikeInfo(contentId, contentType),
    enabled: enabled && !!contentId,
  });
}

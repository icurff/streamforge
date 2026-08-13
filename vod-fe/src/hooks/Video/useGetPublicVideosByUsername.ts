import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import axios from "@/config/CustomAxios";
import { type VideoPrivacy } from "@/types/video";

export type PublicVideo = {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  uploadedDate: string;
  privacy: VideoPrivacy;
  username: string;
  duration?: number;
};

async function fetchPublicVideosByUsername(
  username: string,
  limit: number
): Promise<PublicVideo[]> {
  try {
    const res = await axios.get(`/api/videos/user/${username}`, {
      params: { limit },
    });
    // Ensure we always return an array
    if (Array.isArray(res.data)) {
      return res.data as PublicVideo[];
    }
    return [];
  } catch (error) {
    // Return empty array on error
    return [];
  }
}

export function useGetPublicVideosByUsername(
  username: string,
  limit = 50
): UseQueryResult<PublicVideo[], Error> {
  return useQuery({
    queryKey: ["publicVideos", username, limit],
    queryFn: () => fetchPublicVideosByUsername(username, limit),
    enabled: !!username,
  });
}


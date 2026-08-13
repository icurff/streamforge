import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import axios from "@/config/CustomAxios";
import { type VideoPrivacy } from "@/types/video";

export type LikedVideo = {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  uploadedDate: string;
  privacy: VideoPrivacy;
  username: string;
  likedAt?: string;
  duration?: number;
  type?: "video" | "livestream";
  serverLocation?: string;
  dvrPath?: string;
  server_locations?: string[];
};

async function fetchLikedVideos(limit: number): Promise<LikedVideo[]> {
  try {
    const res = await axios.get(`/api/videos/liked`, {
      params: { limit },
    });
    if (Array.isArray(res.data)) {
      return res.data as LikedVideo[];
    }
    return [];
  } catch (error) {
    return [];
  }
}

export function useGetLikedVideos(limit = 50): UseQueryResult<LikedVideo[], Error> {
  return useQuery({
    queryKey: ["likedVideos", limit],
    queryFn: () => fetchLikedVideos(limit),
  });
}


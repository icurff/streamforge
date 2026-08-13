import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import axios from "@/config/CustomAxios";
import { type VideoPrivacy } from "@/types/video";

export type RecentVideo = {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  uploadedDate: string;
  privacy: VideoPrivacy;
  duration?: number;
};

async function fetchRecentVideos(limit: number): Promise<RecentVideo[]> {
  try {
    const res = await axios.get(`/api/videos/recent`, { params: { limit } });
    // Ensure we always return an array
    if (Array.isArray(res.data)) {
      return res.data as RecentVideo[];
    }
    return [];
  } catch (error) {
    // Return empty array on error
    return [];
  }
}

export function useListRecentVideos(limit = 12): UseQueryResult<RecentVideo[], Error> {
  return useQuery({ queryKey: ["recentVideos", limit], queryFn: () => fetchRecentVideos(limit) });
}







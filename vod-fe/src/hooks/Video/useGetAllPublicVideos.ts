import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import axios from "@/config/CustomAxios";
import { type VideoPrivacy } from "@/types/video";

export type PublicVideo = {
  id: string;
  username: string;
  title: string;
  description: string;
  thumbnail: string;
  uploadedDate: string;
  privacy: VideoPrivacy;
};

async function fetchAllPublicVideos(limit: number): Promise<PublicVideo[]> {
  try {
    const res = await axios.get(`/api/videos/public`, {
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

export function useGetAllPublicVideos(
  limit = 50
): UseQueryResult<PublicVideo[], Error> {
  return useQuery({
    queryKey: ["allPublicVideos", limit],
    queryFn: () => fetchAllPublicVideos(limit),
  });
}


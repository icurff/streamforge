import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import axios from "@/config/CustomAxios";

export type PublicLivestream = {
  id: string;
  username: string;
  title: string;
  description: string;
  thumbnail: string;
  duration: number;
  dvrPath: string;
  uploadedDate: string;
  privacy?: string;
};

async function fetchAllPublicLivestreams(limit: number): Promise<PublicLivestream[]> {
  try {
    const res = await axios.get(`/api/livestream/public`, {
      params: { limit },
    });
    // Ensure we always return an array
    if (Array.isArray(res.data)) {
      return res.data as PublicLivestream[];
    }
    return [];
  } catch (error) {
    // Return empty array on error
    return [];
  }
}

export function useGetAllPublicLivestreams(
  limit = 50
): UseQueryResult<PublicLivestream[], Error> {
  return useQuery({
    queryKey: ["allPublicLivestreams", limit],
    queryFn: () => fetchAllPublicLivestreams(limit),
  });
}





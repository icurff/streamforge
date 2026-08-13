import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import axios from "@/config/CustomAxios";
import { type VideoPrivacy } from "@/types/video";

export type HistoryVideo = {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  uploadedDate: string;
  privacy: VideoPrivacy;
  username: string;
  watchedAt?: string;
  duration?: number;
};

async function fetchHistory(limit: number): Promise<HistoryVideo[]> {
  try {
    const res = await axios.get(`/api/videos/history`, {
      params: { limit },
    });
    if (Array.isArray(res.data)) {
      return res.data as HistoryVideo[];
    }
    return [];
  } catch (error) {
    return [];
  }
}

export function useGetHistory(limit = 50): UseQueryResult<HistoryVideo[], Error> {
  return useQuery({
    queryKey: ["history", limit],
    queryFn: () => fetchHistory(limit),
  });
}


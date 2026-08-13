import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import axios from "@/config/CustomAxios";

export type LivestreamRecording = {
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

async function fetchLivestreamRecordingsByUsername(
  username: string,
  limit: number
): Promise<LivestreamRecording[]> {
  try {
    const res = await axios.get(`/api/livestream/user/${username}/recordings`, {
      params: { limit },
    });
    // Ensure we always return an array
    if (Array.isArray(res.data)) {
      return res.data as LivestreamRecording[];
    }
    return [];
  } catch (error) {
    // Return empty array on error
    return [];
  }
}

export function useGetLivestreamRecordingsByUsername(
  username: string,
  limit = 50
): UseQueryResult<LivestreamRecording[], Error> {
  return useQuery({
    queryKey: ["livestreamRecordings", username, limit],
    queryFn: () => fetchLivestreamRecordingsByUsername(username, limit),
    enabled: !!username,
  });
}


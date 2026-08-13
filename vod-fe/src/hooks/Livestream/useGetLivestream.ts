import { useQuery, UseQueryResult } from "@tanstack/react-query";
import CustomAxios from "@/config/CustomAxios";

export type Livestream = {
  id: string;
  username: string;
  title: string;
  description: string;
  thumbnail: string;
  duration: number;
  serverLocation: string;
  privacy: string;
  dvrPath: string;
  uploadedDate: string;
  lastModifiedDate: string;
};

async function fetchLivestream(livestreamId: string): Promise<Livestream> {
  const res = await CustomAxios.get<Livestream>(`/api/livestream/${livestreamId}`);
  return res.data;
}

export function useGetLivestream(livestreamId: string | undefined): UseQueryResult<Livestream, Error> {
  return useQuery<Livestream, Error>({
    queryKey: ["livestream", livestreamId],
    queryFn: () => fetchLivestream(livestreamId!),
    enabled: !!livestreamId,
  });
}





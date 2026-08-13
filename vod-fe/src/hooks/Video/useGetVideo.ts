import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import axios from "@/config/CustomAxios";
import { type VideoPrivacy } from "@/types/video";

export type Video = {
  id: string;
  username: string;
  title: string;
  description: string;
  thumbnail: string;
  server_locations: string[];
  resolutions: string[];
  uploadedDate: string;
  lastModifiedDate?: string;
  privacy: VideoPrivacy;
};

async function fetchVideo(videoId: string): Promise<Video> {
  const res = await axios.get(`/api/videos/${videoId}`);
  return res.data as Video;
}

export function useGetVideo(videoId: string): UseQueryResult<Video, Error> {
  return useQuery({
    queryKey: ["video", videoId],
    queryFn: () => fetchVideo(videoId),
    enabled: !!videoId,
  });
}




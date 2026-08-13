import { useMutation, useQueryClient, UseMutationResult } from "@tanstack/react-query";
import CustomAxios from "@/config/CustomAxios";
import type { AxiosError } from "axios";
import type { Video } from "./useGetVideo";

async function uploadVideoThumbnail(videoId: string, file: File): Promise<Video> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await CustomAxios.post<Video>(
    `/api/videos/${videoId}/thumbnail`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
  return res.data;
}

export function useUploadVideoThumbnail(): UseMutationResult<Video, Error, { videoId: string; file: File }> {
  const queryClient = useQueryClient();

  return useMutation<Video, Error, { videoId: string; file: File }>({
    mutationFn: ({ videoId, file }) => uploadVideoThumbnail(videoId, file),
    onSuccess: (data, variables) => {
      // Invalidate video queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["video", variables.videoId] });
      queryClient.invalidateQueries({ queryKey: ["recentVideos"] });
      queryClient.invalidateQueries({ queryKey: ["publicVideos"] });
    },
  });
}





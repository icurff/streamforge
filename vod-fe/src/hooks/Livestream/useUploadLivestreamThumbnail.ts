import { useMutation, useQueryClient, UseMutationResult } from "@tanstack/react-query";
import CustomAxios from "@/config/CustomAxios";
import type { AxiosError } from "axios";

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

async function uploadLivestreamThumbnail(livestreamId: string, file: File): Promise<Livestream> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await CustomAxios.post<Livestream>(
    `/api/livestream/${livestreamId}/thumbnail`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
  return res.data;
}

export function useUploadLivestreamThumbnail(): UseMutationResult<Livestream, Error, { livestreamId: string; file: File }> {
  const queryClient = useQueryClient();

  return useMutation<Livestream, Error, { livestreamId: string; file: File }>({
    mutationFn: ({ livestreamId, file }) => uploadLivestreamThumbnail(livestreamId, file),
    onSuccess: (data, variables) => {
      // Invalidate livestream queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["livestream", variables.livestreamId] });
      queryClient.invalidateQueries({ queryKey: ["livestreamRecordings"] });
    },
  });
}





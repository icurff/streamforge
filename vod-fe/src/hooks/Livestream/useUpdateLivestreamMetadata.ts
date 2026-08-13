import { useMutation, useQueryClient, UseMutationResult } from "@tanstack/react-query";
import CustomAxios from "@/config/CustomAxios";
import type { AxiosError } from "axios";
import type { Livestream } from "./useGetLivestream";

export type UpdateLivestreamMetadataInput = {
  livestreamId: string;
  title: string;
  description: string;
};

async function updateLivestreamMetadata(input: UpdateLivestreamMetadataInput): Promise<Livestream> {
  const res = await CustomAxios.patch<Livestream>(
    `/api/livestream/${input.livestreamId}`,
    {
      title: input.title,
      description: input.description,
    }
  );
  return res.data;
}

export function useUpdateLivestreamMetadata(): UseMutationResult<Livestream, Error, UpdateLivestreamMetadataInput> {
  const queryClient = useQueryClient();

  return useMutation<Livestream, Error, UpdateLivestreamMetadataInput>({
    mutationFn: updateLivestreamMetadata,
    onSuccess: (data, variables) => {
      // Invalidate livestream queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["livestream", variables.livestreamId] });
      queryClient.invalidateQueries({ queryKey: ["livestreamRecordings"] });
      queryClient.invalidateQueries({ queryKey: ["liveStream"] });
    },
  });
}





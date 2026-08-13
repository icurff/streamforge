import { useMutation, useQueryClient, UseMutationResult } from "@tanstack/react-query";
import CustomAxios from "@/config/CustomAxios";
import type { AxiosError } from "axios";
import type { AppUser } from "./useListUsers";

async function uploadAvatar(userId: string, file: File): Promise<AppUser> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await CustomAxios.post<AppUser>(
    `/api/users/${userId}/avatar`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
  return res.data;
}

export function useUploadAvatar(): UseMutationResult<AppUser, Error, { userId: string; file: File }> {
  const queryClient = useQueryClient();

  return useMutation<AppUser, Error, { userId: string; file: File }>({
    mutationFn: ({ userId, file }) => uploadAvatar(userId, file),
    onSuccess: () => {
      // Invalidate auth user and user queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["authUser"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });
}





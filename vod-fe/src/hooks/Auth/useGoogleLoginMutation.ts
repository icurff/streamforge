import CustomAxios from "../../config/CustomAxios";
import accessToken from "../../utils/LocalStorage";
import { useMutation, useQueryClient, UseMutationResult } from "@tanstack/react-query";

type GoogleLoginResponse = {
  token: string;
};

async function googleLogin(locationSearch: string): Promise<void> {
  try {
    const res = await CustomAxios.get<GoogleLoginResponse>(
      `/api/auth/google/callback` + locationSearch,
    );
    accessToken.addAccessToken(res.data.token);
  } catch (error: any) {
    const message = error?.response?.data?.error ?? "Google login failed";
    throw new Error(message);
  }
}

export function useGoogleLoginMutation(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: googleLogin,
    onSuccess: () => {
      // Invalidate the authUser query to refresh data
      queryClient.invalidateQueries({ queryKey: ["authUser"] });
      console.log("login successful");
    },
    onError: (error) => {
      console.error(error.message);
    },
  });
}



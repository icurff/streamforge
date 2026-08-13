import CustomAxios from "../../config/CustomAxios";
import accessToken from "../../utils/LocalStorage";
import { useMutation, useQueryClient, UseMutationResult } from "@tanstack/react-query";
import type { AuthUser } from "./useLoginMutation";

export type RegisterInput = {
  username?: string;
  email: string;
  password: string;
};

type RegisterResponse = {
  token: string;
  user: AuthUser;
};

async function register(registerInput: RegisterInput): Promise<AuthUser> {
  try {
    const res = await CustomAxios.post<RegisterResponse>("/api/auth/sign-up", {
      username: registerInput.username,
      email: registerInput.email,
      password: registerInput.password,
    });
    accessToken.addAccessToken(res.data.token);
    return res.data.user;
  } catch (error: any) {
    const message = error?.response?.data?.error ?? "Register failed";
    throw new Error(message);
  }
}

export function useRegisterMutation(): UseMutationResult<AuthUser, Error, RegisterInput> {
  const queryClient = useQueryClient();

  return useMutation<AuthUser, Error, RegisterInput>({
    mutationFn: register,
    onSuccess: (userData) => {
      // Invalidate the authUser query to refresh data
      queryClient.invalidateQueries({ queryKey: ["authUser"] });
      console.log("register successful");
    },
    onError: (error) => {
      console.error(error.message);
    },
  });
}



import CustomAxios from "../../config/CustomAxios";
import accessToken from "../../utils/LocalStorage";
import { useMutation, useQueryClient, UseMutationResult } from "@tanstack/react-query";
import type { AxiosError } from "axios";

export type LoginInput = {
  username: string;
  password: string;
};

export type AuthUser = {
  id?: string | number;
  email?: string;
  name?: string;
  username?: string;
  avatar?: string;
  isAdmin?: boolean;
  roles?: string[];
};

type LoginResponse = {
  token: string;
  user: AuthUser;
};

async function login(loginInput: LoginInput): Promise<AuthUser> {
  try {
    const res = await CustomAxios.post<LoginResponse>("/api/auth/login", {
      username: loginInput.username,
      password: loginInput.password,
    });
    accessToken.addAccessToken(res.data.token);
    return res.data.user;
  } catch (error: unknown) {
    const axiosError = error as AxiosError<{ error?: string; message?: string }>;
    const message = axiosError?.response?.data?.error || axiosError?.response?.data?.message || "Login failed";
    throw new Error(message);
  }
}

export function useLoginMutation(): UseMutationResult<AuthUser, Error, LoginInput> {
  const queryClient = useQueryClient();

  return useMutation<AuthUser, Error, LoginInput>({
    mutationFn: login,
    onSuccess: (userData) => {
      // Invalidate the authUser query to refresh data
      queryClient.invalidateQueries({ queryKey: ["authUser"] });
      console.log("Login successful");
    },
    onError: (error) => {
      console.error(error.message);
    },
  });
}



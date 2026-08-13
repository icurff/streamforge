import { useMutation, type UseMutationResult } from "@tanstack/react-query";
import CustomAxios from "../../config/CustomAxios";

type ResetPasswordInput = {
  password: string;
  passwordConfirmation: string;
  token: string;
};

type ResetPasswordResponse = {
  message?: string;
};

async function resetPassword(
  input: ResetPasswordInput
): Promise<ResetPasswordResponse> {
  const res = await CustomAxios.post<ResetPasswordResponse>(
    "/api/auth/reset-password",
    {
      password: input.password,
      password_confirmation: input.passwordConfirmation,
      token: input.token,
    }
  );
  return res.data;
}

export function useResetPasswordMutation(): UseMutationResult<
  ResetPasswordResponse,
  Error,
  ResetPasswordInput
> {
  return useMutation<ResetPasswordResponse, Error, ResetPasswordInput>({
    mutationFn: resetPassword,
  });
}








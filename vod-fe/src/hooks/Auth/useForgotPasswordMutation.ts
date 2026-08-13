import { useMutation, UseMutationResult } from "@tanstack/react-query";
import CustomAxios from "../../config/CustomAxios";

type ForgotResponse = {
  message?: string;
};

async function forgotPassword(email: string): Promise<ForgotResponse> {
  console.log("Forgot password request for email:", email);
  const res = await CustomAxios.post<ForgotResponse>(
    "/api/auth/forgot-password",
    {
      email,
    }
  );
  return res.data;
}

export function useForgotPasswordMutation(): UseMutationResult<
  ForgotResponse,
  Error,
  string
> {
  return useMutation<ForgotResponse, Error, string>({
    mutationFn: forgotPassword,
    onSuccess: () => {
      // side effects handled by callers (e.g., toast)
      // kept minimal here for reusability
    },
    onError: () => {
      // let caller handle UI errors; avoid console noise in production
    },
  });
}

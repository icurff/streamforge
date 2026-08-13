import { useQuery, UseQueryResult } from "@tanstack/react-query";
import accessToken from "../../utils/LocalStorage";
import CustomAxios from "../../config/CustomAxios";
import type { AuthUser } from "./useLoginMutation";

type GetUserEnvelope = {
  user: AuthUser;
};

export async function fetchAuthUser(): Promise<AuthUser | null> {
  const token = accessToken.getAccessToken();
  if (!token) {
    return null; // not logged in yet
  }
  const res = await CustomAxios.get<GetUserEnvelope | AuthUser>("/api/auth/user");
  // Support both shapes: { user: {...} } or direct user object
  const maybeEnvelope = res.data as Partial<GetUserEnvelope> & Partial<AuthUser>;
  const user = (maybeEnvelope as GetUserEnvelope).user ?? (maybeEnvelope as AuthUser);
  return user ?? null;
}

export function useFetchAuthUser(): UseQueryResult<AuthUser | null, Error> {
  return useQuery<AuthUser | null, Error>({
    queryKey: ["authUser"],
    queryFn: fetchAuthUser,
    retry: false,
    refetchOnWindowFocus: false,
  });
}




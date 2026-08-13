import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import CustomAxios from "@/config/CustomAxios";
import type { AppUser } from "./useListUsers";

async function fetchUser(userId: string): Promise<AppUser> {
  const res = await CustomAxios.get<AppUser>(`/api/users/${userId}`);
  return res.data;
}

export function useGetUser(userId: string | undefined): UseQueryResult<AppUser, Error> {
  return useQuery<AppUser, Error>({
    queryKey: ["admin", "users", userId],
    queryFn: () => fetchUser(userId as string),
    enabled: !!userId,
  });
}









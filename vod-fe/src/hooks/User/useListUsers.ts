import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import CustomAxios from "@/config/CustomAxios";

export type AppUser = {
  id: string;
  username: string;
  email: string;
  roles?: string[]; // e.g., ["ROLE_ADMIN", "ROLE_USER"]
  createdDate?: string; // ISO timestamp
};

export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  joinDate: string;
};

export type PagedAdminUsers = {
  rows: AdminUserRow[];
  totalPages: number;
  totalElements: number;
  page: number;
  size: number;
};

async function fetchUsers(page: number, size: number): Promise<PagedAdminUsers> {
  const res = await CustomAxios.get(
    `/api/users/?page=${encodeURIComponent(page)}&size=${encodeURIComponent(size)}`
  );
  const data = res.data as {
    content: AppUser[];
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
  };
  const rows: AdminUserRow[] = (data.content || []).map((u) => {
    const hasAdmin = (u.roles || []).includes("ROLE_ADMIN");
    const roleLabel = hasAdmin ? "Admin" : "User";
    const joinDate = u.createdDate
      ? new Date(u.createdDate).toLocaleString()
      : "";
    return {
      id: u.id,
      name: u.username,
      email: u.email,
      role: roleLabel,
      joinDate,
    };
  });
  return {
    rows,
    totalPages: data.totalPages ?? 1,
    totalElements: data.totalElements ?? rows.length,
    page: data.page ?? page,
    size: data.size ?? size,
  };
}

export function useListUsers(page: number, size: number): UseQueryResult<PagedAdminUsers, Error> {
  return useQuery<PagedAdminUsers, Error>({
    queryKey: ["admin", "users", page, size],
    queryFn: () => fetchUsers(page, size),
    staleTime: 10_000,
  });
}



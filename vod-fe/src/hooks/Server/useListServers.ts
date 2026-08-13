import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import CustomAxios from "@/config/CustomAxios";

export type ServerSpecification = {
  ram: number;
  ram_usage: number;
  cpu: number;
  cpu_usage: number;
  disk: number;
  disk_usage: number;
};

export type AppServer = {
  id: string;
  name: string;
  ip: string;
  status: string; // EServerStatus
  current_load?: number;
  specification?: ServerSpecification;
  createdDate?: string;
  lastModifiedDate?: string;
};

export type AdminServerRow = {
  id: string;
  name: string;
  status: string;
  cpu: number; // CPU usage percentage
  cpuCores: number; // Total CPU cores
  memory: number; // RAM usage percentage
  ramTotal: number; // Total RAM in GB
  disk: number; // Disk usage percentage
  diskTotal: number; // Total Disk in GB
  location: string;
  uptime?: string;
};

export type AdminServers = {
  rows: AdminServerRow[];
};

// Mock data for local development with slight variations for realistic charts
const getMockServers = (): AdminServers => {
  const now = new Date();
  // Add small random variation (±2%) to make charts look more dynamic
  const variation = () => (Math.random() - 0.5) * 4;

  return {
    rows: [
      {
        id: "mock-server-1",
        name: "SubServer 1",
        status: "UP",
        cpu: Math.max(0, Math.min(100, 35.5 + variation())),
        cpuCores: 8,
        memory: Math.max(0, Math.min(100, 42.3 + variation())),
        ramTotal: 32,
        disk: Math.max(0, Math.min(100, 58.7 + variation())),
        diskTotal: 500,
        location: "18.143.196.51",
        uptime: now.toLocaleString(),
      },
      {
        id: "mock-server-2",
        name: "SubServer 2",
        status: "UP",
        cpu: Math.max(0, Math.min(100, 28.2 + variation())),
        cpuCores: 8,
        memory: Math.max(0, Math.min(100, 38.9 + variation())),
        ramTotal: 32,
        disk: Math.max(0, Math.min(100, 45.2 + variation())),
        diskTotal: 500,
        location: "47.129.214.55",
        uptime: now.toLocaleString(),
      },
      {
        id: "mock-server-3",
        name: "SubServer 3",
        status: "UP",
        cpu: Math.max(0, Math.min(100, 52.8 + variation())),
        cpuCores: 8,
        memory: Math.max(0, Math.min(100, 61.4 + variation())),
        ramTotal: 32,
        disk: Math.max(0, Math.min(100, 72.1 + variation())),
        diskTotal: 500,
        location: "13.214.200.242",
        uptime: now.toLocaleString(),
      },
    ],
  };
};

async function fetchServers(): Promise<AdminServers> {
  try {
    const res = await CustomAxios.get<AppServer[]>(`/api/servers/`);
    const servers = res.data ?? [];

    // If no servers returned and we're in local development, use mock data
    if (
      servers.length === 0 &&
      (import.meta.env.DEV || window.location.hostname === "localhost")
    ) {
      return getMockServers();
    }

    const rows: AdminServerRow[] = servers.map((s) => {
      const spec = s.specification ?? ({} as ServerSpecification);
      return {
        id: s.id,
        name: s.name ?? s.ip ?? "Server",
        status: s.status ?? "UNKNOWN",
        cpu: Number(spec.cpu_usage ?? 0),
        cpuCores: Number(spec.cpu ?? 0),
        memory: Number(spec.ram_usage ?? 0),
        ramTotal: Number(spec.ram ?? 0),
        disk: Number(spec.disk_usage ?? 0),
        diskTotal: Number(spec.disk ?? 0),
        location: s.ip ?? "-",
        uptime: s.lastModifiedDate
          ? new Date(s.lastModifiedDate).toLocaleString()
          : s.createdDate
          ? new Date(s.createdDate).toLocaleString()
          : undefined,
      };
    });
    return { rows };
  } catch (error) {
    // If API call fails and we're in local development, use mock data
    if (import.meta.env.DEV || window.location.hostname === "localhost") {
      console.warn("Failed to fetch servers, using mock data:", error);
      return getMockServers();
    }
    throw error;
  }
}

export function useListServers(): UseQueryResult<AdminServers, Error> {
  return useQuery<AdminServers, Error>({
    queryKey: ["admin", "servers"],
    queryFn: fetchServers,
    staleTime: 10_000,
  });
}

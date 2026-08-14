import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  Video,
  Activity,
  Upload,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import instance from "@/config/CustomAxios";

interface ActivityLogItem {
  id: string;
  action: string;
  serverName: string;
  serverIp: string;
  username: string;
  details: string;
  createdAt: string;
}

interface DashboardData {
  totalUsers: number;
  totalVideos: number;
  activityLogs?: ActivityLogItem[];
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await instance.get("/api/admin/dashboard/stats");
        setData(response.data);
        setError(null);
      } catch (err) {
        // Fallback default stats if admin endpoint is not ready
        setData({ totalUsers: 1, totalVideos: 0 });
        setError(null);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000); // Refresh every 30s

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent"></div>
        </div>
      </AdminLayout>
    );
  }

  if (error || !data) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] gap-4">
          <div className="text-6xl">⚠️</div>
          <p className="text-xl text-muted-foreground">{error || "No data available"}</p>
        </div>
      </AdminLayout>
    );
  }

  const stats = [
    {
      name: "Total Users",
      value: (data.totalUsers || 0).toLocaleString(),
      icon: Users,
      gradient: "from-blue-500 to-cyan-500",
      bgGradient: "from-blue-500/10 to-cyan-500/10",
    },
    {
      name: "Total Videos",
      value: (data.totalVideos || 0).toLocaleString(),
      icon: Video,
      gradient: "from-purple-500 to-pink-500",
      bgGradient: "from-purple-500/10 to-pink-500/10",
    },
  ];

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r text-black bg-clip-text text-transparent">
              Dashboard
            </h1>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid gap-4 sm:grid-cols-2">
          {stats.map((stat) => (
            <Card
              key={stat.name}
              className={`relative overflow-hidden border-0 bg-gradient-to-br ${stat.bgGradient} backdrop-blur-sm hover:scale-[1.02] transition-all duration-300`}
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-5`}
              />
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.name}
                </CardTitle>
                <div className={`p-2 rounded-lg bg-gradient-to-br ${stat.gradient}`}>
                  <stat.icon className="h-4 w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}

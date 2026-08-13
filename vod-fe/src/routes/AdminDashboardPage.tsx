import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  Video,
  Radio,
  Activity,
  Clock,
  Upload,
  Play,
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
  totalLivestreams: number;
  activeLivestreams: number;
  activityLogs: ActivityLogItem[];
}

const getActionIcon = (action: string) => {
  switch (action) {
    case "UPLOAD_REQUEST":
      return <Upload className="h-4 w-4 text-blue-500" />;
    case "LIVESTREAM_REQUEST":
    case "LIVESTREAM_START":
      return <Play className="h-4 w-4 text-green-500" />;
    case "LIVESTREAM_END":
      return <Radio className="h-4 w-4 text-orange-500" />;
    case "VIDEO_DELETE":
      return <Trash2 className="h-4 w-4 text-red-500" />;
    default:
      return <Activity className="h-4 w-4 text-gray-500" />;
  }
};

const getActionLabel = (action: string) => {
  switch (action) {
    case "UPLOAD_REQUEST":
      return "Upload Request";
    case "LIVESTREAM_REQUEST":
      return "Livestream Request";
    case "LIVESTREAM_START":
      return "Livestream Started";
    case "LIVESTREAM_END":
      return "Livestream Ended";
    case "VIDEO_DELETE":
      return "Video Deleted";
    default:
      return action.replace(/_/g, " ");
  }
};

const getActionColor = (action: string) => {
  switch (action) {
    case "UPLOAD_REQUEST":
      return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    case "LIVESTREAM_REQUEST":
    case "LIVESTREAM_START":
      return "bg-green-500/10 text-green-500 border-green-500/20";
    case "LIVESTREAM_END":
      return "bg-orange-500/10 text-orange-500 border-orange-500/20";
    case "VIDEO_DELETE":
      return "bg-red-500/10 text-red-500 border-red-500/20";
    default:
      return "bg-gray-500/10 text-gray-500 border-gray-500/20";
  }
};

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
        setError("Failed to load dashboard data");
        console.error(err);
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
      value: data.totalUsers.toLocaleString(),
      icon: Users,
      gradient: "from-blue-500 to-cyan-500",
      bgGradient: "from-blue-500/10 to-cyan-500/10",
    },
    {
      name: "Total Videos",
      value: data.totalVideos.toLocaleString(),
      icon: Video,
      gradient: "from-purple-500 to-pink-500",
      bgGradient: "from-purple-500/10 to-pink-500/10",
    },
    {
      name: "Total Livestreams",
      value: data.totalLivestreams.toLocaleString(),
      icon: Radio,
      gradient: "from-orange-500 to-red-500",
      bgGradient: "from-orange-500/10 to-red-500/10",
    },
    {
      name: "Active Livestreams",
      value: data.activeLivestreams.toLocaleString(),
      icon: Activity,
      gradient: "from-green-500 to-emerald-500",
      bgGradient: "from-green-500/10 to-emerald-500/10",
      pulse: data.activeLivestreams > 0,
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
          {/* <div className="text-sm text-muted-foreground">
            Last updated: {new Date().toLocaleTimeString()}
          </div> */}
        </div>

        {/* Stat Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                <div
                  className={`p-2 rounded-lg bg-gradient-to-br ${stat.gradient} ${
                    stat.pulse ? "animate-pulse" : ""
                  }`}
                >
                  <stat.icon className="h-4 w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stat.value}</div>
                {stat.pulse && (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    <span className="text-xs text-green-500 font-medium">Live now</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Activity Logs
        <Card className="border-0 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Request Logs
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Real-time logs of requests sent to subservers
            </p>
          </CardHeader>
          <CardContent>
            {data.activityLogs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No requests logged yet</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                {data.activityLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 p-4 rounded-lg border border-border/50 bg-card/30 hover:bg-card/50 transition-colors"
                  >
                    <div className="mt-0.5">{getActionIcon(log.action)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getActionColor(
                            log.action
                          )}`}
                        >
                          {getActionLabel(log.action)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          → {log.serverName}
                        </span>
                      </div>
                      <p className="text-sm font-medium mb-1">
                        {log.details || `${getActionLabel(log.action)} has been sent to ${log.serverName}`}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>by @{log.username}</span>
                        <span>•</span>
                        <span>{log.serverIp}</span>
                        <span>•</span>
                        <span>{log.createdAt}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card> */}
      </div>
    </AdminLayout>
  );
}

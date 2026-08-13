import { Home, Upload, Bell, LayoutGrid, History, ThumbsUp, Video as VideoIcon, ChevronRight, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Video } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Separator } from "@/components/ui/separator";

const mainNavItems = [
  { icon: Home, label: "Home", href: "/" },
  { icon: LayoutGrid, label: "Feed", href: "/feed" },
  { icon: Video, label: "Livestream", href: "/livestream" },
  { icon: Bell, label: "Subscriptions", href: "/subscriptions" },
];

const youNavItems = [
  { icon: History, label: "History", href: "/history" },
  { icon: ThumbsUp, label: "Liked videos", href: "/liked-videos" },
  { icon: VideoIcon, label: "Your videos", href: null }, // Will navigate to user's channel
];

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const isActive = (href: string | null) => {
    if (!href) return false;
    if (href === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(href);
  };

  const isYourVideosActive = () => {
    if (!user?.username) return false;
    return location.pathname === `/@${user.username}` || location.pathname.startsWith(`/@${user.username}/`);
  };

  const handleYouItemClick = (item: typeof youNavItems[0]) => {
    if (item.href) {
      navigate(item.href);
    } else if (item.label === "Your videos" && user?.username) {
      navigate(`/@${user.username}`);
    }
  };

  return (
    <aside className="w-64 bg-sidebar-bg border-r min-h-screen p-4">
      <div className="space-y-6">
        {/* Main Navigation */}
        <div className="space-y-2">
          {mainNavItems.map((item) => (
            <Button
              key={item.label}
              variant={isActive(item.href) ? "sidebar-active" : "sidebar"}
              className="gap-3 w-full justify-start"
              onClick={() => {
                navigate(item.href);
              }}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Button>
          ))}
        </div>

        {/* Separator */}
        <Separator />

        {/* You Section */}
        <div className="space-y-2">
          <div className="px-3 py-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-sm font-semibold text-foreground">
                You
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </span>
            </div>
          </div>
          {youNavItems.map((item) => {
            const active =
              item.label === "Your videos"
                ? isYourVideosActive()
                : isActive(item.href);
            return (
              <Button
                key={item.label}
                variant={active ? "sidebar-active" : "sidebar"}
                className="gap-3 w-full justify-start"
                onClick={() => handleYouItemClick(item)}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

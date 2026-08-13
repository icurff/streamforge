import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/UserAvatar";
import { Loader2, Users, Video, Play, Bell } from "lucide-react";
import { useGetSubscriptions } from "@/hooks/Subscription/useGetSubscriptions";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUnsubscribe } from "@/hooks/Subscription/useUnsubscribe";
import { useToast } from "@/hooks/use-toast";
import { useGetPublicVideosByUsername } from "@/hooks/Video/useGetPublicVideosByUsername";
import { useState } from "react";

const SubscriptionsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: subscriptionsData, isLoading } = useGetSubscriptions(0, 50);
  const unsubscribeMutation = useUnsubscribe();
  const [unsubscribingChannel, setUnsubscribingChannel] = useState<string | null>(null);

  const handleUnsubscribe = async (channelUsername: string) => {
    const confirmed = window.confirm(
      `Bạn có chắc muốn hủy đăng ký kênh ${channelUsername}?`
    );
    if (!confirmed) return;

    try {
      setUnsubscribingChannel(channelUsername);
      await unsubscribeMutation.mutateAsync(channelUsername);
      toast({
        title: "Đã hủy đăng ký",
        description: `Bạn đã hủy đăng ký kênh ${channelUsername}`,
      });
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.message || "Có lỗi xảy ra",
        variant: "destructive",
      });
    } finally {
      setUnsubscribingChannel(null);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-8">
            <div className="flex items-center justify-center min-h-[60vh]">
              <p className="text-muted-foreground">
                Vui lòng đăng nhập để xem các kênh đã đăng ký
              </p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-8 space-y-8">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Kênh đã đăng ký</h1>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center min-h-[40vh]">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !subscriptionsData?.content || subscriptionsData.content.length === 0 ? (
            <div className="flex items-center justify-center min-h-[40vh]">
              <div className="text-center space-y-4">
                <Bell className="h-16 w-16 mx-auto text-muted-foreground" />
                <p className="text-xl text-muted-foreground">
                  Bạn chưa đăng ký kênh nào
                </p>
                <p className="text-sm text-muted-foreground">
                  Khám phá và đăng ký các kênh yêu thích của bạn
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {subscriptionsData.content.map((subscription) => (
                <ChannelCard
                  key={subscription.id}
                  channelUsername={subscription.channelUsername}
                  subscribedAt={subscription.subscribedAt}
                  onUnsubscribe={handleUnsubscribe}
                  isUnsubscribing={unsubscribingChannel === subscription.channelUsername}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

interface ChannelCardProps {
  channelUsername: string;
  subscribedAt: string;
  onUnsubscribe: (channelUsername: string) => void;
  isUnsubscribing: boolean;
}

const ChannelCard = ({
  channelUsername,
  subscribedAt,
  onUnsubscribe,
  isUnsubscribing,
}: ChannelCardProps) => {
  const navigate = useNavigate();
  const { data: videos } = useGetPublicVideosByUsername(channelUsername, 1);
  const latestVideo = videos && videos.length > 0 ? videos[0] : null;

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US");
  };

  return (
    <Card className="group cursor-pointer transition-all duration-300 hover:shadow-medium">
      <CardContent className="p-0">
        {/* Thumbnail or Avatar */}
        <div
          className="relative aspect-video overflow-hidden rounded-t-lg bg-muted"
          onClick={() => navigate(`/@${channelUsername}`)}
        >
          {latestVideo?.thumbnail ? (
            <img
              src={latestVideo.thumbnail}
              alt={latestVideo.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <UserAvatar username={channelUsername} size="xl" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
            <Button
              size="icon"
              className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-primary/90 hover:bg-primary text-primary-foreground"
              onClick={(e) => {
                e.stopPropagation();
                if (latestVideo) {
                  navigate(`/video/${latestVideo.id}`);
                } else {
                  navigate(`/@${channelUsername}`);
                }
              }}
            >
              <Play className="h-6 w-6" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <UserAvatar username={channelUsername} size="md" />
            <div className="flex-1 min-w-0">
              <h3
                className="font-semibold text-sm leading-5 group-hover:text-primary transition-colors truncate"
                onClick={() => navigate(`/@${channelUsername}`)}
              >
                {channelUsername}
              </h3>
              <p className="text-xs text-muted-foreground">
                Đăng ký từ {formatDate(subscribedAt)}
              </p>
            </div>
          </div>

          {latestVideo && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-foreground line-clamp-1">
                {latestVideo.title}
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Video className="h-3 w-3" />
                <span>Video mới nhất</span>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => navigate(`/@${channelUsername}`)}
            >
              Xem kênh
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onUnsubscribe(channelUsername);
              }}
              disabled={isUnsubscribing}
            >
              {isUnsubscribing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Hủy đăng ký"
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SubscriptionsPage;


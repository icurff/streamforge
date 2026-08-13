import { useState } from "react";
import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageUpload } from "@/components/ImageUpload";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUploadAvatar } from "@/hooks/User/useUploadAvatar";
import { useToast } from "@/hooks/use-toast";

const SettingsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { mutateAsync: uploadAvatar, isPending: isUploading } = useUploadAvatar();
  const { toast } = useToast();

  const handleAvatarUpload = async (file: File) => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "User information not found.",
        variant: "destructive",
      });
      return;
    }

    try {
      await uploadAvatar({ userId: String(user.id), file });
      toast({
        title: "Success",
        description: "Avatar updated successfully.",
      });
    } catch (error: any) {
      const message = error?.response?.data?.error || error?.message || "Upload failed";
      toast({
        title: "Upload failed",
        description: message,
        variant: "destructive",
      });
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground">Vui lòng đăng nhập để truy cập cài đặt</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="flex items-center gap-4 mb-6">
          <Button
            onClick={() => navigate(-1)}
            variant="ghost"
            size="icon"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">Cài đặt</h1>
        </div>

        <div className="space-y-6">
          {/* Avatar Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Avatar</CardTitle>
              <CardDescription>
                Update your avatar. It will be displayed on your profile and videos.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ImageUpload
                currentImageUrl={user.avatar}
                onImageSelect={handleAvatarUpload}
                isLoading={isUploading}
                maxSizeMB={5}
                previewClassName="w-48 h-48 rounded-full"
                label="Avatar"
              />
            </CardContent>
          </Card>

          {/* Account Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>
                Manage your account information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Tên người dùng</label>
                <p className="text-sm text-muted-foreground">{user.username || "N/A"}</p>
              </div>
              <Separator />
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <p className="text-sm text-muted-foreground">{user.email || "N/A"}</p>
              </div>
              <Separator />
              <div className="space-y-2">
                <label className="text-sm font-medium">Vai trò</label>
                <div className="flex gap-2">
                  {user.roles?.map((role) => (
                    <span
                      key={role}
                      className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full"
                    >
                      {role}
                    </span>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;


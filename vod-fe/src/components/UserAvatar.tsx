import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  username: string;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  onClick?: () => void;
}

const sizeClasses = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-12 w-12",
  xl: "h-20 w-20",
};

export function UserAvatar({ username, className, size = "md", onClick }: UserAvatarProps) {
  const { user } = useAuth();
  const isCurrentUser = user?.username === username;
  const avatarUrl = isCurrentUser ? user?.avatar : undefined;

  const getUserInitials = (uname: string) => {
    return uname
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  return (
    <Avatar
      className={cn(sizeClasses[size], className, onClick && "cursor-pointer hover:opacity-80 transition-opacity")}
      onClick={onClick}
    >
      {avatarUrl && <AvatarImage src={avatarUrl} alt={username} />}
      <AvatarFallback className="bg-gradient-to-br from-blue-400 to-blue-600 text-white font-semibold">
        {getUserInitials(username)}
      </AvatarFallback>
    </Avatar>
  );
}





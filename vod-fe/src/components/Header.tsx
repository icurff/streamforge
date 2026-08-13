import { useState } from "react";
import { Search, Bell, Plus, Settings, User, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AuthDialog } from "@/components/AuthDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

export function Header() {
  const { user, logout } = useAuth();
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const navigate = useNavigate();

  const openAuthDialog = (mode: "login" | "signup") => {
    setAuthMode(mode);
    setAuthDialogOpen(true);
  };
  return (
    <header className="h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="flex items-center justify-between h-full px-6">
        {/* Logo */}
        <div className="flex items-center gap-8">
          <div 
            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate("/")}
          >
            <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">
                V
              </span>
            </div>
            <span className="text-xl font-bold text-foreground">
              VideoShare
            </span>
          </div>

          {/* Search Bar
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search videos..."
              className="pl-10 bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary"
            />
          </div> */}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-4">
          {user ? (
            <>
              {user?.roles?.includes("ROLE_ADMIN") && (
                <Button
                  variant="secondary"
                  className="gap-2"
                  onClick={() => navigate("/admin")}
                >
                  Admin
                </Button>
              )}
              
              

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative rounded-full px-2 h-9 overflow-hidden focus-visible:ring-0 focus-visible:ring-offset-0 outline-none hover:outline-none active:outline-none"
                  >
                    <div className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-full overflow-hidden">
                      <span className="text-sm font-medium">
                        {user?.name || user?.username || user?.email || "User"}
                      </span>
                      <Avatar className="h-7 w-7 overflow-hidden">
                        <AvatarImage
                          src={user?.avatar || "https://i.pravatar.cc/48?img=3"}
                          alt={
                            (user?.name || user?.username || "User") as string
                          }
                        />
                        <AvatarFallback>
                          {(user?.name || user?.username || "U")
                            .toString()
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuItem 
                    className="gap-2"
                    onClick={() => navigate(`/@${user?.username}`)}
                  >
                    <User className="h-4 w-4" />
                    My Channel
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="gap-2"
                    onClick={() => navigate("/settings")}
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout}>Sign out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => openAuthDialog("login")}>
                Log in
              </Button>
              <Button
                variant="default"
                onClick={() => openAuthDialog("signup")}
              >
                Sign up
              </Button>
            </>
          )}
        </div>
      </div>

      <AuthDialog
        open={authDialogOpen}
        onOpenChange={setAuthDialogOpen}
        defaultMode={authMode}
      />
    </header>
  );
}

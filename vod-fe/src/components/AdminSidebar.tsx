import { Home, Users, Server, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation, useNavigate } from "react-router-dom";

const navigation = [
  { name: "Dashboard", href: "/admin", icon: Home },
  { name: "Users", href: "/admin/users", icon: Users },
  { name: "Servers", href: "/admin/servers", icon: Server },
  // { name: "Analytics", href: "/admin/analytics", icon: BarChart3 },
];

export function AdminSidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (href: string) => {
    if (href === "/admin") {
      return location.pathname === "/admin";
    }
    return location.pathname.startsWith(href);
  };

  return (
    <aside className="w-64 bg-sidebar-bg border-r min-h-screen p-4">
      <div className="space-y-2">
        <div className="px-3 py-2 mb-4">
          <h1 className="text-lg font-semibold text-foreground">Admin Portal</h1>
        </div>
        {navigation.map((item) => (
          <Button
            key={item.name}
            variant={isActive(item.href) ? "sidebar-active" : "sidebar"}
            className="gap-3 w-full justify-start"
            onClick={() => navigate(item.href)}
          >
            <item.icon className="h-5 w-5" />
            {item.name}
          </Button>
        ))}
      </div>
    </aside>
  );
}

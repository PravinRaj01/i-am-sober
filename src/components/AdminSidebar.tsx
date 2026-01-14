import { NavLink } from "react-router-dom";
import { 
  LayoutDashboard, 
  Bot, 
  AlertTriangle, 
  TrendingUp, 
  Users,
  ArrowLeft,
  Shield,
  LogOut,
  Sparkles,
  BarChart3
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AdminSidebarProps {
  onLogout: () => void;
}

const adminMenuItems = [
  { title: "Overview", url: "/admin", icon: LayoutDashboard },
];

// Analytics section - all data shown is aggregated/anonymized
const analyticsItems = [
  { title: "AI Analytics", url: "/admin", icon: Bot, badge: "Live" },
  { title: "Error Logs", url: "/admin", icon: AlertTriangle },
  { title: "Interventions", url: "/admin", icon: TrendingUp },
  { title: "User Stats", url: "/admin", icon: Users, description: "Aggregated" },
];

export function AdminSidebar({ onLogout }: AdminSidebarProps) {
  return (
    <aside className="w-64 border-r border-border bg-card/50 backdrop-blur-sm flex flex-col h-screen">
      {/* Admin Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-destructive/10">
            <Shield className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Admin Panel</h2>
            <p className="text-xs text-muted-foreground">Opik Dashboard</p>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        {/* Main Navigation */}
        <nav className="p-3 space-y-1">
          {adminMenuItems.map((item) => (
            <NavLink
              key={item.title}
              to={item.url}
              end={item.url === "/admin"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )
              }
            >
              <item.icon className="h-4 w-4" />
              <span>{item.title}</span>
            </NavLink>
          ))}
        </nav>

        <Separator className="mx-3" />

        {/* Analytics Section */}
        <div className="p-3">
          <p className="text-xs font-medium text-muted-foreground px-3 mb-2 flex items-center gap-1">
            <BarChart3 className="h-3 w-3" />
            Analytics
          </p>
          <div className="space-y-1">
            {analyticsItems.map((item) => (
              <NavLink
                key={item.title}
                to={item.url}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                  "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                <span className="flex-1">{item.title}</span>
                {item.badge && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary flex items-center gap-1">
                    <Sparkles className="h-2.5 w-2.5" />
                    {item.badge}
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        </div>

        <Separator className="mx-3" />

        {/* Privacy Badge */}
        <div className="p-3">
          <div className="p-3 rounded-lg bg-muted/50 border border-dashed border-border">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Shield className="h-3 w-3" />
              <span>All data is anonymized</span>
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Footer Actions */}
      <div className="p-3 border-t border-border space-y-2">
        <NavLink
          to="/"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to App</span>
        </NavLink>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={onLogout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Logout Admin
        </Button>
      </div>
    </aside>
  );
}

import { NavLink } from "react-router-dom";
import { 
  LayoutDashboard, 
  Bot, 
  AlertTriangle, 
  TrendingUp, 
  Users,
  ArrowLeft,
  Shield
} from "lucide-react";
import { cn } from "@/lib/utils";

const adminMenuItems = [
  { title: "Overview", url: "/admin", icon: LayoutDashboard },
  { title: "AI Analytics", url: "/admin/ai-analytics", icon: Bot },
  { title: "Error Logs", url: "/admin/errors", icon: AlertTriangle },
  { title: "Interventions", url: "/admin/interventions", icon: TrendingUp },
  { title: "User Stats", url: "/admin/users", icon: Users },
];

export function AdminSidebar() {
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
            <p className="text-xs text-muted-foreground">Privacy-safe analytics</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {adminMenuItems.map((item) => (
          <NavLink
            key={item.url}
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

      {/* Back to App */}
      <div className="p-3 border-t border-border">
        <NavLink
          to="/"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to App</span>
        </NavLink>
      </div>
    </aside>
  );
}

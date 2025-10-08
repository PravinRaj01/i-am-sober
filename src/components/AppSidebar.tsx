import { Home, Heart, BookOpen, Target, Activity, TrendingUp, Settings, Trophy, Users } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const menuItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Check In", url: "/check-in", icon: Heart },
  { title: "Journal", url: "/journal", icon: BookOpen },
  { title: "Goals", url: "/goals", icon: Target },
  { title: "Coping Tools", url: "/coping", icon: Activity },
  { title: "Progress", url: "/progress", icon: TrendingUp },
  { title: "Achievements", url: "/achievements", icon: Trophy },
  { title: "Community", url: "/community", icon: Users },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  // Fetch logo from storage
  useEffect(() => {
    const fetchLogo = async () => {
      const { data: files } = await supabase.storage.from('logos').list();
      if (files && files.length > 0) {
        const { data } = supabase.storage.from('logos').getPublicUrl(files[0].name);
        setLogoUrl(data.publicUrl);
      }
    };
    fetchLogo();
  }, []);

  // Persist sidebar state
  useEffect(() => {
    localStorage.setItem("sidebar-state", state);
  }, [state]);

  return (
    <div 
      className={`h-screen bg-card/60 backdrop-blur-xl border-r border-border/30 transition-all duration-300 flex flex-col shrink-0 z-50 ${
        collapsed ? "w-16" : "w-60"
      }`}
    >
      <div className="flex items-center justify-between px-3 py-6 border-b border-border/30 min-h-[73px]">
        {!collapsed && (
          <div className="flex items-center gap-3">
            {logoUrl && (
              <img src={logoUrl} alt="Logo" className="h-8 w-8 object-contain rounded" />
            )}
            <h2 className="text-lg font-semibold truncate">I Am Sober</h2>
          </div>
        )}
        {collapsed && logoUrl && (
          <img src={logoUrl} alt="Logo" className="h-6 w-6 object-contain rounded mx-auto" />
        )}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={toggleSidebar}
          className={`h-8 w-8 shrink-0 hover:bg-primary/20 transition-colors ${collapsed ? "mx-auto" : ""}`}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? "→" : "←"}
        </Button>
      </div>
      
      <nav className="flex-1 py-4 px-2 overflow-y-auto">
        <ul className="space-y-1">
          {menuItems.map((item) => (
            <li key={item.title}>
              <NavLink
                to={item.url}
                end={item.url === "/"}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 ${
                    isActive
                      ? "bg-primary/20 text-primary font-medium"
                      : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                  } ${collapsed ? "justify-center" : ""}`
                }
                title={collapsed ? item.title : undefined}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span className="truncate text-sm">{item.title}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

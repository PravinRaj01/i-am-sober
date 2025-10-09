import { Home, Heart, BookOpen, Target, Activity, TrendingUp, Settings, Trophy, Users, X } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
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
  const { state, toggleSidebar, open, setOpen, isMobile: sidebarMobile } = useSidebar();
  const isMobile = useIsMobile();
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

  // Close sidebar on mobile when clicking a link
  const handleNavClick = () => {
    if (isMobile && open) {
      setOpen(false);
    }
  };

  // Check if sidebar should be visible on mobile
  const isVisible = isMobile ? open : true;

  return (
    <>
      {/* Mobile overlay */}
      {isMobile && open && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
          onClick={() => setOpen(false)}
        />
      )}
      
      <div 
        className={`h-screen bg-card/95 backdrop-blur-xl border-r border-border/30 transition-all duration-300 flex flex-col shrink-0 ${
          isMobile ? 'fixed left-0 top-0 z-50' : 'relative z-50'
        } ${
          !isVisible ? '-translate-x-full' : 'translate-x-0'
        } ${
          collapsed && !isMobile ? "w-16" : "w-60"
        }`}
      >
        <div className="flex items-center justify-between px-3 py-6 border-b border-border/30 min-h-[73px]">
          {(!collapsed || isMobile) && (
            <div className="flex items-center gap-3">
              {logoUrl && (
                <img src={logoUrl} alt="Logo" className="h-8 w-8 object-contain rounded" />
              )}
              <h2 className="text-lg font-semibold truncate">I Am Sober</h2>
            </div>
          )}
          {collapsed && !isMobile && logoUrl && (
            <img src={logoUrl} alt="Logo" className="h-6 w-6 object-contain rounded mx-auto" />
          )}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => isMobile ? setOpen(false) : toggleSidebar()}
            className={`h-8 w-8 shrink-0 hover:bg-primary/20 transition-colors ${collapsed && !isMobile ? "mx-auto" : ""}`}
            title={isMobile ? "Close menu" : collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isMobile ? <X className="h-5 w-5" /> : (collapsed ? "→" : "←")}
          </Button>
        </div>
        
        <nav className="flex-1 py-4 px-2 overflow-y-auto">
          <ul className="space-y-1">
            {menuItems.map((item) => (
              <li key={item.title}>
                <NavLink
                  to={item.url}
                  end={item.url === "/"}
                  onClick={handleNavClick}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 ${
                      isActive
                        ? "bg-primary/20 text-primary font-medium"
                        : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                    } ${collapsed && !isMobile ? "justify-center" : ""}`
                  }
                  title={collapsed && !isMobile ? item.title : undefined}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {(!collapsed || isMobile) && <span className="truncate text-sm">{item.title}</span>}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </>
  );
}

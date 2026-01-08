import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AchievementsGrid from "@/components/achievements/AchievementsGrid";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SidebarTrigger } from "@/components/ui/sidebar";
import LevelUpDialog from "@/components/LevelUpDialog";
import { useLevelUp } from "@/hooks/useLevelUp";

const Achievements = () => {
  const navigate = useNavigate();

  const { data: profile } = useQuery({
    queryKey: ["profile-level"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data } = await supabase
        .from("profiles")
        .select("level, xp, points")
        .eq("id", user.id)
        .single();

      return data;
    },
  });

  // Call hooks before any conditional logic
  const { showLevelUp, oldLevel, newLevel, closeLevelUp } = useLevelUp(profile);

  // Calculate XP needed for next level
  const currentXP = profile?.xp || 0;
  const currentLevel = profile?.level || 1;
  
  // Calculate XP thresholds for current and next level
  const getXPForLevel = (level: number): number => {
    let total = 0;
    for (let n = 2; n <= level; n++) {
      total += n * 100;
    }
    return total;
  };
  
  const xpForCurrentLevel = getXPForLevel(currentLevel);
  const xpForNextLevel = getXPForLevel(currentLevel + 1);
  const xpNeededForNextLevel = (currentLevel + 1) * 100; // XP required to reach next level
  const xpInCurrentLevel = currentXP - xpForCurrentLevel; // XP earned in current level
  const xpProgress = Math.min((xpInCurrentLevel / xpNeededForNextLevel) * 100, 100);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/40 backdrop-blur-xl bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => navigate("/")} className="hidden lg:inline-flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden lg:inline">Back</span>
            </Button>
            <SidebarTrigger className="lg:hidden" />
            <h1 className="text-xl font-semibold md:hidden">Achievements</h1>
          </div>
          <Button variant="ghost" onClick={() => navigate("/")} className="shrink-0 lg:hidden">
            <ArrowLeft className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Back to Dashboard</span>
            <span className="sm:hidden">Back</span>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Level Progress */}
        <div className="mb-8">
          <div className="flex items-end gap-2 mb-2">
            <h1 className="text-4xl font-bold">Level {currentLevel}</h1>
            <p className="text-muted-foreground mb-1">
              {xpInCurrentLevel} / {xpNeededForNextLevel} XP
            </p>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${xpProgress}%` }}
            />
          </div>
        </div>

        {/* Achievement Grid */}
        <AchievementsGrid />
      </main>
      
      {/* Level Up Dialog */}
      <LevelUpDialog
        open={showLevelUp}
        onClose={closeLevelUp}
        oldLevel={oldLevel}
        newLevel={newLevel}
      />
    </div>
  );
};

export default Achievements;
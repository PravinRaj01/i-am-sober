import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AchievementsGrid from "@/components/achievements/AchievementsGrid";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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

  // Calculate XP needed for next level
  const currentXP = profile?.xp || 0;
  const currentLevel = profile?.level || 1;
  const xpForNextLevel = (currentLevel + 1) * 100; // Simple formula: next level requires level*100 XP
  const xpProgress = Math.min((currentXP / xpForNextLevel) * 100, 100);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/40 backdrop-blur-xl bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Level Progress */}
        <div className="mb-8">
          <div className="flex items-end gap-2 mb-2">
            <h1 className="text-4xl font-bold">Level {currentLevel}</h1>
            <p className="text-muted-foreground mb-1">
              {currentXP} / {xpForNextLevel} XP
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
    </div>
  );
};

export default Achievements;
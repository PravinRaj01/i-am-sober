import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

interface Profile {
  xp: number;
  level: number;
}

export const useLevelUp = (profile: Profile | null | undefined) => {
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [oldLevel, setOldLevel] = useState(1);
  const [newLevel, setNewLevel] = useState(1);
  const queryClient = useQueryClient();

  useEffect(() => {
    const checkAndLevelUp = async () => {
      if (!profile) return;

      const { xp, level } = profile;
      const xpForNextLevel = (level + 1) * 100;

      // Check if user has enough XP to level up
      if (xp >= xpForNextLevel) {
        // Calculate new level
        let calculatedLevel = level;
        let currentXP = xp;
        
        while (currentXP >= (calculatedLevel + 1) * 100) {
          calculatedLevel++;
          currentXP -= calculatedLevel * 100;
        }

        if (calculatedLevel > level) {
          // Update the profile in the database
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          const { error } = await supabase
            .from("profiles")
            .update({ level: calculatedLevel })
            .eq("id", user.id);

          if (!error) {
            setOldLevel(level);
            setNewLevel(calculatedLevel);
            setShowLevelUp(true);
            
            // Invalidate queries to refresh the data
            queryClient.invalidateQueries({ queryKey: ["profile"] });
            queryClient.invalidateQueries({ queryKey: ["profile-level"] });
          }
        }
      }
    };

    checkAndLevelUp();
  }, [profile, queryClient]);

  const closeLevelUp = () => {
    setShowLevelUp(false);
  };

  return {
    showLevelUp,
    oldLevel,
    newLevel,
    closeLevelUp,
  };
};

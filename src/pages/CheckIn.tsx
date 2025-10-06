import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2 } from "lucide-react";

const moods = ["Great", "Good", "Okay", "Struggling", "Difficult"];

const CheckIn = () => {
  const [selectedMood, setSelectedMood] = useState("Okay");
  const [urgeIntensity, setUrgeIntensity] = useState([5]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Start a transaction to handle check-in, XP, and achievements
      const { data: profile } = await supabase
        .from("profiles")
        .select("current_streak, longest_streak, last_check_in, xp")
        .eq("id", user.id)
        .single();

      if (!profile) throw new Error("Profile not found");

      // Calculate streaks
      let newCurrentStreak = 1;
      let newLongestStreak = profile.longest_streak || 1;
      const lastCheckIn = profile.last_check_in ? new Date(profile.last_check_in) : null;
      
      if (lastCheckIn) {
        const daysSinceLastCheckIn = Math.floor(
          (new Date().getTime() - lastCheckIn.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysSinceLastCheckIn === 1) {
          // Consecutive day
          newCurrentStreak = (profile.current_streak || 0) + 1;
          newLongestStreak = Math.max(newCurrentStreak, profile.longest_streak || 0);
        } else if (daysSinceLastCheckIn > 1) {
          // Streak broken
          newCurrentStreak = 1;
        }
      }

      // Award XP based on check-in and streak
      const baseXP = 50; // Base XP for checking in
      const streakBonus = Math.min(newCurrentStreak * 10, 100); // Bonus XP for streaks, max 100
      const totalXP = baseXP + streakBonus;

      // Insert check-in
      const { error: checkInError } = await supabase.from("check_ins").insert({
        user_id: user.id,
        mood: selectedMood,
        urge_intensity: urgeIntensity[0],
        notes: notes.trim() || null,
      });

      if (checkInError) throw checkInError;

      // Update profile with new XP and streak
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          xp: (profile.xp || 0) + totalXP,
          current_streak: newCurrentStreak,
          longest_streak: newLongestStreak,
          last_check_in: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (profileError) throw profileError;

      // Check for streak achievements
      const streakMilestones = [3, 7, 30]; // Matches our achievement requirements
      if (streakMilestones.includes(newCurrentStreak)) {
        const { data: achievements } = await supabase
          .from("achievements")
          .select("id, requirements")
          .eq("category", "streak");

        const matchingAchievement = achievements?.find((a: any) => {
          const reqs = a.requirements as any;
          return reqs?.streak === newCurrentStreak;
        });

        if (matchingAchievement) {
          await supabase.from("user_achievements").insert({
            user_id: user.id,
            achievement_id: matchingAchievement.id,
          });
        }
      }

      toast({
        title: "Check-in saved!",
        description: `+${totalXP} XP (${baseXP} base + ${streakBonus} streak bonus). Current streak: ${newCurrentStreak} days!`,
      });
      navigate("/");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 bg-gradient-calm min-h-screen">
      <header className="bg-card/80 backdrop-blur-xl border-b border-border/50">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl animate-fade-in">
        <Card className="shadow-soft bg-card/50 backdrop-blur-lg">
          <CardHeader>
            <CardTitle>Daily Check-In</CardTitle>
            <CardDescription>How are you feeling today?</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-3">
                <Label>Mood</Label>
                <div className="grid grid-cols-5 gap-2">
                  {moods.map((mood) => (
                    <Button
                      key={mood}
                      type="button"
                      variant={selectedMood === mood ? "default" : "outline"}
                      className={selectedMood === mood ? "bg-gradient-primary" : ""}
                      onClick={() => setSelectedMood(mood)}
                    >
                      {mood}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Urge Intensity</Label>
                  <span className="text-2xl font-bold text-primary">{urgeIntensity[0]}/10</span>
                </div>
                <Slider
                  value={urgeIntensity}
                  onValueChange={setUrgeIntensity}
                  max={10}
                  min={0}
                  step={1}
                  className="py-4"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>None</span>
                  <span>Extreme</span>
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="How was your day? Any challenges or wins?"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  disabled={loading}
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-primary hover:opacity-90 transition-opacity"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Check-In"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default CheckIn;

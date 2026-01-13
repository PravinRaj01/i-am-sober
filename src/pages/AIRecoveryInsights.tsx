import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Brain, TrendingUp, Heart, Sparkles, MessageCircle, Target, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { differenceInDays, format, subDays } from "date-fns";

export default function AIRecoveryInsights() {
  // Get AI usage stats
  const { data: aiStats } = useQuery({
    queryKey: ["ai-recovery-stats"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const weekAgo = subDays(new Date(), 7);
      const twoWeeksAgo = subDays(new Date(), 14);

      // This week's AI interactions
      const { data: thisWeek } = await supabase
        .from("ai_observability_logs")
        .select("*")
        .eq("user_id", user.id)
        .gte("created_at", weekAgo.toISOString());

      // Last week's AI interactions
      const { data: lastWeek } = await supabase
        .from("ai_observability_logs")
        .select("*")
        .eq("user_id", user.id)
        .gte("created_at", twoWeeksAgo.toISOString())
        .lt("created_at", weekAgo.toISOString());

      // Get chat messages count
      const { data: chatMessages } = await supabase
        .from("chat_messages")
        .select("id")
        .eq("user_id", user.id)
        .gte("created_at", weekAgo.toISOString());

      // Get interventions
      const { data: interventions } = await supabase
        .from("ai_interventions")
        .select("*")
        .eq("user_id", user.id)
        .gte("created_at", weekAgo.toISOString());

      return {
        thisWeekCount: thisWeek?.length || 0,
        lastWeekCount: lastWeek?.length || 0,
        chatCount: chatMessages?.length || 0,
        interventions: interventions || [],
        logs: thisWeek || [],
      };
    },
  });

  // Get mood improvement data
  const { data: moodData } = useQuery({
    queryKey: ["mood-improvement"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const weekAgo = subDays(new Date(), 7);

      const { data: checkIns } = await supabase
        .from("check_ins")
        .select("mood, created_at")
        .eq("user_id", user.id)
        .gte("created_at", weekAgo.toISOString())
        .order("created_at", { ascending: true });

      if (!checkIns || checkIns.length < 2) return null;

      const moodScores: Record<string, number> = {
        "Great": 5,
        "Good": 4,
        "Okay": 3,
        "Struggling": 2,
        "Difficult": 1,
      };

      const scores = checkIns.map(c => moodScores[c.mood] || 3);
      const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
      const secondHalf = scores.slice(Math.floor(scores.length / 2));

      const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

      return {
        improvement: avgSecond - avgFirst,
        totalCheckIns: checkIns.length,
        latestMood: checkIns[checkIns.length - 1]?.mood,
      };
    },
  });

  // Get coping strategy effectiveness
  const { data: copingData } = useQuery({
    queryKey: ["coping-effectiveness"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: activities } = await supabase
        .from("coping_activities")
        .select("*")
        .eq("user_id", user.id)
        .order("times_used", { ascending: false })
        .limit(5);

      return activities || [];
    },
  });

  // Get user profile for streak info
  const { data: profile } = useQuery({
    queryKey: ["profile-insights"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      return data;
    },
  });

  const weeklyChange = aiStats ? aiStats.thisWeekCount - aiStats.lastWeekCount : 0;
  const moodImprovement = moodData?.improvement || 0;

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <header className="bg-card/80 backdrop-blur-xl border-b border-border/50 sticky top-0 z-40">
        <div className="px-4 py-4 flex items-center gap-4">
          <SidebarTrigger className="lg:hidden" />
          <div>
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Recovery Insights
            </h1>
            <p className="text-sm text-muted-foreground">See how AI is supporting your recovery journey</p>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 lg:p-6 overflow-auto">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">AI Support This Week</p>
                    <p className="text-3xl font-bold">{aiStats?.thisWeekCount || 0}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {weeklyChange >= 0 ? "+" : ""}{weeklyChange} from last week
                    </p>
                  </div>
                  <Brain className="h-10 w-10 text-primary/50" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Chat Conversations</p>
                    <p className="text-3xl font-bold">{aiStats?.chatCount || 0}</p>
                    <p className="text-xs text-muted-foreground mt-1">messages this week</p>
                  </div>
                  <MessageCircle className="h-10 w-10 text-green-500/50" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Proactive Check-ins</p>
                    <p className="text-3xl font-bold">{aiStats?.interventions?.length || 0}</p>
                    <p className="text-xs text-muted-foreground mt-1">AI reached out to help</p>
                  </div>
                  <Heart className="h-10 w-10 text-amber-500/50" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Weekly Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                This Week's Recovery Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg bg-gradient-to-r from-primary/10 to-transparent border border-primary/20">
                <div className="flex items-start gap-3">
                  <Sparkles className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium">Your AI-Powered Progress</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {aiStats?.thisWeekCount === 0 
                        ? "Start chatting with our AI assistant to get personalized recovery insights!"
                        : `This week, you used AI support ${aiStats?.thisWeekCount} times. ${
                            moodImprovement > 0 
                              ? `Your mood improved by ${(moodImprovement * 20).toFixed(0)}% during this period!` 
                              : moodImprovement < 0
                                ? "Your mood has been challenging, but you're doing great by reaching out for support."
                                : "Your mood has been stable - consistency is key to recovery!"
                          }`
                      }
                    </p>
                  </div>
                </div>
              </div>

              {profile && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Current Streak</p>
                    <p className="text-2xl font-bold text-primary">{profile.current_streak || 0} days</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Days Sober</p>
                    <p className="text-2xl font-bold text-green-600">
                      {differenceInDays(new Date(), new Date(profile.sobriety_start_date))} days
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Coping Effectiveness */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Your Top Coping Strategies
              </CardTitle>
              <CardDescription>
                Activities you've used most often for recovery support
              </CardDescription>
            </CardHeader>
            <CardContent>
              {copingData && copingData.length > 0 ? (
                <div className="space-y-3">
                  {copingData.map((activity: any, index: number) => (
                    <div key={activity.id} className="flex items-center gap-4">
                      <span className="text-lg font-bold text-muted-foreground w-6">#{index + 1}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">{activity.activity_name}</span>
                          <Badge variant="secondary">{activity.category}</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress value={(activity.times_used / (copingData[0]?.times_used || 1)) * 100} className="h-2" />
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {activity.times_used}x used
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No coping activities tracked yet. Visit the Coping Tools page to get started!
                </p>
              )}
            </CardContent>
          </Card>

          {/* AI Interaction Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Recent AI Support Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              {aiStats?.logs && aiStats.logs.length > 0 ? (
                <div className="space-y-3">
                  {aiStats.logs.slice(0, 10).map((log: any) => (
                    <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                      <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                        <Brain className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{log.function_name.replace(/-/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {log.response_summary || "AI provided personalized support"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(log.created_at), "MMM d, h:mm a")}
                        </p>
                      </div>
                      <Badge variant="outline" className="shrink-0">
                        {log.response_time_ms ? `${log.response_time_ms}ms` : "—"}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No AI interactions yet. Start a conversation with our AI assistant!
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
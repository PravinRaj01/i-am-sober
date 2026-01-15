import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import OpikBadge from "@/components/OpikBadge";
import { PageHeader } from "@/components/layout/PageHeader";
import { 
  Brain, 
  Clock, 
  CheckCircle2, 
  TrendingUp,
  BarChart3,
  Sparkles,
  MessageCircle,
  Heart,
  Target,
  Calendar
} from "lucide-react";
import { format, formatDistanceToNow, differenceInDays, subDays } from "date-fns";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar
} from "recharts";

const AIObservability = () => {
  // AI Observability logs
  const { data: logs, isLoading } = useQuery({
    queryKey: ["ai-observability-logs"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("ai_observability_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data || [];
    },
  });

  const { data: interventions } = useQuery({
    queryKey: ["ai-interventions-user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("ai_interventions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data || [];
    },
  });

  // Recovery insights data (merged from AIRecoveryInsights)
  const { data: aiStats } = useQuery({
    queryKey: ["ai-recovery-stats"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const weekAgo = subDays(new Date(), 7);
      const twoWeeksAgo = subDays(new Date(), 14);

      const { data: thisWeek } = await supabase
        .from("ai_observability_logs")
        .select("*")
        .eq("user_id", user.id)
        .gte("created_at", weekAgo.toISOString());

      const { data: lastWeek } = await supabase
        .from("ai_observability_logs")
        .select("*")
        .eq("user_id", user.id)
        .gte("created_at", twoWeeksAgo.toISOString())
        .lt("created_at", weekAgo.toISOString());

      const { data: chatMessages } = await supabase
        .from("chat_messages")
        .select("id")
        .eq("user_id", user.id)
        .gte("created_at", weekAgo.toISOString());

      return {
        thisWeekCount: thisWeek?.length || 0,
        lastWeekCount: lastWeek?.length || 0,
        chatCount: chatMessages?.length || 0,
      };
    },
  });

  // Coping effectiveness
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

  // User profile for days sober
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

  // Compute simple metrics
  const totalCalls = logs?.length || 0;
  const avgResponseTime = logs?.length 
    ? Math.round(logs.reduce((acc, l) => acc + (l.response_time_ms || 0), 0) / logs.length)
    : 0;
  const errorCount = logs?.filter(l => l.error_message)?.length || 0;
  const successRate = totalCalls > 0 ? Math.round(((totalCalls - errorCount) / totalCalls) * 100) : 100;
  const weeklyChange = aiStats ? aiStats.thisWeekCount - aiStats.lastWeekCount : 0;
  const daysSober = profile?.sobriety_start_date 
    ? differenceInDays(new Date(), new Date(profile.sobriety_start_date))
    : 0;

  // Function distribution - top 5
  const functionCounts = (logs || []).reduce((acc: Record<string, number>, log) => {
    acc[log.function_name] = (acc[log.function_name] || 0) + 1;
    return acc;
  }, {});
  const functionChartData = Object.entries(functionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, calls]) => ({
      name: name.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase()),
      calls,
    }));

  // Response time trend - last 10
  const responseTimeData = logs?.slice(0, 10).reverse().map((log, index) => ({
    index: index + 1,
    time: log.response_time_ms || 0,
  })) || [];

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <PageHeader 
        title="AI Insights" 
        actions={<OpikBadge />}
      />

      <main className="flex-1 p-4 lg:p-6 overflow-auto">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Recovery Summary - New merged section */}
          <Card className="bg-gradient-to-r from-primary/10 to-green-500/10 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3 mb-4">
                <Sparkles className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">Your AI-Powered Recovery</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {aiStats?.thisWeekCount === 0 
                      ? "Start chatting with your AI coach to get personalized insights!"
                      : `This week, you used AI support ${aiStats?.thisWeekCount} times. ${
                          weeklyChange > 0 
                            ? `That's ${weeklyChange} more than last week!` 
                            : weeklyChange < 0
                              ? `You're using it less frequently - that could be a sign of growing confidence!`
                              : "Consistent engagement is key to recovery!"
                        }`
                    }
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg bg-card/50 text-center">
                  <p className="text-2xl font-bold text-green-600">{daysSober}</p>
                  <p className="text-xs text-muted-foreground">Days Sober</p>
                </div>
                <div className="p-3 rounded-lg bg-card/50 text-center">
                  <p className="text-2xl font-bold text-primary">{aiStats?.thisWeekCount || 0}</p>
                  <p className="text-xs text-muted-foreground">AI Calls</p>
                </div>
                <div className="p-3 rounded-lg bg-card/50 text-center">
                  <p className="text-2xl font-bold text-amber-600">{aiStats?.chatCount || 0}</p>
                  <p className="text-xs text-muted-foreground">Chats</p>
                </div>
                <div className="p-3 rounded-lg bg-card/50 text-center">
                  <p className="text-2xl font-bold text-purple-600">{interventions?.length || 0}</p>
                  <p className="text-xs text-muted-foreground">Check-ins</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Brain className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Total AI Calls</span>
                </div>
                <p className="text-2xl font-bold">{totalCalls}</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="h-4 w-4 text-accent" />
                  <span className="text-xs text-muted-foreground">Avg Speed</span>
                </div>
                <p className="text-2xl font-bold">{avgResponseTime}ms</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-xs text-muted-foreground">Success</span>
                </div>
                <p className="text-2xl font-bold">{successRate}%</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Heart className="h-4 w-4 text-amber-500" />
                  <span className="text-xs text-muted-foreground">Proactive</span>
                </div>
                <p className="text-2xl font-bold">{interventions?.length || 0}</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Response Time Chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Response Speed
                </CardTitle>
                <CardDescription className="text-xs">Last 10 AI calls (ms)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[180px]">
                  {responseTimeData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={responseTimeData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="index" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            fontSize: '12px'
                          }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="time" 
                          stroke="hsl(var(--primary))" 
                          strokeWidth={2}
                          dot={{ fill: 'hsl(var(--primary))', r: 3 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                      No data yet
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Function Usage Chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="h-4 w-4 text-accent" />
                  AI Features Used
                </CardTitle>
                <CardDescription className="text-xs">Your most used AI features</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[180px]">
                  {functionChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={functionChartData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                        <YAxis 
                          type="category" 
                          dataKey="name" 
                          stroke="hsl(var(--muted-foreground))" 
                          fontSize={9}
                          width={80}
                          tickFormatter={(value) => value.length > 12 ? value.slice(0, 12) + '...' : value}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            fontSize: '12px'
                          }}
                        />
                        <Bar dataKey="calls" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                      No data yet
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Coping Strategies - Merged from Recovery Insights */}
          {copingData && copingData.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Target className="h-4 w-4 text-primary" />
                  Your Top Coping Strategies
                </CardTitle>
                <CardDescription className="text-xs">Activities you've used most often</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {copingData.map((activity: any, index: number) => (
                    <div key={activity.id} className="flex items-center gap-4">
                      <span className="text-lg font-bold text-muted-foreground w-6">#{index + 1}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm">{activity.activity_name}</span>
                          <Badge variant="secondary" className="text-xs">{activity.category}</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress value={(activity.times_used / (copingData[0]?.times_used || 1)) * 100} className="h-2" />
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {activity.times_used}x
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Activity */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Brain className="h-4 w-4 text-primary" />
                Recent AI Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground text-sm">Loading...</div>
              ) : logs?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Brain className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No AI activity yet</p>
                  <p className="text-xs mt-1">Start chatting with your AI coach!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {logs?.slice(0, 5).map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={`h-2 w-2 rounded-full shrink-0 ${log.error_message ? 'bg-destructive' : 'bg-green-500'}`} />
                        <span className="text-sm font-medium truncate">
                          {log.function_name.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs text-muted-foreground">{log.response_time_ms}ms</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Proactive Check-ins */}
          {interventions && interventions.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  AI Proactive Check-ins
                </CardTitle>
                <CardDescription className="text-xs">Times your AI coach reached out</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {interventions.slice(0, 3).map((intervention) => (
                    <div key={intervention.id} className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm line-clamp-2">{intervention.message}</p>
                        <Badge variant="outline" className="shrink-0 text-xs">
                          {intervention.trigger_type}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {format(new Date(intervention.created_at), "MMM d, h:mm a")}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default AIObservability;

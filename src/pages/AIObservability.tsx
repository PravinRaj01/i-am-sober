import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import OpikBadge from "@/components/OpikBadge";
import { PageHeader } from "@/components/layout/PageHeader";
import { 
  Brain, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp,
  BarChart3,
  Sparkles
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
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

  // Compute simple metrics
  const totalCalls = logs?.length || 0;
  const avgResponseTime = logs?.length 
    ? Math.round(logs.reduce((acc, l) => acc + (l.response_time_ms || 0), 0) / logs.length)
    : 0;
  const errorCount = logs?.filter(l => l.error_message)?.length || 0;
  const successRate = totalCalls > 0 ? Math.round(((totalCalls - errorCount) / totalCalls) * 100) : 100;

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
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Brain className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground">AI Calls</span>
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
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <span className="text-xs text-muted-foreground">Check-ins</span>
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

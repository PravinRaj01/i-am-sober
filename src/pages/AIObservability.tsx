import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import OpikBadge from "@/components/OpikBadge";
import { PageHeader } from "@/components/layout/PageHeader";
import { 
  Activity, 
  Brain, 
  Clock, 
  Zap, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp,
  BarChart3,
  Wrench,
  MessageSquare
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
  Bar,
  PieChart,
  Pie,
  Cell
} from "recharts";

const AIObservability = () => {
  const [selectedTab, setSelectedTab] = useState("overview");

  const { data: logs, isLoading } = useQuery({
    queryKey: ["ai-observability-logs"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("ai_observability_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data || [];
    },
  });

  const { data: interventions } = useQuery({
    queryKey: ["ai-interventions-all"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("ai_interventions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data || [];
    },
  });

  // Compute metrics
  const totalCalls = logs?.length || 0;
  const avgResponseTime = logs?.length 
    ? Math.round(logs.reduce((acc, l) => acc + (l.response_time_ms || 0), 0) / logs.length)
    : 0;
  const totalInputTokens = logs?.reduce((acc, l) => acc + (l.input_tokens || 0), 0) || 0;
  const totalOutputTokens = logs?.reduce((acc, l) => acc + (l.output_tokens || 0), 0) || 0;
  const errorCount = logs?.filter(l => l.error_message)?.length || 0;
  const interventionCount = interventions?.length || 0;

  // Tool usage stats - cast to any to handle missing column
  const toolUsage = (logs as any[])?.filter(l => l.tools_used && l.tools_used.length > 0)
    .flatMap(l => l.tools_used || []) || [];
  const toolCounts = toolUsage.reduce((acc: Record<string, number>, tool: string) => {
    acc[tool] = (acc[tool] || 0) + 1;
    return acc;
  }, {});
  const toolsChartData = Object.entries(toolCounts).map(([name, count]) => ({ name, count }));

  // Function distribution
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

  // Response time over time
  const responseTimeData = logs?.slice(0, 20).reverse().map((log, index) => ({
    index: index + 1,
    time: log.response_time_ms || 0,
    function: log.function_name,
  })) || [];

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--destructive))'];

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <PageHeader 
        title="AI Observability" 
        actions={<OpikBadge />}
      />

      <main className="flex-1 p-4 sm:p-6 overflow-auto">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Card className="bg-card/80 backdrop-blur-sm border-primary/10">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Total Calls</span>
                </div>
                <p className="text-2xl font-bold">{totalCalls}</p>
              </CardContent>
            </Card>

            <Card className="bg-card/80 backdrop-blur-sm border-primary/10">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-accent" />
                  <span className="text-xs text-muted-foreground">Avg Response</span>
                </div>
                <p className="text-2xl font-bold">{avgResponseTime}ms</p>
              </CardContent>
            </Card>

            <Card className="bg-card/80 backdrop-blur-sm border-primary/10">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-warning" />
                  <span className="text-xs text-muted-foreground">Input Tokens</span>
                </div>
                <p className="text-2xl font-bold">{totalInputTokens.toLocaleString()}</p>
              </CardContent>
            </Card>

            <Card className="bg-card/80 backdrop-blur-sm border-primary/10">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="h-4 w-4 text-success" />
                  <span className="text-xs text-muted-foreground">Output Tokens</span>
                </div>
                <p className="text-2xl font-bold">{totalOutputTokens.toLocaleString()}</p>
              </CardContent>
            </Card>

            <Card className="bg-card/80 backdrop-blur-sm border-primary/10">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <span className="text-xs text-muted-foreground">Errors</span>
                </div>
                <p className="text-2xl font-bold">{errorCount}</p>
              </CardContent>
            </Card>

            <Card className="bg-card/80 backdrop-blur-sm border-primary/10">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <span className="text-xs text-muted-foreground">Interventions</span>
                </div>
                <p className="text-2xl font-bold">{interventionCount}</p>
              </CardContent>
            </Card>
          </div>

          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="bg-card/80">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="tools">Tool Usage</TabsTrigger>
              <TabsTrigger value="logs">Recent Logs</TabsTrigger>
              <TabsTrigger value="interventions">Interventions</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6 space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Response Time Chart */}
                <Card className="bg-card/80 backdrop-blur-sm border-primary/10">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      Response Time Trend
                    </CardTitle>
                    <CardDescription>Last 20 AI calls (ms)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={responseTimeData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="index" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))', 
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px'
                            }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="time" 
                            stroke="hsl(var(--primary))" 
                            strokeWidth={2}
                            dot={{ fill: 'hsl(var(--primary))' }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Function Usage Chart */}
                <Card className="bg-card/80 backdrop-blur-sm border-primary/10">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <BarChart3 className="h-5 w-5 text-accent" />
                      Function Usage
                    </CardTitle>
                    <CardDescription>Calls by AI function</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={functionChartData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                          <YAxis 
                            type="category" 
                            dataKey="name" 
                            stroke="hsl(var(--muted-foreground))" 
                            fontSize={10}
                            width={100}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))', 
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px'
                            }}
                          />
                          <Bar dataKey="calls" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="tools" className="mt-6">
              <Card className="bg-card/80 backdrop-blur-sm border-primary/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wrench className="h-5 w-5 text-primary" />
                    AI Agent Tool Calls
                  </CardTitle>
                  <CardDescription>Which tools the AI agent uses most frequently</CardDescription>
                </CardHeader>
                <CardContent>
                  {toolsChartData.length > 0 ? (
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={toolsChartData}
                              dataKey="count"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              outerRadius={100}
                              label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                              labelLine={false}
                            >
                              {toolsChartData.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="space-y-3">
                        {toolsChartData.map((tool, index) => (
                          <div key={tool.name} className="flex items-center justify-between p-3 rounded-lg bg-background/50">
                            <div className="flex items-center gap-3">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: COLORS[index % COLORS.length] }}
                              />
                              <span className="font-medium">{tool.name}</span>
                            </div>
                            <Badge variant="secondary">{tool.count as number} calls</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <Wrench className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No tool calls recorded yet.</p>
                      <p className="text-sm">Start chatting with the AI to see tool usage.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="logs" className="mt-6">
              <Card className="bg-card/80 backdrop-blur-sm border-primary/10">
                <CardHeader>
                  <CardTitle>Recent AI Logs</CardTitle>
                  <CardDescription>Detailed log of AI function calls</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-3">
                      {isLoading ? (
                        <div className="text-center py-8 text-muted-foreground">Loading logs...</div>
                      ) : logs?.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">No logs yet</div>
                      ) : (
                        logs?.map((log) => (
                          <div key={log.id} className="p-4 rounded-lg bg-background/50 border border-border/50">
                            <div className="flex items-start justify-between gap-4 mb-2">
                              <div className="flex items-center gap-2">
                                <Badge variant={log.error_message ? "destructive" : "default"}>
                                  {log.function_name}
                                </Badge>
                                {log.intervention_triggered && (
                                  <Badge variant="outline" className="text-warning border-warning">
                                    Intervention
                                  </Badge>
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                              <div>
                                <span className="text-muted-foreground">Response: </span>
                                <span className="font-medium">{log.response_time_ms}ms</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Input: </span>
                                <span className="font-medium">{log.input_tokens || 0} tokens</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Output: </span>
                                <span className="font-medium">{log.output_tokens || 0} tokens</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Model: </span>
                                <span className="font-medium">{log.model_used || 'N/A'}</span>
                              </div>
                            </div>
                            {log.tools_called && (log.tools_called as string[]).length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                <span className="text-xs text-muted-foreground">Tools: </span>
                                {(log.tools_called as string[]).map((tool, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    {tool}
                                  </Badge>
                                ))}
                              </div>
                            )}
                            {log.error_message && (
                              <div className="mt-2 p-2 rounded bg-destructive/10 text-destructive text-sm">
                                {log.error_message}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="interventions" className="mt-6">
              <Card className="bg-card/80 backdrop-blur-sm border-primary/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-warning" />
                    AI Interventions
                  </CardTitle>
                  <CardDescription>Proactive support provided by the AI</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-3">
                      {interventions?.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No interventions recorded yet.</p>
                          <p className="text-sm">The AI will reach out when it detects you might need support.</p>
                        </div>
                      ) : (
                        interventions?.map((intervention) => (
                          <div key={intervention.id} className="p-4 rounded-lg bg-background/50 border border-border/50">
                            <div className="flex items-start justify-between gap-4 mb-2">
                              <Badge variant="outline" className="text-warning border-warning">
                                {intervention.trigger_type}
                              </Badge>
                              <div className="flex items-center gap-2">
                                {intervention.was_helpful !== null && (
                                  <Badge variant={intervention.was_helpful ? "default" : "secondary"}>
                                    {intervention.was_helpful ? "Helpful" : "Not Helpful"}
                                  </Badge>
                                )}
                                <span className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(intervention.created_at), { addSuffix: true })}
                                </span>
                              </div>
                            </div>
                            <p className="text-sm mb-2">{intervention.message}</p>
                            {intervention.risk_score !== null && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">Risk Score:</span>
                                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden max-w-[200px]">
                                  <div 
                                    className="h-full bg-gradient-to-r from-success via-warning to-destructive"
                                    style={{ width: `${intervention.risk_score * 100}%` }}
                                  />
                                </div>
                                <span className="text-xs font-medium">
                                  {Math.round(intervention.risk_score * 100)}%
                                </span>
                              </div>
                            )}
                            {intervention.action_taken && (
                              <div className="mt-2 text-xs text-muted-foreground">
                                Action: {intervention.action_taken}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default AIObservability;

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, subDays } from "date-fns";
import { Chart } from "chart.js/auto";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Brain, Calendar, Target, TrendingUp } from "lucide-react";

interface ProgressData {
  date: string;
  mood: number;
  stress: number;
  goals_completed: number;
  urge_intensity: number;
}

export function ProgressCharts() {
  const [activeTab, setActiveTab] = useState("emotions");
  const chartRef = useRef<Chart | null>(null);
  const chartRef2 = useRef<Chart | null>(null);
  const chartRef3 = useRef<Chart | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasRef2 = useRef<HTMLCanvasElement | null>(null);
  const canvasRef3 = useRef<HTMLCanvasElement | null>(null);

  const { data: checkIns } = useQuery({
    queryKey: ["insights-check-ins"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();

      const { data, error } = await supabase
        .from("check_ins")
        .select("*")
        .eq("user_id", user.id)
        .gte("created_at", thirtyDaysAgo)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const { data: journalSentiments } = useQuery({
    queryKey: ["insights-sentiments"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();

      const { data, error } = await supabase
        .from("journal_entries")
        .select("created_at, sentiment")
        .eq("user_id", user.id)
        .gte("created_at", thirtyDaysAgo)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const { data: goals } = useQuery({
    queryKey: ["insights-goals"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("goals")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  // Create emotional state chart
  useEffect(() => {
    if (activeTab === "emotions" && checkIns && canvasRef.current) {
      console.debug("Emotions tab: Creating chart with", checkIns.length, "check-ins");
      
      if (chartRef.current) {
        console.debug("Emotions tab: Destroying existing chart");
        chartRef.current.destroy();
        chartRef.current = null;
      }

      const labels = checkIns.map(ci => format(new Date(ci.created_at), "MMM d"));
      const moodMap: Record<string, number> = {
        'great': 10, 'good': 8, 'okay': 5, 'struggling': 3, 'bad': 1
      };
      const moodData = checkIns.map(ci => moodMap[ci.mood] || 5);
      const urgeData = checkIns.map(ci => ci.urge_intensity || 0);

      requestAnimationFrame(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        // Ensure no existing chart is bound to this canvas
        const existing = Chart.getChart(canvas);
        if (existing) existing.destroy();
        
        console.debug("Emotions tab: Initializing chart");
        chartRef.current = new Chart(canvas, {
          type: "line",
          data: {
            labels,
            datasets: [
              {
                label: "Mood",
                data: moodData,
                borderColor: "hsl(var(--primary))",
                tension: 0.4,
                fill: false,
              },
              {
                label: "Urge Intensity",
                data: urgeData,
                borderColor: "hsl(var(--warning))",
                tension: 0.4,
                fill: false,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: {
                min: 0,
                max: 10,
                grid: {
                  color: "rgba(255, 255, 255, 0.1)",
                },
              },
              x: {
                grid: {
                  display: false,
                },
              },
            },
          },
        });
      });
    }

    return () => {
      const canvas = canvasRef.current;
      const existing = canvas ? Chart.getChart(canvas) : null;
      if (existing) {
        console.debug("Emotions tab: Cleanup - destroying chart");
        existing.destroy();
      }
      chartRef.current = null;
    };
  }, [activeTab, checkIns]);

  // Create urge tracking chart
  useEffect(() => {
    if (activeTab === "urges" && checkIns && canvasRef2.current) {
      console.debug("Urges tab: Creating chart with", checkIns.length, "check-ins");
      
      if (chartRef2.current) {
        console.debug("Urges tab: Destroying existing chart");
        chartRef2.current.destroy();
        chartRef2.current = null;
      }

      const labels = checkIns.map(ci => format(new Date(ci.created_at), "MMM d"));
      const urgeData = checkIns.map(ci => ci.urge_intensity || 0);

      requestAnimationFrame(() => {
        const canvas = canvasRef2.current;
        if (!canvas) return;
        
        const existing = Chart.getChart(canvas);
        if (existing) existing.destroy();
        
        console.debug("Urges tab: Initializing chart");
        chartRef2.current = new Chart(canvas, {
          type: "bar",
          data: {
            labels,
            datasets: [
              {
                label: "Urge Intensity",
                data: urgeData,
                backgroundColor: "hsl(var(--warning) / 0.5)",
                borderColor: "hsl(var(--warning))",
                borderWidth: 1,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: {
                beginAtZero: true,
                max: 10,
                grid: {
                  color: "rgba(255, 255, 255, 0.1)",
                },
              },
              x: {
                grid: {
                  display: false,
                },
              },
            },
          },
        });
      });
    }

    return () => {
      const canvas = canvasRef2.current;
      const existing = canvas ? Chart.getChart(canvas) : null;
      if (existing) {
        console.debug("Urges tab: Cleanup - destroying chart");
        existing.destroy();
      }
      chartRef2.current = null;
    };
  }, [activeTab, checkIns]);

  // Create goals progress chart
  useEffect(() => {
    if (activeTab === "goals" && goals && canvasRef3.current) {
      console.debug("Goals tab: Creating chart with", goals.length, "goals");
      
      if (chartRef3.current) {
        console.debug("Goals tab: Destroying existing chart");
        chartRef3.current.destroy();
        chartRef3.current = null;
      }

      const completedOverTime = goals.reduce((acc: number[], goal) => {
        const lastValue = acc.length > 0 ? acc[acc.length - 1] : 0;
        return [...acc, goal.completed ? lastValue + 1 : lastValue];
      }, []);

      requestAnimationFrame(() => {
        const canvas = canvasRef3.current;
        if (!canvas) return;
        
        const existing = Chart.getChart(canvas);
        if (existing) existing.destroy();
        
        console.debug("Goals tab: Initializing chart");
        chartRef3.current = new Chart(canvas, {
          type: "line",
          data: {
            labels: goals.map(g => format(new Date(g.created_at), "MMM d")),
            datasets: [
              {
                label: "Completed Goals",
                data: completedOverTime,
                borderColor: "hsl(var(--success))",
                backgroundColor: "hsl(var(--success) / 0.1)",
                tension: 0.4,
                fill: true,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: {
                beginAtZero: true,
                grid: {
                  color: "rgba(255, 255, 255, 0.1)",
                },
              },
              x: {
                grid: {
                  display: false,
                },
              },
            },
          },
        });
      });
    }

    return () => {
      const canvas = canvasRef3.current;
      const existing = canvas ? Chart.getChart(canvas) : null;
      if (existing) {
        console.debug("Goals tab: Cleanup - destroying chart");
        existing.destroy();
      }
      chartRef3.current = null;
    };
  }, [activeTab, goals]);

  return (
    <Card className="bg-card/50 backdrop-blur-lg border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Advanced Insights
        </CardTitle>
        <CardDescription>
          Analyze patterns in your recovery journey
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="emotions" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Emotional State
            </TabsTrigger>
            <TabsTrigger value="urges" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Urge Tracking
            </TabsTrigger>
            <TabsTrigger value="goals" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Goals Progress
            </TabsTrigger>
          </TabsList>

          <TabsContent value="emotions" className="space-y-4">
            {checkIns && checkIns.length > 0 ? (
              <div className="relative w-full h-[300px] sm:h-[350px]">
                <canvas ref={canvasRef} className="absolute inset-0 w-full h-full"></canvas>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No check-ins to display yet
              </div>
            )}
          </TabsContent>

          <TabsContent value="urges" className="space-y-4">
            {checkIns && checkIns.length > 0 ? (
              <div className="relative w-full h-[300px] sm:h-[350px]">
                <canvas ref={canvasRef2} className="absolute inset-0 w-full h-full"></canvas>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No check-ins to display yet
              </div>
            )}
          </TabsContent>

          <TabsContent value="goals" className="space-y-4">
            {goals && goals.length > 0 ? (
              <div className="relative w-full h-[300px] sm:h-[350px]">
                <canvas ref={canvasRef3} className="absolute inset-0 w-full h-full"></canvas>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No goals to display yet
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
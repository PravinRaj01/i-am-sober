import { useEffect, useRef } from "react";
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
  const chartRef = useRef<Chart | null>(null);
  const chartRef2 = useRef<Chart | null>(null);
  const chartRef3 = useRef<Chart | null>(null);

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

  useEffect(() => {
    if (checkIns && journalSentiments) {
      const labels = checkIns.map(ci => format(new Date(ci.created_at), "MMM d"));
      // Map moods to numeric values for visualization
      const moodMap: Record<string, number> = {
        'great': 10, 'good': 8, 'okay': 5, 'struggling': 3, 'bad': 1
      };
      const moodData = checkIns.map(ci => moodMap[ci.mood] || 5);
      const urgeData = checkIns.map(ci => ci.urge_intensity || 0);
      
      // Daily Emotional State
      const ctx = document.getElementById("moodChart") as HTMLCanvasElement;
      if (ctx && !chartRef.current) {
        chartRef.current = new Chart(ctx, {
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
            plugins: {
              title: {
                display: false,
              },
            },
          },
        });
      }

      // Urges Tracking
      const ctx2 = document.getElementById("urgeChart") as HTMLCanvasElement;
      if (ctx2 && !chartRef2.current) {
        chartRef2.current = new Chart(ctx2, {
          type: "bar",
          data: {
            labels,
            datasets: [
              {
                label: "Urge Intensity",
                data: urgeData,
                backgroundColor: "rgba(var(--warning), 0.5)",
                borderColor: "hsl(var(--warning))",
                borderWidth: 1,
              },
            ],
          },
          options: {
            responsive: true,
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
      }

      // Goals Progress
      const completedOverTime = goals?.reduce((acc: number[], goal) => {
        const lastValue = acc.length > 0 ? acc[acc.length - 1] : 0;
        return [...acc, goal.completed ? lastValue + 1 : lastValue];
      }, []) || [];

      const ctx3 = document.getElementById("goalsChart") as HTMLCanvasElement;
      if (ctx3 && goals && !chartRef3.current) {
        chartRef3.current = new Chart(ctx3, {
          type: "line",
          data: {
            labels: goals.map(g => format(new Date(g.created_at), "MMM d")),
            datasets: [
              {
                label: "Completed Goals",
                data: completedOverTime,
                borderColor: "hsl(var(--success))",
                backgroundColor: "rgba(var(--success), 0.1)",
                tension: 0.4,
                fill: true,
              },
            ],
          },
          options: {
            responsive: true,
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
      }
    }

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
      if (chartRef2.current) {
        chartRef2.current.destroy();
        chartRef2.current = null;
      }
      if (chartRef3.current) {
        chartRef3.current.destroy();
        chartRef3.current = null;
      }
    };
  }, [checkIns, journalSentiments, goals]);

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
        <Tabs defaultValue="emotions" className="space-y-4">
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
            <div className="aspect-[2/1] w-full">
              <canvas id="moodChart"></canvas>
            </div>
          </TabsContent>

          <TabsContent value="urges" className="space-y-4">
            <div className="aspect-[2/1] w-full">
              <canvas id="urgeChart"></canvas>
            </div>
          </TabsContent>

          <TabsContent value="goals" className="space-y-4">
            <div className="aspect-[2/1] w-full">
              <canvas id="goalsChart"></canvas>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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
    const createChart = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Destroy any existing chart on the canvas before creating a new one
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
      const existingChart = Chart.getChart(canvas);
      if (existingChart) {
        existingChart.destroy();
      }

      let chartConfig: any = null;

      if (activeTab === "emotions" && checkIns) {
        const labels = checkIns.map(ci => format(new Date(ci.created_at), "MMM d"));
        const moodMap: Record<string, number> = {
          'great': 10, 'good': 8, 'okay': 5, 'struggling': 3, 'bad': 1
        };
        const moodData = checkIns.map(ci => moodMap[ci.mood] || 5);
        const urgeData = checkIns.map(ci => ci.urge_intensity || 0);

        chartConfig = {
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
              y: { min: 0, max: 10, grid: { color: "rgba(255, 255, 255, 0.1)" } },
              x: { grid: { display: false } },
            },
          },
        };
      } else if (activeTab === "urges" && checkIns) {
        const labels = checkIns.map(ci => format(new Date(ci.created_at), "MMM d"));
        const urgeData = checkIns.map(ci => ci.urge_intensity || 0);

        chartConfig = {
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
              y: { beginAtZero: true, max: 10, grid: { color: "rgba(255, 255, 255, 0.1)" } },
              x: { grid: { display: false } },
            },
          },
        };
      } else if (activeTab === "goals" && goals) {
        const completedOverTime = goals.reduce((acc: number[], goal) => {
          const lastValue = acc.length > 0 ? acc[acc.length - 1] : 0;
          return [...acc, goal.completed ? lastValue + 1 : lastValue];
        }, []);

        chartConfig = {
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
              y: { beginAtZero: true, grid: { color: "rgba(255, 255, 255, 0.1)" } },
              x: { grid: { display: false } },
            },
          },
        };
      }

      if (chartConfig) {
        requestAnimationFrame(() => {
          if (canvasRef.current) {
            chartRef.current = new Chart(canvasRef.current, chartConfig);
          }
        });
      }
    };

    createChart();

    // Cleanup function to destroy the chart on component unmount or before re-render
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [activeTab, checkIns, goals]);

  const renderContent = () => {
    const hasData = (activeTab === 'emotions' && checkIns && checkIns.length > 0) ||
                    (activeTab === 'urges' && checkIns && checkIns.length > 0) ||
                    (activeTab === 'goals' && goals && goals.length > 0);
    
    const noDataMessage = activeTab === 'goals' ? 'No goals to display yet' : 'No check-ins to display yet';

    return hasData ? (
      <div className="relative w-full h-[300px] sm:h-[350px]">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full"></canvas>
      </div>
    ) : (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
        {noDataMessage}
      </div>
    );
  };

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
          <TabsList className="w-full justify-start overflow-x-auto flex-nowrap">
            <TabsTrigger value="emotions" className="flex items-center gap-2 whitespace-nowrap">
              <Brain className="h-4 w-4" />
              <span className="hidden sm:inline">Emotional State</span>
              <span className="sm:hidden">Emotions</span>
            </TabsTrigger>
            <TabsTrigger value="urges" className="flex items-center gap-2 whitespace-nowrap">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Urge Tracking</span>
              <span className="sm:hidden">Urges</span>
            </TabsTrigger>
            <TabsTrigger value="goals" className="flex items-center gap-2 whitespace-nowrap">
              <Target className="h-4 w-4" />
              <span className="hidden sm:inline">Goals Progress</span>
              <span className="sm:hidden">Goals</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="emotions" className="space-y-4">
            {renderContent()}
          </TabsContent>

          <TabsContent value="urges" className="space-y-4">
            {renderContent()}
          </TabsContent>

          <TabsContent value="goals" className="space-y-4">
            {renderContent()}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
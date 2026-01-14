import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Users, TrendingUp, Award, Calendar, Activity, Target, Shield } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export default function UserStats() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-user-stats"],
    queryFn: async () => {
      const [profiles, checkIns, goals, achievements] = await Promise.all([
        supabase.from("profiles").select("current_streak, longest_streak, level, xp, created_at"),
        supabase.from("check_ins").select("created_at", { count: "exact", head: true }),
        supabase.from("goals").select("completed", { count: "exact" }),
        supabase.from("user_achievements").select("earned_at", { count: "exact", head: true }),
      ]);

      const users = profiles.data || [];
      const streaks = users.map(u => u.current_streak || 0);
      const levels = users.map(u => u.level || 1);
      
      // Level distribution
      const levelDist: Record<number, number> = {};
      levels.forEach(l => { levelDist[l] = (levelDist[l] || 0) + 1; });
      
      // Streak distribution
      const streakBuckets = [
        { label: '0-7', min: 0, max: 7, count: 0 },
        { label: '8-30', min: 8, max: 30, count: 0 },
        { label: '31-90', min: 31, max: 90, count: 0 },
        { label: '90+', min: 91, max: 9999, count: 0 },
      ];
      streaks.forEach(s => {
        const bucket = streakBuckets.find(b => s >= b.min && s <= b.max);
        if (bucket) bucket.count++;
      });

      return {
        totalUsers: users.length,
        avgStreak: streaks.length ? Math.round(streaks.reduce((a, b) => a + b, 0) / streaks.length) : 0,
        maxStreak: Math.max(...streaks, 0),
        avgLevel: levels.length ? (levels.reduce((a, b) => a + b, 0) / levels.length).toFixed(1) : '1',
        totalCheckIns: checkIns.count || 0,
        totalAchievements: achievements.count || 0,
        levelDistribution: Object.entries(levelDist).map(([level, count]) => ({ level: `Lvl ${level}`, count })).slice(0, 10),
        streakDistribution: streakBuckets,
      };
    },
  });

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-chart-4/10">
          <Users className="h-6 w-6 text-chart-4" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">User Statistics</h1>
          <p className="text-muted-foreground text-sm">Aggregated engagement metrics</p>
        </div>
        <Badge variant="outline" className="ml-auto"><Shield className="h-3 w-3 mr-1" />Privacy-Safe</Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { title: "Total Users", value: stats?.totalUsers || 0, icon: Users },
          { title: "Avg Streak", value: `${stats?.avgStreak || 0} days`, icon: TrendingUp },
          { title: "Avg Level", value: stats?.avgLevel || '1', icon: Award },
          { title: "Max Streak", value: `${stats?.maxStreak || 0} days`, icon: Calendar },
        ].map((m, i) => (
          <Card key={i}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <m.icon className="h-4 w-4" />
                <span className="text-sm">{m.title}</span>
              </div>
              {isLoading ? <Skeleton className="h-8 w-20" /> : <p className="text-2xl font-bold">{m.value}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Level Distribution</CardTitle>
            <CardDescription>Users by level</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-[200px]" /> : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={stats?.levelDistribution || []}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="level" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Streak Distribution</CardTitle>
            <CardDescription>Users by streak duration</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-[200px]" /> : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={stats?.streakDistribution || []} cx="50%" cy="50%" innerRadius={40} outerRadius={80} dataKey="count" nameKey="label" label={({ label, percent }) => `${label} ${(percent * 100).toFixed(0)}%`}>
                    {(stats?.streakDistribution || []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const Dashboard = () => {
  useEffect(() => {
    document.title = "I Am Sober – Dashboard";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Your sobriety counter, milestones, and quick actions in one place.");
  }, []);

  // Placeholder counter until backend is enabled
  const since = useMemo(() => ({ days: 0, hours: 0 }), []);

  return (
    <main className="container mx-auto px-4 py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">Your Sobriety Journey</h1>
        <p className="text-muted-foreground">This updates automatically once Cloud is enabled.</p>
      </header>

      <section className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Sobriety Counter</CardTitle>
          </CardHeader>
          <CardContent className="flex items-end gap-6">
            <div>
              <div className="text-6xl font-bold leading-none">{since.days}</div>
              <div className="text-muted-foreground">days</div>
            </div>
            <div>
              <div className="text-4xl font-semibold leading-none">{since.hours}</div>
              <div className="text-muted-foreground">hours</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Milestones</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {[
              { label: "1 Day" },
              { label: "7 Days" },
              { label: "30 Days" },
              { label: "90 Days" },
            ].map((m) => (
              <Badge key={m.label}>{m.label}</Badge>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="mt-8 grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button>Check In</Button>
            <Button variant="secondary">Log Mood/Trigger</Button>
            <Button variant="outline">Journal</Button>
            <Button variant="destructive">Relapse</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Motivation</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Add your reasons for recovery to see them here when you need them most.</p>
          </CardContent>
        </Card>
      </section>
    </main>
  );
};

export default Dashboard;

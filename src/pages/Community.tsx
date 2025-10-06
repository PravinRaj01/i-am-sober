import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Award } from "lucide-react";

const Community = () => {
  // Placeholder data for community milestones
  const communityMilestones = [
    { id: 1, user: "Alex P.", milestone: "30 Days Sober", time: "2 hours ago" },
    { id: 2, user: "Sarah J.", milestone: "1 Year Alcohol-Free", time: "8 hours ago" },
    { id: 3, user: "Mike B.", milestone: "100 Days Clean", time: "1 day ago" },
  ];

  return (
    <div className="flex-1 bg-gradient-calm min-h-screen">
      <header className="bg-card/80 backdrop-blur-xl border-b border-border/50">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">Community</h1>
          <p className="text-sm text-muted-foreground">
            Share your progress and celebrate with others
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl animate-fade-in">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Community Feed</h1>
          <p className="text-muted-foreground">
            See recent milestones shared by the community.
          </p>
        </div>

        <div className="space-y-4">
          {communityMilestones.map((item) => (
            <Card key={item.id} className="bg-card/50 backdrop-blur-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-full">
                      <Award className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{item.user}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        is celebrating a milestone!
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">{item.time}</span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="p-4 border-l-4 border-primary bg-primary/5 rounded-r-lg">
                  <p className="font-semibold text-lg text-primary-foreground">
                    {item.milestone}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Community;

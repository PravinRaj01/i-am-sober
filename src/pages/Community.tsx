import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Award, Plus, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { differenceInDays } from "date-fns";
import MilestoneCard from "@/components/community/MilestoneCard";
import ShareMilestoneDialog from "@/components/community/ShareMilestoneDialog";
import CommunityStats from "@/components/community/CommunityStats";

const Community = () => {
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [daysSober, setDaysSober] = useState(0);

  const { data: profile } = useQuery({
    queryKey: ["profile-community"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("sobriety_start_date")
        .eq("id", user.id)
        .single();

      if (error) return null;
      return data;
    },
  });

  useEffect(() => {
    if (profile?.sobriety_start_date) {
      const days = differenceInDays(new Date(), new Date(profile.sobriety_start_date));
      setDaysSober(days);
    }
  }, [profile]);

  const { data: interactions, refetch } = useQuery({
    queryKey: ["community-interactions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_interactions")
        .select(`
          id,
          message,
          anonymous,
          created_at,
          type,
          user_id,
          profiles(pseudonym)
        `)
        .eq("type", "milestone")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data;
    },
  });

  // Set up real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("community-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "community_interactions",
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  return (
    <div className="flex-1 bg-gradient-calm min-h-screen">
      <header className="bg-card/80 backdrop-blur-xl border-b border-border/50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Community</h1>
            <p className="text-sm text-muted-foreground">
              Share your progress and celebrate with others
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button
              onClick={() => setShareDialogOpen(true)}
              className="bg-gradient-primary"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Share Milestone
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl animate-fade-in">
        <div className="mb-6">
          <CommunityStats />
        </div>

        {!interactions || interactions.length === 0 ? (
          <Card className="text-center py-16 bg-card/50 backdrop-blur-lg">
            <div className="max-w-md mx-auto">
              <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No milestones yet</h3>
              <p className="text-muted-foreground mb-6">
                Be the first to share your progress with the community!
              </p>
              <Button
                onClick={() => setShareDialogOpen(true)}
                className="bg-gradient-primary"
              >
                <Plus className="h-4 w-4 mr-2" />
                Share Your Milestone
              </Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {interactions.map((interaction: any) => (
              <MilestoneCard
                key={interaction.id}
                pseudonym={interaction.profiles?.pseudonym}
                milestone={interaction.message}
                createdAt={interaction.created_at}
                isAnonymous={interaction.anonymous}
              />
            ))}
          </div>
        )}
      </main>

      <ShareMilestoneDialog
        open={shareDialogOpen}
        onClose={() => setShareDialogOpen(false)}
        daysSober={daysSober}
        onShared={refetch}
      />
    </div>
  );
};

export default Community;

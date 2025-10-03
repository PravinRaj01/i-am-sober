import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Lightbulb, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { getAddictionContent } from "@/utils/addictionContent";

const MotivationCard = () => {
  const { data: profile } = useQuery({
    queryKey: ["profile-addiction"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("addiction_type")
        .eq("id", user.id)
        .single();

      if (error) return null;
      return data;
    },
  });

  const { data: quote, refetch } = useQuery({
    queryKey: ["motivational-quote", profile?.addiction_type],
    queryFn: () => {
      const content = getAddictionContent(profile?.addiction_type || null);
      const quotes = content.quotes;
      return quotes[Math.floor(Math.random() * quotes.length)];
    },
  });

  return (
    <Card className="p-6 bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20 backdrop-blur-xl">
      <div className="flex items-start space-x-4">
        <Lightbulb className="h-6 w-6 text-primary mt-1 shrink-0" />
        <div className="space-y-2 flex-1">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Daily Motivation
          </h3>
          <p className="text-foreground italic text-lg">{quote}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            className="mt-2 hover:bg-primary/10"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            New Quote
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default MotivationCard;

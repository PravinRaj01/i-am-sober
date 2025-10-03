import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Loader2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface GoalSuggestion {
  title: string;
  description: string;
  target_days: number;
  priority?: string;
  category?: string;
}

interface AIGoalSuggestionsProps {
  onGoalAdded: () => void;
}

const AIGoalSuggestions = ({ onGoalAdded }: AIGoalSuggestionsProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<GoalSuggestion[]>([]);
  const { toast } = useToast();

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("suggest-recovery-goals");

      if (error) throw error;

      setSuggestions(data.suggestions || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to get AI suggestions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addGoal = async (suggestion: GoalSuggestion) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("goals").insert({
        user_id: user.id,
        title: suggestion.title,
        description: suggestion.description,
        target_days: suggestion.target_days,
      });

      if (error) throw error;

      toast({
        title: "Goal added!",
        description: suggestion.title,
      });

      onGoalAdded();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="bg-gradient-primary border-primary/30"
          onClick={fetchSuggestions}
        >
          <Sparkles className="h-4 w-4 mr-2" />
          AI Suggest Goals
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl bg-card/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Goal Suggestions
          </DialogTitle>
          <DialogDescription>
            Personalized recovery goals based on your journey
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {suggestions.map((suggestion, index) => (
              <Card key={index} className="bg-card/50 backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base">{suggestion.title}</CardTitle>
                      <CardDescription className="text-sm mt-1">
                        {suggestion.description}
                      </CardDescription>
                      <div className="flex gap-2 mt-2">
                        {suggestion.priority && (
                          <Badge variant="outline" className="text-xs">
                            {suggestion.priority}
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {suggestion.target_days} days
                        </Badge>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => addGoal(suggestion)}
                      className="ml-2 bg-gradient-primary"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add
                    </Button>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AIGoalSuggestions;

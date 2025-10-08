import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Check, Loader2, Plus, Target, Calendar as CalendarIcon, Pencil, Trash2, Filter, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { differenceInDays, format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { DateRangePicker } from "@/components/DateRangePicker";
import AISuggestDialog from "@/components/goals/AISuggestDialog";
import { DateRange } from "react-day-picker";
import StorageImage from "@/components/StorageImage";

const Goals = () => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [aiSuggestOpen, setAiSuggestOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: goals, refetch } = useQuery({
    queryKey: ["goals"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("goals")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const filteredGoals = goals?.filter((goal) => {
    if (filterStatus === "active") return !goal.completed;
    if (filterStatus === "completed") return goal.completed;
    return true;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Calculate target_days from date range
      const targetDays = dateRange?.from && dateRange?.to 
        ? differenceInDays(dateRange.to, dateRange.from)
        : null;

      if (editingId) {
        const { error } = await supabase
          .from("goals")
          .update({
            title: title.trim(),
            description: description.trim() || null,
            target_days: targetDays,
            start_date: dateRange?.from?.toISOString(),
            end_date: dateRange?.to?.toISOString(),
          })
          .eq("id", editingId);

        if (error) throw error;

        toast({
          title: "Goal updated!",
          description: "Your goal has been updated.",
        });
      } else {
        const { error } = await supabase.from("goals").insert({
          user_id: user.id,
          title: title.trim(),
          description: description.trim() || null,
          target_days: targetDays,
          start_date: dateRange?.from?.toISOString(),
          end_date: dateRange?.to?.toISOString(),
        });

        if (error) throw error;

        toast({
          title: "Goal created!",
          description: "Your new goal has been added.",
        });
      }

      setTitle("");
      setDescription("");
      setDateRange(undefined);
      setEditingId(null);
      setDialogOpen(false);
      refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (goal: any) => {
    setEditingId(goal.id);
    setTitle(goal.title);
    setDescription(goal.description || "");
    setDateRange({
      from: goal.start_date ? new Date(goal.start_date) : undefined,
      to: goal.end_date ? new Date(goal.end_date) : undefined,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (goalId: string) => {
    try {
      const { error } = await supabase.from("goals").delete().eq("id", goalId);

      if (error) throw error;

      toast({
        title: "Goal deleted",
        description: "Your goal has been removed.",
      });

      refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const toggleComplete = async (goalId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("goals")
        .update({ completed: !currentStatus })
        .eq("id", goalId);

      if (error) throw error;
      refetch();
      toast({
        title: !currentStatus ? "Goal completed! 🎉" : "Goal reopened",
        description: !currentStatus ? "Congratulations on your achievement!" : "Keep working on it!",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const calculateProgress = (goal: any) => {
    if (!profile || !goal.target_days) return 0;
    const daysSober = differenceInDays(new Date(), new Date(profile.sobriety_start_date));
    return Math.min((daysSober / goal.target_days) * 100, 100);
  };

  return (
    <div className="flex-1 bg-gradient-calm min-h-screen">
      <header className="bg-card/80 backdrop-blur-xl border-b border-border/50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setAiSuggestOpen(true)}>
              <Sparkles className="h-4 w-4 mr-2" />
              AI Suggest
            </Button>
            <Dialog
            open={dialogOpen}
            onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) {
                setEditingId(null);
                setTitle("");
                setDescription("");
                setDateRange(undefined);
              }
            }}
          >
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary">
                <Plus className="h-4 w-4 mr-2" />
                New Goal
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card/90 backdrop-blur-2xl border-border/40">
              <DialogHeader>
                <DialogTitle>{editingId ? "Edit Goal" : "Create New Goal"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Goal Title</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Stay sober for 30 days"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Why is this goal important to you?"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={loading}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Date Range</Label>
                  <DateRangePicker 
                    dateRange={dateRange}
                    onDateRangeChange={setDateRange}
                  />
                  <p className="text-xs text-muted-foreground">
                    Select start and end dates for your goal
                  </p>
                </div>
                <Button
                  type="submit"
                  className="w-full bg-gradient-primary"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {editingId ? "Updating..." : "Creating..."}
                    </>
                  ) : (
                    editingId ? "Update Goal" : "Create Goal"
                  )}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        </div>
      </header>

      <AISuggestDialog 
        open={aiSuggestOpen}
        onClose={() => setAiSuggestOpen(false)}
        onGoalCreated={refetch}
      />

      <main className="container mx-auto px-4 py-8 max-w-4xl animate-fade-in">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Recovery Goals</h1>
            <p className="text-muted-foreground">Track your progress and celebrate achievements</p>
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40 bg-card/50 backdrop-blur-sm">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover/95 backdrop-blur-xl">
              <SelectItem value="all">All Goals</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {!goals || goals.length === 0 ? (
          <Card className="text-center py-16 bg-card/50 backdrop-blur-lg overflow-hidden border-border/40 shadow-xl transition-all duration-300 hover:shadow-2xl hover:bg-card/60 animate-fade-up">
            <div className="mb-6">
              <StorageImage
                bucket="illustrations"
                path="11.png"
                alt="Set your recovery goals"
                className="mx-auto h-48 w-auto rounded-lg opacity-90 drop-shadow-lg transition-all duration-300 hover:opacity-100 hover:scale-105"
              />
            </div>
            <div className="max-w-md mx-auto">
              <h3 className="text-xl font-semibold mb-3 bg-gradient-primary bg-clip-text text-transparent">Start Your Recovery Journey</h3>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Setting clear goals is a powerful way to strengthen your recovery journey. Whether it's staying sober for 30 days or developing new healthy habits, each goal is a step forward.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
                <Button 
                  onClick={() => setDialogOpen(true)} 
                  className="bg-gradient-primary"
                  size="lg"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Create First Goal
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setAiSuggestOpen(true)}
                  size="lg"
                  className="group"
                >
                  <Sparkles className="h-5 w-5 mr-2 text-primary group-hover:text-primary/70" />
                  Get AI Suggestions
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredGoals?.map((goal) => {
              const progress = calculateProgress(goal);
              return (
                <Card key={goal.id} className={cn(
                  "bg-card/50 backdrop-blur-lg",
                  goal.completed ? "bg-success/5 border-success" : ""
                )}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className={goal.completed ? "line-through text-muted-foreground" : ""}>
                          {goal.title}
                        </CardTitle>
                        {goal.description && (
                          <CardDescription className="mt-2">{goal.description}</CardDescription>
                        )}
                        {(goal.start_date || goal.end_date) && (
                          <CardDescription className="mt-2 text-xs">
                            {goal.start_date && `Start: ${format(new Date(goal.start_date), "MMM d, yyyy")}`}
                            {goal.start_date && goal.end_date && " • "}
                            {goal.end_date && `End: ${format(new Date(goal.end_date), "MMM d, yyyy")}`}
                          </CardDescription>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant={goal.completed ? "outline" : "default"}
                          size="sm"
                          onClick={() => toggleComplete(goal.id, goal.completed)}
                          className={goal.completed ? "" : "bg-success"}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(goal)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-popover/95 backdrop-blur-xl border-border/50">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Goal?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This goal will be permanently deleted.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(goal.id)}
                                className="bg-destructive hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardHeader>
                  {goal.target_days && !goal.completed && (
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-semibold">{Math.round(progress)}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                        <p className="text-xs text-muted-foreground">
                          Target: {goal.target_days} days
                        </p>
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default Goals;

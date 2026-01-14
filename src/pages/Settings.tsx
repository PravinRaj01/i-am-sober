import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Bell, User, Shield, LogOut, Sparkles, Info, RefreshCw, Trash2, AlertTriangle, Gamepad2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useBackground } from "@/contexts/BackgroundContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SidebarTrigger } from "@/components/ui/sidebar";
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

const KONAMI_CODE = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];

const Settings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { setBackgroundImage: setGlobalBackground } = useBackground();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [pseudonym, setPseudonym] = useState("");
  const [addictionType, setAddictionType] = useState<string>("");
  const [konamiProgress, setKonamiProgress] = useState<string[]>([]);
  const [konamiIndicator, setKonamiIndicator] = useState<number>(0);
  
  // Notification settings
  const [dailyReminder, setDailyReminder] = useState(true);
  const [weeklyReport, setWeeklyReport] = useState(true);
  const [milestoneAlerts, setMilestoneAlerts] = useState(true);
  const [supporterUpdates, setSupporterUpdates] = useState(false);

  // Privacy settings
  const [shareJournal, setShareJournal] = useState(false);
  const [shareCheckIns, setShareCheckIns] = useState(false);
  const [shareMilestones, setShareMilestones] = useState(true);

  // Check if dev tools are unlocked
  const isDevUnlocked = localStorage.getItem('devToolsUnlocked') === 'true';

  // Konami code listener
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const key = event.key;
    
    setKonamiProgress(prev => {
      const newProgress = [...prev, key].slice(-10);
      
      // Check if the sequence matches so far
      const isOnTrack = newProgress.every((k, i) => k === KONAMI_CODE[i]);
      
      if (!isOnTrack) {
        setKonamiIndicator(0);
        return [];
      }
      
      // Update visual indicator
      setKonamiIndicator(newProgress.length);
      
      if (newProgress.length === KONAMI_CODE.length) {
        // Konami code complete!
        localStorage.setItem('devToolsUnlocked', 'true');
        window.dispatchEvent(new Event('storage')); // Notify sidebar
        toast({
          title: "🎮 Developer Mode Unlocked!",
          description: "You found the secret! AI Observability is now accessible.",
        });
        setKonamiIndicator(0);
        navigate('/ai-observability');
        return [];
      }
      
      return newProgress;
    });
  }, [toast, navigate]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const { data: profile, refetch, isLoading, error } = useQuery({
    queryKey: ["settings-profile"],
    queryFn: async () => {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        navigate("/auth");
        return null;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      
      if (data) {
        setPseudonym(data.pseudonym || "");
        setAddictionType(data.addiction_type || "");
        const privacy = data.privacy_settings as any;
        if (privacy) {
          setShareJournal(privacy.share_journal || false);
          setShareCheckIns(privacy.share_check_ins || false);
          setShareMilestones(privacy.share_milestones || false);
        }
      }
      
      return data;
    },
    retry: false,
  });

  // Handle auth errors by redirecting
  if (error && error.message.includes("auth")) {
    navigate("/auth");
    return null;
  }


  const handleUpdateProfile = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("profiles")
        .update({
          pseudonym: pseudonym.trim() || null,
          addiction_type: addictionType || null,
          privacy_settings: {
            share_journal: shareJournal,
            share_check_ins: shareCheckIns,
            share_milestones: shareMilestones,
          },
        })
        .eq("id", user.id);

      if (error) throw error;

      toast({
        title: "Settings updated!",
        description: "Your preferences have been saved.",
      });
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



  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const handleResetAccount = async () => {
    setResetLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Reset all user data but keep the account
      await Promise.all([
        // Reset profile to defaults
        supabase.from("profiles").update({
          current_streak: 0,
          longest_streak: 0,
          xp: 0,
          level: 1,
          points: 0,
          sobriety_start_date: new Date().toISOString().split('T')[0],
          last_check_in: null,
        }).eq("id", user.id),
        
        // Delete all user data
        supabase.from("check_ins").delete().eq("user_id", user.id),
        supabase.from("journal_entries").delete().eq("user_id", user.id),
        supabase.from("goals").delete().eq("user_id", user.id),
        supabase.from("user_achievements").delete().eq("user_id", user.id),
        supabase.from("coping_activities").delete().eq("user_id", user.id),
        supabase.from("relapses").delete().eq("user_id", user.id),
        supabase.from("triggers").delete().eq("user_id", user.id),
        supabase.from("motivations").delete().eq("user_id", user.id),
        supabase.from("reflections").delete().eq("user_id", user.id),
        supabase.from("community_interactions").delete().eq("user_id", user.id),
        supabase.from("chat_messages").delete().eq("user_id", user.id),
        supabase.from("conversations").delete().eq("user_id", user.id),
      ]);

      // Invalidate all queries
      queryClient.invalidateQueries();

      toast({
        title: "Account Reset",
        description: "Your account has been reset. Starting fresh!",
      });
      
      refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setResetLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Delete all user data first
      await Promise.all([
        supabase.from("check_ins").delete().eq("user_id", user.id),
        supabase.from("journal_entries").delete().eq("user_id", user.id),
        supabase.from("goals").delete().eq("user_id", user.id),
        supabase.from("user_achievements").delete().eq("user_id", user.id),
        supabase.from("coping_activities").delete().eq("user_id", user.id),
        supabase.from("relapses").delete().eq("user_id", user.id),
        supabase.from("triggers").delete().eq("user_id", user.id),
        supabase.from("motivations").delete().eq("user_id", user.id),
        supabase.from("reflections").delete().eq("user_id", user.id),
        supabase.from("supporters").delete().eq("user_id", user.id),
        supabase.from("community_interactions").delete().eq("user_id", user.id),
        supabase.from("chat_messages").delete().eq("user_id", user.id),
        supabase.from("conversations").delete().eq("user_id", user.id),
        supabase.from("profiles").delete().eq("id", user.id),
      ]);

      // Sign out and redirect
      await supabase.auth.signOut();
      
      toast({
        title: "Account Deleted",
        description: "Your account and all data have been permanently deleted.",
      });
      
      navigate("/auth");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  const requestNotificationPermission = async () => {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        toast({
          title: "Notifications enabled!",
          description: "You'll receive reminders and updates.",
        });
      } else {
        toast({
          title: "Notifications denied",
          description: "You can enable them in your browser settings.",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Not supported",
        description: "Your browser doesn't support notifications.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card/80 backdrop-blur-xl border-b border-border/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => navigate("/")} className="hidden lg:inline-flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden lg:inline">Back</span>
              </Button>
              <SidebarTrigger className="lg:hidden" />
              <h1 className="text-xl font-semibold md:hidden">Settings</h1>
            </div>
            <Button variant="ghost" onClick={() => navigate("/")} className="shrink-0 sm:hidden">
              <ArrowLeft className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Back to Dashboard</span>
              <span className="sm:hidden">Back</span>
            </Button>
          </div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-sm text-muted-foreground">Manage your account and preferences</p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl animate-fade-in space-y-6">

        {/* Profile Settings */}
        <Card className="bg-card/50 backdrop-blur-lg border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile
            </CardTitle>
            <CardDescription>Manage your personal information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pseudonym">Display Name / Pseudonym</Label>
              <Input
                id="pseudonym"
                placeholder="How you want to be called"
                value={pseudonym}
                onChange={(e) => setPseudonym(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                This name will be visible to supporters you invite
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="addiction">Primary Recovery Focus</Label>
              <Select value={addictionType} onValueChange={setAddictionType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your focus area" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alcohol">Alcohol</SelectItem>
                  <SelectItem value="drugs">Drugs</SelectItem>
                  <SelectItem value="smoking">Smoking</SelectItem>
                  <SelectItem value="pornography">Pornography</SelectItem>
                  <SelectItem value="gambling">Gambling</SelectItem>
                  <SelectItem value="gaming">Gaming</SelectItem>
                  <SelectItem value="food">Food</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                This helps personalize motivational content
              </p>
            </div>

            <Button onClick={handleUpdateProfile} disabled={loading}>
              Save Profile
            </Button>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card className="bg-card/50 backdrop-blur-lg border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
            <CardDescription>Configure your notification preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Daily Check-in Reminder</Label>
                <p className="text-sm text-muted-foreground">Get reminded to log your daily check-in</p>
              </div>
              <Switch checked={dailyReminder} onCheckedChange={setDailyReminder} />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Weekly Progress Report</Label>
                <p className="text-sm text-muted-foreground">Receive a summary of your week</p>
              </div>
              <Switch checked={weeklyReport} onCheckedChange={setWeeklyReport} />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Milestone Alerts</Label>
                <p className="text-sm text-muted-foreground">Celebrate when you reach milestones</p>
              </div>
              <Switch checked={milestoneAlerts} onCheckedChange={setMilestoneAlerts} />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Supporter Updates</Label>
                <p className="text-sm text-muted-foreground">Notify when supporters send messages</p>
              </div>
              <Switch checked={supporterUpdates} onCheckedChange={setSupporterUpdates} />
            </div>

            <Button onClick={requestNotificationPermission} variant="outline" className="w-full">
              Enable Browser Notifications
            </Button>
          </CardContent>
        </Card>


        {/* Privacy Settings */}
        <Card className="bg-card/50 backdrop-blur-lg border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Privacy
            </CardTitle>
            <CardDescription>Control what supporters can see</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Share Journal Entries</Label>
                <p className="text-sm text-muted-foreground">Allow supporters to read your journal</p>
              </div>
              <Switch checked={shareJournal} onCheckedChange={setShareJournal} />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Share Check-ins</Label>
                <p className="text-sm text-muted-foreground">Let supporters see your mood logs</p>
              </div>
              <Switch checked={shareCheckIns} onCheckedChange={setShareCheckIns} />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Share Milestones</Label>
                <p className="text-sm text-muted-foreground">Show milestone achievements</p>
              </div>
              <Switch checked={shareMilestones} onCheckedChange={setShareMilestones} />
            </div>

            <Button onClick={handleUpdateProfile} disabled={loading}>
              Save Privacy Settings
            </Button>
          </CardContent>
        </Card>

        {/* AI Features Info */}
        <Card className="bg-card/50 backdrop-blur-lg border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Features
            </CardTitle>
            <CardDescription>
              AI-powered insights and support
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                This app uses Lovable AI (powered by Google Gemini) for AI features including:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>AI chatbot support</li>
                  <li>Motivational messages</li>
                  <li>Goal suggestions</li>
                  <li>Coping strategies</li>
                  <li>Journal sentiment analysis</li>
                </ul>
                <p className="mt-2 text-sm font-medium">
                  ✨ All Gemini models are free to use during the promotional period (Sept 29 - Oct 13, 2025).
                </p>
              </AlertDescription>
            </Alert>
            
            {/* Hidden hint for developers */}
            <div className="flex flex-col gap-2 mt-4 p-3 rounded-lg border border-dashed border-muted-foreground/20 bg-muted/30">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Gamepad2 className="h-4 w-4" />
                <span className="font-medium">Easter Egg:</span>
                <span>Old school gamers might find something special here... ↑↑↓↓←→←→BA</span>
              </div>
              
              {/* Konami progress indicator */}
              {konamiIndicator > 0 && (
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    {KONAMI_CODE.map((_, idx) => (
                      <div 
                        key={idx}
                        className={`h-2 w-2 rounded-full transition-all duration-200 ${
                          idx < konamiIndicator 
                            ? 'bg-primary scale-110' 
                            : 'bg-muted-foreground/30'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-primary animate-pulse">
                    {konamiIndicator}/10 - Keep going!
                  </span>
                </div>
              )}
            </div>
            
            {/* Show dev tools link if unlocked */}
            {isDevUnlocked && (
              <Button 
                variant="outline" 
                className="w-full mt-2"
                onClick={() => navigate('/ai-observability')}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Open AI Observability Dashboard
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Account Actions */}
        <Card className="bg-card/50 backdrop-blur-lg border-border/50">
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Manage your account</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Reset Account */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="w-full text-amber-600 border-amber-600/50 hover:bg-amber-600/10">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reset Account (Start Fresh)
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="max-w-[90vw] sm:max-w-md">
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    Reset Your Account?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This will reset all your progress including:
                    <ul className="list-disc list-inside mt-2 space-y-1 text-left">
                      <li>Your sobriety streak</li>
                      <li>All check-ins and journal entries</li>
                      <li>Goals and achievements</li>
                      <li>XP and level progress</li>
                      <li>Community posts</li>
                    </ul>
                    <p className="mt-3 font-medium">Your account will remain active but start from scratch.</p>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                  <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleResetAccount} 
                    disabled={resetLoading}
                    className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700"
                  >
                    {resetLoading ? "Resetting..." : "Yes, Reset Everything"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Delete Account */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="w-full text-destructive border-destructive/50 hover:bg-destructive/10">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Account Permanently
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="max-w-[90vw] sm:max-w-md">
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                    <Trash2 className="h-5 w-5" />
                    Delete Your Account?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    <span className="font-bold text-destructive">This action cannot be undone.</span>
                    <br /><br />
                    This will permanently delete:
                    <ul className="list-disc list-inside mt-2 space-y-1 text-left">
                      <li>Your account and profile</li>
                      <li>All recovery data and history</li>
                      <li>Journal entries and check-ins</li>
                      <li>Goals, achievements, and progress</li>
                      <li>Community posts and interactions</li>
                    </ul>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                  <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleDeleteAccount} 
                    disabled={deleteLoading}
                    className="w-full sm:w-auto bg-destructive hover:bg-destructive/90"
                  >
                    {deleteLoading ? "Deleting..." : "Yes, Delete Forever"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Separator />

            <Button onClick={handleSignOut} variant="outline" className="w-full">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Settings;

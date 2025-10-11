import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Bell, User, Shield, LogOut, Sparkles, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useBackground } from "@/contexts/BackgroundContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SidebarTrigger } from "@/components/ui/sidebar";

const Settings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { setBackgroundImage: setGlobalBackground } = useBackground();
  const [loading, setLoading] = useState(false);
  const [pseudonym, setPseudonym] = useState("");
  const [addictionType, setAddictionType] = useState<string>("");
  
  // Notification settings
  const [dailyReminder, setDailyReminder] = useState(true);
  const [weeklyReport, setWeeklyReport] = useState(true);
  const [milestoneAlerts, setMilestoneAlerts] = useState(true);
  const [supporterUpdates, setSupporterUpdates] = useState(false);

  // Privacy settings
  const [shareJournal, setShareJournal] = useState(false);
  const [shareCheckIns, setShareCheckIns] = useState(false);
  const [shareMilestones, setShareMilestones] = useState(true);

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
          </CardContent>
        </Card>

        {/* Account Actions */}
        <Card className="bg-card/50 backdrop-blur-lg border-border/50">
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Manage your account</CardDescription>
          </CardHeader>
          <CardContent>
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

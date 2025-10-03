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
import { ArrowLeft, Bell, User, Shield, LogOut, Upload, Image as ImageIcon, Palette, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useBackground } from "@/contexts/BackgroundContext";

const Settings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { setBackgroundImage: setGlobalBackground } = useBackground();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pseudonym, setPseudonym] = useState("");
  const [addictionType, setAddictionType] = useState<string>("");
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [huggingfaceToken, setHuggingfaceToken] = useState("");
  const [tokenSaving, setTokenSaving] = useState(false);
  
  // Notification settings
  const [dailyReminder, setDailyReminder] = useState(true);
  const [weeklyReport, setWeeklyReport] = useState(true);
  const [milestoneAlerts, setMilestoneAlerts] = useState(true);
  const [supporterUpdates, setSupporterUpdates] = useState(false);

  // Privacy settings
  const [shareJournal, setShareJournal] = useState(false);
  const [shareCheckIns, setShareCheckIns] = useState(false);
  const [shareMilestones, setShareMilestones] = useState(true);

  const { data: profile, refetch } = useQuery({
    queryKey: ["settings-profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      
      if (data) {
        setPseudonym(data.pseudonym || "");
        setAddictionType(data.addiction_type || "");
        setBackgroundImage(data.background_image_url || null);
        setHuggingfaceToken(data.huggingface_token || "");
        const privacy = data.privacy_settings as any;
        if (privacy) {
          setShareJournal(privacy.share_journal || false);
          setShareCheckIns(privacy.share_check_ins || false);
          setShareMilestones(privacy.share_milestones || false);
        }
      }
      
      return data;
    },
  });

  const handleBackgroundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/background.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("backgrounds")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("backgrounds")
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ background_image_url: publicUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setBackgroundImage(publicUrl);
      setGlobalBackground(publicUrl);
      toast({
        title: "Background updated!",
        description: "Your background image has been uploaded.",
      });
      refetch();
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

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

  const handleSaveToken = async () => {
    setTokenSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("profiles")
        .update({ huggingface_token: huggingfaceToken })
        .eq("id", user.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "AI token saved successfully",
      });
      refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setTokenSaving(false);
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
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-sm text-muted-foreground">Manage your account and preferences</p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl animate-fade-in space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Settings</h1>
          <p className="text-muted-foreground">Manage your account and preferences</p>
        </div>

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

        {/* Appearance Settings */}
        <Card className="bg-card/50 backdrop-blur-lg border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Appearance
            </CardTitle>
            <CardDescription>Customize your app's look</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Background Image</Label>
              <div className="flex items-center gap-4">
                {backgroundImage && (
                  <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-border">
                    <img
                      src={backgroundImage}
                      alt="Background preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <label htmlFor="background-upload">
                  <Button variant="outline" disabled={uploading} asChild>
                    <span className="cursor-pointer">
                      {uploading ? (
                        <>
                          <Upload className="h-4 w-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <ImageIcon className="h-4 w-4 mr-2" />
                          Upload Background
                        </>
                      )}
                    </span>
                  </Button>
                  <input
                    id="background-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleBackgroundUpload}
                  />
                </label>
              </div>
              <p className="text-xs text-muted-foreground">
                Upload a background image for a personalized glassy effect (max 5MB)
              </p>
            </div>
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

        {/* AI Integration */}
        <Card className="bg-card/50 backdrop-blur-lg border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Integration
            </CardTitle>
            <CardDescription>
              Configure Hugging Face API for AI-powered features
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="hf-token">Hugging Face API Token</Label>
              <Input
                id="hf-token"
                type="password"
                value={huggingfaceToken}
                onChange={(e) => setHuggingfaceToken(e.target.value)}
                placeholder="hf_..."
                className="bg-background/50"
              />
              <p className="text-xs text-muted-foreground">
                Get your free token at{" "}
                <a
                  href="https://huggingface.co/settings/tokens"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  huggingface.co/settings/tokens
                </a>
              </p>
            </div>

            <div className="flex items-center gap-2">
              {huggingfaceToken ? (
                <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                  ✓ Token Configured
                </Badge>
              ) : (
                <Badge variant="outline">Not Configured</Badge>
              )}
            </div>

            <Button 
              onClick={handleSaveToken} 
              disabled={tokenSaving}
              className="w-full"
            >
              {tokenSaving ? "Saving..." : "Save Token"}
            </Button>
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

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, ExternalLink } from "lucide-react";

const AITokenAlert = () => {
  const [showAlert, setShowAlert] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const navigate = useNavigate();

  const { data: profile } = useQuery({
    queryKey: ["profile-token-check"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("gemini_api_key")
        .eq("id", user.id)
        .single();

      if (error) return null;
      return data;
    },
  });

  useEffect(() => {
    // Check if alert was dismissed in this session
    const alertDismissed = sessionStorage.getItem("ai-token-alert-dismissed");
    
    if (alertDismissed) {
      setDismissed(true);
      return;
    }

    // Show alert after 2 seconds if no token
    if (profile && !profile.gemini_api_key && !dismissed) {
      const timer = setTimeout(() => {
        setShowAlert(true);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [profile, dismissed]);

  const handleDismiss = () => {
    sessionStorage.setItem("ai-token-alert-dismissed", "true");
    setShowAlert(false);
    setDismissed(true);
  };

  const handleGoToSettings = () => {
    setShowAlert(false);
    navigate("/settings");
  };

  return (
    <AlertDialog open={showAlert} onOpenChange={setShowAlert}>
      <AlertDialogContent className="bg-popover/95 backdrop-blur-xl border-warning/50">
        <AlertDialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-5 w-5 text-warning" />
            <AlertDialogTitle>AI Features Disabled</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-3">
            <p>
              To enable AI-powered insights, journal analysis, and smart suggestions, 
              please add your Google Gemini API key.
            </p>
            <p className="text-sm">
              🎁 <strong>100% Free:</strong> No credit card required, free tier available
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleDismiss}>Dismiss</AlertDialogCancel>
          <Button
            variant="outline"
            onClick={() => window.open("https://aistudio.google.com/app/apikey", "_blank")}
          >
            Get Free API Key
            <ExternalLink className="h-4 w-4 ml-2" />
          </Button>
          <AlertDialogAction onClick={handleGoToSettings} className="bg-gradient-primary">
            Go to Settings
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default AITokenAlert;

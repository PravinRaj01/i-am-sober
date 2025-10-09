import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Sparkles } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const AITokenAlert = () => {
  const [showAlert, setShowAlert] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const { data: user } = useQuery({
    queryKey: ["user-check"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  useEffect(() => {
    // Check if user has permanently dismissed this alert
    const permanentlyDismissed = localStorage.getItem("lovable-ai-welcome-dismissed");
    
    if (permanentlyDismissed) {
      return;
    }

    // Show alert after 2 seconds for new users
    if (user) {
      const timer = setTimeout(() => {
        setShowAlert(true);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [user]);

  const handleDismiss = () => {
    if (dontShowAgain) {
      localStorage.setItem("lovable-ai-welcome-dismissed", "true");
    }
    setShowAlert(false);
  };

  return (
    <AlertDialog open={showAlert} onOpenChange={setShowAlert}>
      <AlertDialogContent className="bg-popover/95 backdrop-blur-xl border-primary/30">
        <AlertDialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <AlertDialogTitle>Welcome to Recovery Journey!</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-3">
            <p>
              Your app is powered by <strong>Lovable AI Gateway</strong>, which provides 
              access to advanced AI models including Google Gemini and OpenAI GPT.
            </p>
            <p className="text-sm">
              ✨ <strong>Built-in AI:</strong> No API keys needed, AI features work out of the box
            </p>
            <p className="text-sm">
              🔒 <strong>Secure:</strong> All AI requests are processed securely through our gateway
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <div className="flex items-center gap-2 mr-auto">
            <Checkbox 
              id="dont-show" 
              checked={dontShowAgain}
              onCheckedChange={(checked) => setDontShowAgain(checked as boolean)}
            />
            <Label htmlFor="dont-show" className="text-sm cursor-pointer">
              Don't show this again
            </Label>
          </div>
          <AlertDialogAction onClick={handleDismiss} className="bg-gradient-primary">
            Got it!
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default AITokenAlert;

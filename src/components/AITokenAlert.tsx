import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface AITokenAlertProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AITokenAlert = ({ open, onOpenChange }: AITokenAlertProps) => {
  const navigate = useNavigate();

  const handleDismiss = () => {
    localStorage.setItem("ai-token-alert-dismissed", "true");
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-background/95 backdrop-blur-3xl border-primary/20">
        <AlertDialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <AlertDialogTitle>AI Features Available</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-base">
            Enable AI-powered insights, journal analysis, mood pattern detection, and smart goal suggestions by adding your free Hugging Face API token.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleDismiss}
            className="border-primary/20"
          >
            Maybe Later
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              window.open("https://huggingface.co/settings/tokens", "_blank");
            }}
            className="border-primary/20"
          >
            Get Free Token
          </Button>
          <AlertDialogAction
            onClick={() => {
              handleDismiss();
              navigate("/settings");
            }}
            className="bg-primary hover:bg-primary/90"
          >
            Go to Settings
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

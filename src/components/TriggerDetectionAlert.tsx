import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface TriggerDetectionAlertProps {
  triggers: string[];
}

const TriggerDetectionAlert = ({ triggers }: TriggerDetectionAlertProps) => {
  const navigate = useNavigate();

  if (triggers.length === 0) return null;

  return (
    <Alert className="bg-warning/10 border-warning/30">
      <AlertTriangle className="h-4 w-4 text-warning" />
      <AlertTitle className="text-warning">Potential Triggers Detected</AlertTitle>
      <AlertDescription>
        <p className="text-sm text-foreground mb-2">
          We noticed some potential trigger words: <strong>{triggers.join(", ")}</strong>
        </p>
        <p className="text-xs text-muted-foreground mb-3">
          Consider using coping strategies or reaching out to your support network.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/coping-tools")}
          className="text-warning border-warning/30"
        >
          <ExternalLink className="h-3 w-3 mr-1" />
          View Coping Tools
        </Button>
      </AlertDescription>
    </Alert>
  );
};

export default TriggerDetectionAlert;

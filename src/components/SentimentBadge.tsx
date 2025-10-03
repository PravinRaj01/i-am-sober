import { Badge } from "@/components/ui/badge";
import { Smile, Frown, Meh } from "lucide-react";

interface SentimentBadgeProps {
  label: string;
  score: number;
}

const SentimentBadge = ({ label, score }: SentimentBadgeProps) => {
  const getConfig = () => {
    switch (label.toLowerCase()) {
      case "positive":
        return {
          icon: Smile,
          className: "bg-success/20 text-success border-success/30",
          text: "Positive"
        };
      case "negative":
        return {
          icon: Frown,
          className: "bg-destructive/20 text-destructive border-destructive/30",
          text: "Negative"
        };
      default:
        return {
          icon: Meh,
          className: "bg-warning/20 text-warning border-warning/30",
          text: "Neutral"
        };
    }
  };

  const config = getConfig();
  const Icon = config.icon;
  const confidence = Math.round(score * 100);

  return (
    <Badge variant="outline" className={config.className}>
      <Icon className="h-3 w-3 mr-1" />
      {config.text} ({confidence}%)
    </Badge>
  );
};

export default SentimentBadge;

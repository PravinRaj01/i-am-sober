import { Button } from "@/components/ui/button";
import { TrendingUp, BookOpen, Target, Lightbulb } from "lucide-react";

interface ChatQuickActionsProps {
  onActionClick: (message: string) => void;
  disabled?: boolean;
}

const ChatQuickActions = ({ onActionClick, disabled }: ChatQuickActionsProps) => {
  const actions = [
    {
      icon: TrendingUp,
      label: "Show Progress",
      message: "Show me my recovery progress and statistics",
    },
    {
      icon: BookOpen,
      label: "Analyze Journal",
      message: "Analyze my recent journal entries for patterns",
    },
    {
      icon: Target,
      label: "Review Goals",
      message: "Review my goals and suggest next steps",
    },
    {
      icon: Lightbulb,
      label: "Get Advice",
      message: "Give me encouragement and coping strategies for today",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 p-2">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Button
            key={action.label}
            variant="outline"
            size="sm"
            className="justify-start text-xs h-auto py-2 bg-card/50"
            onClick={() => onActionClick(action.message)}
            disabled={disabled}
          >
            <Icon className="h-3 w-3 mr-1" />
            {action.label}
          </Button>
        );
      })}
    </div>
  );
};

export default ChatQuickActions;

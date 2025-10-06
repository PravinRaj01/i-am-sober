import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Award, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface MilestoneCardProps {
  pseudonym: string;
  milestone: string;
  message?: string;
  createdAt: string;
  isAnonymous: boolean;
}

const MilestoneCard = ({ pseudonym, milestone, message, createdAt, isAnonymous }: MilestoneCardProps) => {
  return (
    <Card className="bg-card/50 backdrop-blur-lg border-primary/20 animate-fade-in hover:shadow-soft transition-all">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-full">
              <Award className="h-5 w-5 text-primary" />
            </div>
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-muted">
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-sm">
                  {isAnonymous ? "Anonymous" : pseudonym}
                </p>
                <p className="text-xs text-muted-foreground">
                  achieved a milestone!
                </p>
              </div>
            </div>
          </div>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="p-4 border-l-4 border-primary bg-primary/5 rounded-r-lg space-y-2">
          <p className="font-semibold text-lg text-primary">
            {milestone}
          </p>
          {message && (
            <p className="text-sm text-muted-foreground italic">
              "{message}"
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MilestoneCard;

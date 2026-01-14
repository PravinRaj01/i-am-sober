import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";

interface OpikBadgeProps {
  className?: string;
}

const OpikBadge = ({ className }: OpikBadgeProps) => {
  return (
    <a
      href="https://www.comet.com/site/products/opik/"
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      <Badge 
        variant="outline" 
        className="gap-1.5 px-2.5 py-1 text-xs font-medium bg-card/50 border-primary/30 hover:bg-primary/10 hover:border-primary/50 transition-colors cursor-pointer"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="text-primary"
        >
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
          <circle cx="12" cy="12" r="4" fill="currentColor" />
        </svg>
        <span>Powered by Opik</span>
        <ExternalLink className="h-3 w-3 opacity-50" />
      </Badge>
    </a>
  );
};

export default OpikBadge;

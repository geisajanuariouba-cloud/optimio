import { TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
  to?: string;
}

export const Logo = ({ size = "md", showWordmark = true, to = "/" }: LogoProps) => {
  const sizes = { sm: "text-lg", md: "text-2xl", lg: "text-4xl" };
  const iconSizes = { sm: "h-6 w-6", md: "h-8 w-8", lg: "h-12 w-12" };

  return (
    <Link to={to} className="flex items-center gap-2 select-none hover:opacity-90 transition">
      <div className={`relative ${iconSizes[size]} rounded-lg bg-gradient-brand flex items-center justify-center shadow-lg`}>
        <TrendingUp className="h-1/2 w-1/2 text-white" strokeWidth={3} />
        <div className="absolute inset-0 rounded-lg bg-gradient-brand blur-md opacity-50 -z-10" />
      </div>
      {showWordmark && (
        <span className={`font-display font-bold tracking-tight text-gradient-brand ${sizes[size]}`}>
          Optimio
        </span>
      )}
    </Link>
  );
};

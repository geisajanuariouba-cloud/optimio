import { Link } from "react-router-dom";
import logoAsset from "@/assets/optimio-logo.png.asset.json";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  /** mantido por compatibilidade — a logo já contém o wordmark */
  showWordmark?: boolean;
  to?: string;
  /** Mostra só o ícone redondo (sem wordmark). Útil para áreas estreitas. */
  iconOnly?: boolean;
}

const HEIGHTS: Record<NonNullable<LogoProps["size"]>, string> = {
  sm: "h-7",
  md: "h-9",
  lg: "h-14",
};

export const Logo = ({ size = "md", to = "/", iconOnly = false }: LogoProps) => {
  const heightCls = HEIGHTS[size];
  return (
    <Link to={to} className="inline-flex items-center select-none hover:opacity-90 transition" aria-label="Optimio">
      <img
        src={logoAsset.url}
        alt="Optimio"
        className={`${heightCls} w-auto ${iconOnly ? "aspect-square object-cover object-left" : ""}`}
        draggable={false}
      />
    </Link>
  );
};

export default Logo;

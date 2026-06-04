import { ImgHTMLAttributes, useState } from "react";
import { cn } from "@/lib/utils";

interface LazyImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src?: string | null;
  fallback?: React.ReactNode;
  wrapperClassName?: string;
}

/**
 * Drop-in <img> replacement with:
 *  - native lazy loading + async decode
 *  - graceful fallback when src is missing or fails to load
 *  - subtle fade-in once decoded (no layout shift)
 */
export function LazyImage({
  src,
  alt = "",
  className,
  wrapperClassName,
  fallback,
  ...rest
}: LazyImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  if (!src || errored) {
    return (
      <div className={cn("flex items-center justify-center bg-muted text-muted-foreground", wrapperClassName, className)}>
        {fallback ?? <span className="text-xs">—</span>}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onLoad={() => setLoaded(true)}
      onError={() => setErrored(true)}
      className={cn("transition-opacity duration-200", loaded ? "opacity-100" : "opacity-0", className)}
      {...rest}
    />
  );
}

export default LazyImage;

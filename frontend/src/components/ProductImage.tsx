import { useState } from "react";
import { Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { placeholderGradient } from "@/lib/format";

/**
 * У Product есть поле ImageUrl, но через API его выставить нельзя
 * (AddProduct.Command / UpdateProduct.CommandDto его не принимают — REVIEW.md п.5),
 * поэтому почти всегда рисуем плейсхолдер.
 */
export function ProductImage({
  src,
  alt,
  seed,
  className,
}: {
  src: string | null | undefined;
  alt: string;
  seed: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;

  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden bg-muted",
        className,
      )}
      style={showImage ? undefined : { background: placeholderGradient(seed) }}
    >
      {showImage ? (
        <img
          src={src!}
          alt={alt}
          loading="lazy"
          onError={() => setFailed(true)}
          className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <Package className="size-10 text-white/40" strokeWidth={1.25} />
      )}
    </div>
  );
}

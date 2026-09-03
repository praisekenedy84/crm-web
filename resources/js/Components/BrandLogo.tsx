interface BrandLogoProps {
  size?: number;
  className?: string;
  alt?: string;
}

/** Mernet star mark — use in sidebar, login, and other brand surfaces. */
export function BrandLogo({ size = 36, className, alt = 'Mernet' }: BrandLogoProps) {
  return (
    <img
      src="/mernet-star-512.png"
      width={size}
      height={size}
      alt={alt}
      className={className ?? 'size-9 shrink-0 rounded-xl object-cover shadow-lg shadow-black/20'}
      decoding="async"
    />
  );
}

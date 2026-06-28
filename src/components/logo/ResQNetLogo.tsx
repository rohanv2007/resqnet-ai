import { cn } from "@/lib/utils";

interface ResQNetLogoProps {
  className?: string;
  size?: number;
  showWordmark?: boolean;
  wordmarkClassName?: string;
}

export function ResQNetLogo({
  className,
  size = 40,
  showWordmark = false,
  wordmarkClassName,
}: ResQNetLogoProps) {
  const gradientId = `resq-shield-gradient-${size}`;

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="ResQNet logo"
        className="shrink-0"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="24" y2="24">
            <stop offset="0%" stopColor="var(--brand, #0f766e)" />
            <stop offset="100%" stopColor="var(--brand-dark, #0d4f47)" />
          </linearGradient>
        </defs>
        {/* Outer shield */}
        <path
          d="M12 1L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 1Z"
          fill={`url(#${gradientId})`}
        />
        {/* Inner badge highlight */}
        <path
          d="M12 3L4.5 6.33V11C4.5 15.62 7.7 19.95 12 21V3Z"
          fill="white"
          fillOpacity="0.14"
        />
        {/* Central rescue star / cross */}
        <path
          d="M12 7L13.5 10.5H17L14.25 12.5L15.25 16L12 14L8.75 16L9.75 12.5L7 10.5H10.5L12 7Z"
          fill="white"
        />
      </svg>
      {showWordmark ? (
        <div className={cn("flex flex-col leading-none", wordmarkClassName)}>
          <span
            className="text-base font-bold tracking-tight text-foreground"
            style={{
              fontFamily:
                "'Space Grotesk', 'Geist', ui-sans-serif, system-ui, sans-serif",
            }}
          >
            ResQNet
          </span>
          <span
            className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mt-0.5"
            style={{
              fontFamily:
                "'DM Sans', 'Geist', ui-sans-serif, system-ui, sans-serif",
            }}
          >
            Disaster Intelligence
          </span>
        </div>
      ) : null}
    </div>
  );
}

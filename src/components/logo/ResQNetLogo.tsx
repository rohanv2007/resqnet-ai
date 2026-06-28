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
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="ResQNet logo"
        className="shrink-0"
      >
        <defs>
          <linearGradient id="resq-gradient" x1="0" y1="0" x2="48" y2="48">
            <stop offset="0%" stopColor="var(--brand, #0f766e)" />
            <stop offset="100%" stopColor="var(--brand-dark, #0d4f47)" />
          </linearGradient>
        </defs>
        {/* Outer shield */}
        <path
          d="M24 2.5L42 10.5V21.5C42 33.5 34 42 24 46C14 42 6 33.5 6 21.5V10.5L24 2.5Z"
          fill="url(#resq-gradient)"
        />
        {/* Inner badge ring */}
        <path
          d="M24 8L36 13.5V21.5C36 30.5 30.5 36.5 24 40C17.5 36.5 12 30.5 12 21.5V13.5L24 8Z"
          fill="white"
          fillOpacity="0.12"
        />
        {/* Rescue cross / plus */}
        <path
          d="M20 18H22V22H18V24H22V28H20V30H22V34H26V30H28V28H26V24H30V22H26V18H24V16H22V18Z"
          fill="white"
        />
        <path d="M22 16H26V18H22V16Z" fill="white" />
        <path d="M18 22H22V24H18V22Z" fill="white" />
        <path d="M26 22H30V24H26V22Z" fill="white" />
        <path d="M22 28H26V30H22V28Z" fill="white" />
        {/* Network node pulses */}
        <circle cx="36" cy="14" r="3" fill="white" fillOpacity="0.9" />
        <circle cx="36" cy="14" r="5" stroke="white" strokeOpacity="0.5" strokeWidth="1" />
        <circle cx="36" cy="14" r="7.5" stroke="white" strokeOpacity="0.25" strokeWidth="0.5" />
        {/* Connecting line to shield */}
        <path d="M32 13L26 16" stroke="white" strokeOpacity="0.6" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      {showWordmark ? (
        <div className={cn("flex flex-col leading-none", wordmarkClassName)}>
          <span className="text-base font-semibold tracking-tight text-foreground">ResQNet</span>
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Disaster Intelligence</span>
        </div>
      ) : null}
    </div>
  );
}

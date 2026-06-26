
import { motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Info, ShieldAlert } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import type { RiskLevel } from "@/types";

const icons = {
  low: CheckCircle2,
  watch: Info,
  warning: AlertTriangle,
  danger: ShieldAlert,
};

export function RiskBadge({ level }: { level: RiskLevel }) {
  const Icon = icons[level];
  const reduceMotion = useReducedMotion();
  const shouldPulse = level === "danger" && !reduceMotion;

  return (
    <motion.div
      animate={shouldPulse ? { scale: [1, 1.02, 1] } : undefined}
      transition={shouldPulse ? { duration: 2, repeat: Infinity } : undefined}
      className="inline-flex"
    >
      <StatusBadge status={level} className="px-3 py-1 text-xs">
        <Icon className="h-3.5 w-3.5" />
      </StatusBadge>
    </motion.div>
  );
}

import { Progress } from "@/components/ui/progress";

function confidenceColor(confidence: number) {
  if (confidence < 70) {
    return "text-risk-watch";
  }
  if (confidence < 86) {
    return "text-blue-600 dark:text-blue-300";
  }
  return "text-risk-low";
}

export function ConfidenceBar({ confidence }: { confidence: number }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Confidence</span>
        <span className={confidenceColor(confidence)}>{confidence}%</span>
      </div>
      <Progress value={confidence} className="h-1.5" />
    </div>
  );
}

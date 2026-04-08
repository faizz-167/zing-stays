interface CompletenessBarProps { score: number }

export default function CompletenessBar({ score }: CompletenessBarProps) {
  const color = score >= 80 ? 'bg-green-500' : score >= 50 ? 'bg-accent' : 'bg-amber-500';
  return (
    <div className="space-y-2">
      <div className="flex justify-between">
        <span className="font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground">Listing Quality</span>
        <span className="font-mono text-xs font-medium text-foreground">{score}%</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all duration-500 rounded-full`} style={{ width: `${score}%` }} />
      </div>
      {score < 80 && (
        <p className="font-sans text-xs text-muted-foreground">Add more details to improve visibility and reach more tenants.</p>
      )}
    </div>
  );
}

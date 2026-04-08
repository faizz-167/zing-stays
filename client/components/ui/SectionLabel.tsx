interface SectionLabelProps { children: string }

export default function SectionLabel({ children }: SectionLabelProps) {
  return (
    <div className="mb-6 flex items-center gap-4">
      <span className="h-px flex-1 bg-border" />
      <span className="font-mono text-xs font-medium uppercase tracking-[0.15em] text-accent">
        {children}
      </span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

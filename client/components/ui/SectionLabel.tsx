interface SectionLabelProps { children: string }

export default function SectionLabel({ children }: SectionLabelProps) {
  return (
    <div className="mb-6 flex items-center gap-4">
      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-border" />
      <div className="flex items-center gap-2">
        <span className="text-accent/40 text-[8px] leading-none">◆</span>
        <span className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-accent">
          {children}
        </span>
        <span className="text-accent/40 text-[8px] leading-none">◆</span>
      </div>
      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-border" />
    </div>
  );
}

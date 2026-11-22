/** A small labelled chip in the job page's summary row. */
export function Pill({
  icon: Icon,
  children,
  accent,
}: {
  icon?: React.ElementType;
  children: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs ${
        accent
          ? "border-accent/30 bg-accent/8 text-accent-text"
          : "border-border-standard text-muted-foreground"
      }`}
    >
      {Icon && <Icon className="w-3 h-3 shrink-0" />}
      {children}
    </span>
  );
}

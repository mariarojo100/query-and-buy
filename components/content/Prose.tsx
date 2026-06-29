/** Consistent reading styles for legal/info pages (manual prose, no plugin). */
export function Prose({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-4 text-[15px] leading-[1.8] text-foreground/90 [&_a]:text-primary [&_a]:underline-offset-2 hover:[&_a]:underline [&_h2]:font-display [&_h2]:mb-2 [&_h2]:mt-9 [&_h2]:text-xl [&_h2]:tracking-tight [&_h2]:text-foreground [&_li]:marker:text-muted-foreground [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ol]:pl-5 [&_strong]:font-medium [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
      {children}
    </div>
  )
}

export function ContentHeader({ eyebrow, title, updated }: { eyebrow: string; title: string; updated?: string }) {
  return (
    <header className="mb-8">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="font-display mt-2 text-3xl tracking-tight sm:text-4xl">{title}</h1>
      {updated && <p className="mt-2 text-sm text-muted-foreground">Last updated {updated}</p>}
    </header>
  )
}

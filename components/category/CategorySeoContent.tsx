import { categoryFaqs, categoryIntro } from '@/lib/seo/categoryContent'

/**
 * Crawlable intro copy + FAQ block for category and category-in-city pages.
 * All text is server-rendered into the DOM (native <details>) so it is indexable
 * and mirrors the FAQPage JSON-LD emitted alongside it.
 */
export function CategorySeoContent({
  slug,
  name,
  city,
}: {
  slug: string
  name: string
  city?: string | null
}) {
  const { detail } = categoryIntro(slug, name, city)
  const faqs = categoryFaqs(slug, name, city)

  return (
    <section className="mt-10 border-t border-border pt-8">
      <div className="max-w-3xl space-y-4">
        <p className="text-sm leading-relaxed text-muted-foreground">{detail}</p>
      </div>

      {faqs.length > 0 && (
        <div className="mt-8 max-w-3xl">
          <h2 className="font-display text-xl tracking-tight sm:text-2xl">
            {city ? `${name} in ${city} — FAQs` : `${name} — frequently asked questions`}
          </h2>
          <div className="mt-4 divide-y divide-border rounded-lg border border-border">
            {faqs.map((f) => (
              <details key={f.question} className="group px-4 py-3">
                <summary className="cursor-pointer list-none text-sm font-medium marker:hidden">
                  {f.question}
                </summary>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.answer}</p>
              </details>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

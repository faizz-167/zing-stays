import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import type { ListingCardData } from '@/lib/types';
import SeoListingCard from '@/components/seo/SeoListingCard';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

interface ContentPage {
  id: number;
  slug: string;
  type: string;
  title: string;
  body: string;
  cityId: number | null;
  localityId: number | null;
  isPublished: boolean;
  publishedAt: string | null;
  cityName: string | null;
  citySlug: string | null;
  localityName: string | null;
  localitySlug: string | null;
}

interface RelatedListing extends ListingCardData {
  foodIncluded: boolean;
}

async function getPage(slug: string): Promise<ContentPage | null> {
  const res = await fetch(`${API_URL}/content/${slug}`, { next: { revalidate: 3600 } });
  if (res.status === 404) return null;
  if (!res.ok) return null;
  return res.json() as Promise<ContentPage>;
}

async function getRelatedListings(localityId: number): Promise<RelatedListing[]> {
  try {
    const res = await fetch(
      `${API_URL}/listings?localityId=${localityId}&status=active&intent=rent&limit=6`,
      { next: { revalidate: 3600 } },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { data?: RelatedListing[] } | RelatedListing[];
    const rows = Array.isArray(data) ? data : (data.data ?? []);
    return rows.map((l) => ({ ...l, badges: [] }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPage(slug);
  if (!page) return { title: 'Guide Not Found | ZingBrokers' };
  return {
    title: `${page.title} | ZingBrokers`,
    description: page.body.slice(0, 160).replace(/[#*>\n]/g, ' ').trim(),
    alternates: { canonical: `https://zingbrokers.com/guides/${slug}` },
    robots: { index: true, follow: true },
  };
}

/**
 * Serialize an object to a JSON string safe for inline <script> tags.
 * JSON.stringify alone is not safe — a value containing </script> would
 * terminate the script block and allow arbitrary HTML injection.
 */
function safeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/<\/script>/gi, '<\\/script>');
}

/** Escape HTML entities so raw user content can never inject tags. */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Convert simple Markdown to HTML.
 * Input is entity-escaped first, so any HTML/script in the source body
 * renders as visible text rather than executing.
 */
function renderMarkdown(md: string): string {
  const renderInline = (value: string) =>
    escapeHtml(value)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>');

  return md
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      if (block.startsWith('### ')) {
        return `<h3 class="font-display text-xl mt-6 mb-2">${renderInline(block.slice(4))}</h3>`;
      }
      if (block.startsWith('## ')) {
        return `<h2 class="font-display text-2xl mt-8 mb-3">${renderInline(block.slice(3))}</h2>`;
      }
      if (block.startsWith('# ')) {
        return `<h1 class="font-display text-3xl mt-8 mb-4">${renderInline(block.slice(2))}</h1>`;
      }

      const paragraph = block
        .split('\n')
        .map((line) => renderInline(line.trim()))
        .join('<br />');

      return `<p class="mb-4">${paragraph}</p>`;
    })
    .join('');
}

export default async function GuidePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = await getPage(slug);
  if (!page) notFound();

  const relatedListings = page.localityId ? await getRelatedListings(page.localityId) : [];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: page.title,
    datePublished: page.publishedAt,
    publisher: {
      '@type': 'Organization',
      name: 'ZingBrokers',
      url: 'https://zingbrokers.com',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />
      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Breadcrumb */}
        {(page.cityName || page.localityName) && (
          <nav className="font-mono text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-6">
            <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
            {page.citySlug && page.cityName && (
              <>
                <span>/</span>
                <Link href={`/${page.citySlug}`} className="hover:text-foreground transition-colors">
                  {page.cityName}
                </Link>
              </>
            )}
            {page.citySlug && page.localitySlug && page.localityName && (
              <>
                <span>/</span>
                <Link
                  href={`/${page.citySlug}/${page.localitySlug}`}
                  className="hover:text-foreground transition-colors"
                >
                  {page.localityName}
                </Link>
              </>
            )}
            <span>/</span>
            <span>Guide</span>
          </nav>
        )}

        <div className="mb-6">
          <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            {page.type.replace(/_/g, ' ')}
          </span>
          <h1 className="font-display text-4xl leading-tight mt-2">{page.title}</h1>
          {page.publishedAt && (
            <p className="mt-2 text-sm text-muted-foreground">
              Published{' '}
              {new Date(page.publishedAt).toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          )}
        </div>

        <article
          className="prose prose-lg max-w-none font-sans text-foreground"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(page.body) }}
        />

        {/* Related listings for this locality */}
        {relatedListings.length > 0 && page.localityName && (
          <div className="mt-12">
            <h2 className="font-display text-2xl mb-6">
              Listings in {page.localityName}
              {page.cityName ? `, ${page.cityName}` : ''}
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {relatedListings.map((l) => (
                <SeoListingCard
                  key={l.id}
                  listing={l}
                  city={page.cityName ?? ''}
                  locality={page.localityName ?? ''}
                  pageType="seo_locality"
                />
              ))}
            </div>
            {page.citySlug && page.localitySlug && (
              <div className="mt-6">
                <Link
                  href={`/${page.citySlug}/${page.localitySlug}`}
                  className="font-sans text-sm text-accent hover:underline"
                >
                  See all listings in {page.localityName} →
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

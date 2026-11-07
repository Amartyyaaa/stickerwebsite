import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Fragment } from 'react';
import { getInfoPage, PAGE_SLUGS } from '@/content/pages';
import { getSettings } from '@/lib/catalog/queries';

/** Every page here is built from cached data, so it is served as a complete static page and unknown URLs get a real 404. */
export const ensureStatic = 'navigation';

export function generateStaticParams() {
  return PAGE_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<'/pages/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const page = getInfoPage(slug, await getSettings());
  return page ? { title: page.title, description: page.description } : { title: 'Not found' };
}

/** Highlight [placeholders] so they're easy to spot and replace. */
function Text({ children }: { children: string }) {
  const parts = children.split(/(\[[^\]]+\])/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('[') && p.endsWith(']') ? (
          <mark key={i} className="rounded-[2px] bg-orange/20 px-1 text-orange" title="Placeholder: replace with your details">
            {p}
          </mark>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </>
  );
}

export default async function InfoPageRoute({ params }: PageProps<'/pages/[slug]'>) {
  const { slug } = await params;
  const settings = await getSettings();
  const page = getInfoPage(slug, settings);
  if (!page) notFound();
  return (
    <div className="wrap py-8 md:py-12">
      <div className="grid gap-10 lg:grid-cols-[220px_minmax(0,720px)]">
        <nav aria-label="Help pages" className="order-2 lg:order-1">
          <ul className="grid gap-1.5 text-[15px]">
            {PAGE_SLUGS.map((s) => (
              <li key={s}>
                <Link href={`/pages/${s}`} aria-current={s === slug ? 'page' : undefined} className={s === slug ? 'font-bold text-lime' : 'text-muted hover:text-ink'}>
                  {getInfoPage(s, settings)?.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <article className="prose-pyv order-1 lg:order-2">
          <h1 className="display text-[clamp(38px,5.5vw,64px)]">{page.title}</h1>
          <p className="!mt-3 text-[17px] !text-muted">{page.description}</p>
          {page.blocks.map((b, i) => (
            <section key={i}>
              {b.heading && <h2>{b.heading}</h2>}
              {b.paragraphs?.map((p, j) => (
                <p key={j} className={!b.heading && i === 0 ? 'mt-6' : undefined}>
                  <Text>{p}</Text>
                </p>
              ))}
              {b.list && (
                <ul>
                  {b.list.map((l, j) => (
                    <li key={j}>
                      <Text>{l}</Text>
                    </li>
                  ))}
                </ul>
              )}
              {b.qa && (
                <div className="mt-6 divide-y divide-line border-y border-line">
                  {b.qa.map((x) => (
                    <details key={x.q} className="group py-4">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[17px] font-bold">
                        {x.q}
                        <span className="text-lime transition group-open:rotate-45" aria-hidden="true">
                          +
                        </span>
                      </summary>
                      <p className="mt-2">
                        <Text>{x.a}</Text>
                      </p>
                    </details>
                  ))}
                </div>
              )}
            </section>
          ))}
        </article>
      </div>
    </div>
  );
}

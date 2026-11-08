import Link from 'next/link';
import { Art } from '@/components/art';
import { JsonLd } from '@/components/json-ld';
import { CardIcon, DropIcon, LayersIcon, TruckIcon, UploadIcon } from '@/components/icons';
import { ProductGrid } from '@/components/product/product-card';
import { SectionHead } from '@/components/section-head';
import { getCounts, getHomeRows, getSettings, getTypes, getVibes } from '@/lib/catalog/queries';
import { CUSTOM_CARDS, HERO_ART, HOME_TILES } from '@/lib/home';
import { formatINR } from '@/lib/money';
import { payBadge } from '@/lib/payments/methods';
import { storeLd } from '@/lib/seo';
import { siteUrl } from '@/lib/site';

const FAN: Array<{ left: string; top: string; rot: string; art: Parameters<typeof Art>[0]['spec'] }> = [
  { left: '0%', top: '30%', rot: '-14deg', art: { kind: 'sticker', seed: 41, shape: 'badge', word: 'HOLA', c1: 'd', c2: 'c' } },
  { left: '18%', top: '0%', rot: '8deg', art: { kind: 'holo', seed: 42, shape: 'star', word: 'YAY', c1: 'f', c2: 'c' } },
  { left: '37%', top: '34%', rot: '-4deg', art: { kind: 'sticker', seed: 43, shape: 'blob', word: 'CHILL', c1: 'a', c2: 'e' } },
  { left: '56%', top: '4%', rot: '12deg', art: { kind: 'sticker', seed: 44, shape: 'pill', word: 'NO DRAMA', c1: 'c', c2: 'd' } },
  { left: '70%', top: '44%', rot: '-10deg', art: { kind: 'sticker', seed: 45, shape: 'blob', word: '404', c1: 'e', c2: 'b' } },
];

export const metadata = { alternates: { canonical: '/' } };

export default async function HomePage() {
  const [rows, counts, vibes, types, settings] = await Promise.all([getHomeRows(), getCounts(), getVibes(), getTypes(), getSettings()]);
  const typeName = new Map(types.map((t) => [t.id, t.name]));
  const featured = vibes.filter((v) => v.featured);
  const tiers = settings.packs.tiers;
  const hero = settings.home;

  return (
    <>
      <JsonLd data={storeLd(siteUrl(), settings)} />
      <section className="relative overflow-hidden border-b border-line">
        <div className="wrap grid items-center gap-8 py-10 md:grid-cols-[1.05fr_1fr] md:py-16">
          <div>
            {hero.eyebrow && <p className="eyebrow">{hero.eyebrow}</p>}
            <h1 className="display mt-3 text-[clamp(50px,8vw,108px)]">{hero.title}</h1>
            {hero.body && <p className="mt-4 max-w-[46ch] text-[17px] text-muted">{hero.body}</p>}
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href={hero.primary.href} className="btn btn-primary">
                {hero.primary.label}
              </Link>
              {hero.secondary.label && hero.secondary.href && (
                <Link href={hero.secondary.href} className="btn btn-ghost">
                  {hero.secondary.label}
                </Link>
              )}
            </div>
            <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[13.5px] font-bold text-muted">
              <li className="inline-flex items-center gap-1.5">
                <DropIcon size={17} className="text-lime" /> Waterproof vinyl
              </li>
              <li className="inline-flex items-center gap-1.5">
                <LayersIcon size={17} className="text-lime" /> 300 GSM posters
              </li>
              <li className="inline-flex items-center gap-1.5">
                <CardIcon size={17} className="text-lime" /> {payBadge()}
              </li>
              <li className="inline-flex items-center gap-1.5">
                <TruckIcon size={17} className="text-lime" /> Ships across India
              </li>
            </ul>
          </div>
          {hero.image ? (
            <div className="relative mx-auto aspect-[1/0.92] w-full max-w-[560px]">
              <div className="racing-stripes absolute inset-[8%_-8%_12%_26%] opacity-60" aria-hidden="true" />
              {/* eslint-disable-next-line @next/next/no-img-element -- the banner photo comes from the store's own uploads */}
              <img src={hero.image} alt="" className="relative h-full w-full object-contain drop-shadow-[0_0_34px_rgba(198,255,61,0.24)]" fetchPriority="high" />
            </div>
          ) : (
            <div className="relative mx-auto aspect-[1/0.92] w-full max-w-[560px]" aria-hidden="true">
              <div className="racing-stripes absolute inset-[8%_-8%_12%_26%] opacity-60" />
              <div className="absolute left-[22%] top-0 w-[56%] drop-shadow-[0_0_34px_rgba(198,255,61,0.24)]">
                <Art spec={HERO_ART.poster} idPrefix="hero" />
              </div>
              <div className="absolute left-0 top-[56%] w-[32%] -rotate-12">
                <Art spec={HERO_ART.stickerA} idPrefix="hero" />
              </div>
              <div className="absolute left-[68%] top-[62%] w-[32%] rotate-[10deg]">
                <Art spec={HERO_ART.stickerB} idPrefix="hero" />
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="wrap pt-12" aria-labelledby="types-title">
        <SectionHead id="types-title" title="Shop by product" href="/shop" link={`All ${types.length} types`} />
        <div className="grid grid-cols-4 gap-x-2 gap-y-5 sm:gap-4">
          {HOME_TILES.map((t) => (
            <Link
              key={t.typeId}
              href={`/c/${t.typeId}`}
              className="group grid content-start gap-2 text-center sm:rounded-card sm:border sm:border-line sm:bg-surface sm:p-3 sm:text-left sm:hover:border-lime sm:hover:shadow-glow"
            >
              <span className="relative block aspect-square overflow-hidden rounded-full border border-line bg-surface sm:aspect-[1.25] sm:rounded-[3px] sm:border-0 sm:bg-bg">
                <span className="absolute inset-[14%] transition group-hover:scale-105">
                  <Art spec={t.art} idPrefix="tile" />
                </span>
              </span>
              <span className="text-[11px] font-bold uppercase leading-tight tracking-[0.05em] sm:text-sm">{typeName.get(t.typeId)}</span>
              <span className="hidden text-xs text-muted sm:block">{counts.types[t.typeId] ? `${counts.types[t.typeId].toLocaleString('en-IN')} designs` : 'Coming soon'}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="wrap pt-14" aria-labelledby="fandom-title">
        <SectionHead id="fandom-title" title="Pick your fandom" href="/vibes" link={`All ${vibes.length} vibes`} />
        <div className="scrollbar-none -mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
          {featured.map((v) => (
            <Link key={v.id} href={`/v/${v.id}`} className="chip">
              {v.name}
            </Link>
          ))}
        </div>
      </section>

      {rows.trending.length > 0 && (
        <section className="wrap pt-14" aria-labelledby="trending-title">
          <SectionHead id="trending-title" title="Trending now" href="/shop" />
          <ProductGrid products={rows.trending} />
        </section>
      )}

      {settings.packs.enabled && tiers.length > 0 && (
        <section className="mt-16 border-y border-line bg-[linear-gradient(115deg,#121220_0_60%,transparent_60%),repeating-linear-gradient(115deg,#121220_0_18px,#1c1c30_18px_36px)]">
          <div className="wrap grid items-center gap-8 py-12 md:grid-cols-[1.1fr_1fr]">
            <div>
              <p className="eyebrow">Sticker packs</p>
              <h2 className="display mt-2 text-[clamp(34px,4.6vw,56px)]">Build a pack and save</h2>
              <p className="mt-3 max-w-md text-muted">Mix any laptop or mini stickers. The pack price is applied in your cart automatically.</p>
              <div className="mt-5 flex flex-wrap gap-2.5">
                {tiers.map((t) => (
                  <div key={t.qty} className="grid min-w-24 rounded-[4px] border border-lime bg-bg px-4 py-2.5">
                    <b className="font-display text-3xl leading-none">{t.qty}</b>
                    <span className="text-xs font-bold text-muted">stickers</span>
                    <em className="mt-1 not-italic font-bold text-lime tabular-nums">{formatINR(t.price)}</em>
                  </div>
                ))}
              </div>
              <Link href="/build-your-pack" className="btn btn-primary mt-6">
                Start your pack
              </Link>
            </div>
            <div className="relative mx-auto aspect-[16/10] w-full max-w-[520px]" aria-hidden="true">
              {FAN.map((f, i) => (
                <div key={i} className="absolute w-[30%]" style={{ left: f.left, top: f.top, transform: `rotate(${f.rot})` }}>
                  <Art spec={f.art} idPrefix="fan" />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {rows.fresh.length > 0 && (
        <section className="wrap pt-14" aria-labelledby="new-title">
          <SectionHead id="new-title" title="New drops" href="/shop?sort=new" />
          <ProductGrid products={rows.fresh} />
        </section>
      )}

      <section className="wrap pt-14" aria-labelledby="custom-title">
        <SectionHead id="custom-title" title="Make it yours" />
        <div className="grid gap-4 md:grid-cols-3">
          {CUSTOM_CARDS.map((c) => (
            <Link key={c.href} href={c.href} className="group grid grid-cols-[110px_1fr] overflow-hidden rounded-card border border-line bg-surface transition hover:border-lime hover:shadow-glow md:grid-cols-1">
              <span className="relative block min-h-[120px] border-r border-line bg-bg md:aspect-[16/10] md:border-b md:border-r-0">
                <span className="absolute inset-3 md:inset-5">
                  <Art spec={c.art} idPrefix="cus" />
                </span>
              </span>
              <span className="grid content-start gap-1.5 p-4">
                <span className="font-display text-[22px] uppercase leading-none">{c.title}</span>
                <span className="text-sm text-muted">{c.body}</span>
                <span className="mt-1 inline-flex items-center gap-1.5 text-[13px] font-bold uppercase tracking-[0.06em] text-lime">
                  <UploadIcon size={16} /> {c.cta}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}

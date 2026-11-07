import Link from 'next/link';
import { Art } from '@/components/art';
import { CartButton } from '@/components/cart/cart-drawer';
import { ChevronIcon, HeartIcon, UserIcon } from '@/components/icons';
import { getCounts, getSettings, getTypes, getVibes } from '@/lib/catalog/queries';
import { GROUPS, type ProductType, type Vibe } from '@/lib/catalog/types';
import { formatINR } from '@/lib/money';
import { Logo } from './logo';
import { MobileMenu, type MenuGroup } from './mobile-menu';
import { SearchBox } from './search-box';

const iconBtn = 'relative grid size-10 place-items-center rounded-[2px] text-ink hover:bg-surface-2';

function MegaLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="block py-1 text-[15px] font-semibold text-ink hover:text-lime">
        {children}
      </Link>
    </li>
  );
}

function NavItem({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="nav-item">
      <button type="button" className="inline-flex items-center gap-1 whitespace-nowrap rounded-[2px] px-2.5 py-2 text-[13.5px] font-semibold uppercase tracking-[0.07em] hover:bg-surface-2" aria-haspopup="true">
        {label}
        <ChevronIcon size={15} className="chev transition" />
      </button>
      <div
        className={`mega absolute left-7 right-7 top-[calc(100%-2px)] z-50 gap-7 rounded-card border border-line-2 bg-surface p-6 shadow-[0_30px_60px_rgba(0,0,0,0.55)] ${wide ? 'grid-cols-4' : 'grid-cols-[1fr_1fr_1.15fr]'}`}
      >
        {children}
      </div>
    </div>
  );
}

function Column({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-[11.5px] font-bold uppercase tracking-[0.1em] text-muted">{title}</p>
      <ul className="grid gap-0.5">{children}</ul>
    </div>
  );
}

export function menuGroups(types: ProductType[], vibes: Vibe[]): MenuGroup[] {
  const groups: MenuGroup[] = GROUPS.map((g) => ({
    id: g.id,
    name: g.name,
    links: [{ href: `/shop?group=${g.id}`, label: `All ${g.name.toLowerCase()}` }, ...types.filter((t) => t.groupId === g.id).map((t) => ({ href: `/c/${t.id}`, label: t.name }))],
  }));
  groups.push({
    id: 'fandoms',
    name: 'Fandoms & vibes',
    links: [{ href: '/vibes', label: 'All vibes' }, ...vibes.map((v) => ({ href: `/v/${v.id}`, label: v.name }))],
  });
  return groups;
}

export async function SiteHeader() {
  const [types, vibes, counts, settings] = await Promise.all([getTypes(), getVibes(), getCounts(), getSettings()]);
  const ofGroup = (g: string) => types.filter((t) => t.groupId === g);
  const featured = vibes.filter((v) => v.featured);
  const tier = settings.packs.tiers[0];

  return (
    <>
      {settings.announcement.length > 0 && (
        <div className="bg-lime text-bg">
          <div className="wrap flex justify-center gap-4 overflow-hidden whitespace-nowrap py-2 text-[12px] font-bold uppercase tracking-[0.1em]">
            {settings.announcement.map((m, i) => (
              <span key={m} className={i > 0 ? 'hidden md:inline' : undefined}>
                {i > 0 && <span className="mr-4 opacity-50">•</span>}
                {m}
              </span>
            ))}
          </div>
        </div>
      )}
      <header className="sticky top-0 z-40 border-b border-line bg-bg/90 backdrop-blur-md">
        <div className="wrap relative grid grid-cols-[auto_1fr_auto] items-center gap-x-1.5 gap-y-2.5 py-2.5 md:grid-cols-[auto_auto_1fr_auto] md:gap-x-4 xl:grid-cols-[auto_1fr_minmax(220px,300px)_auto] xl:py-3">
          <MobileMenu groups={menuGroups(types, vibes)} className={`${iconBtn} xl:hidden`} />
          <Logo className="justify-self-start" />
          <nav className="hidden items-center gap-0.5 xl:flex" aria-label="Shop">
            <NavItem label="Stickers">
              <Column title="By type">
                {ofGroup('stickers').map((t) => (
                  <MegaLink key={t.id} href={`/c/${t.id}`}>
                    {t.name} <span className="text-xs font-normal text-muted">{counts.types[t.id] ?? 0}</span>
                  </MegaLink>
                ))}
              </Column>
              <Column title="Popular vibes">
                {featured.slice(0, 10).map((v) => (
                  <MegaLink key={v.id} href={`/v/${v.id}?group=stickers`}>
                    {v.name}
                  </MegaLink>
                ))}
              </Column>
              <Link href="/c/laptop-stickers" className="grid content-start gap-2 rounded-card border border-line bg-bg p-5 hover:border-lime">
                <span className="mx-auto h-32 w-32">
                  <Art spec={{ kind: 'sticker', seed: 61, shape: 'badge', word: String(tier?.qty ?? 10), c1: 'f', c2: 'c' }} idPrefix="mega" />
                </span>
                <span className="font-display text-xl uppercase">Build your own pack</span>
                <span className="text-sm text-muted">
                  Any {tier?.qty ?? 10} stickers for {formatINR(tier?.price ?? 19900)}. Mix any designs.
                </span>
              </Link>
            </NavItem>
            <NavItem label="Posters">
              <Column title="By type">
                {ofGroup('posters').map((t) => (
                  <MegaLink key={t.id} href={`/c/${t.id}`}>
                    {t.name}
                  </MegaLink>
                ))}
              </Column>
              <Column title="Poster fandoms">
                {['f1-motorsport', 'movies', 'anime', 'space', 'cars-bikes', 'music', 'quotes', 'aesthetic']
                  .map((id) => vibes.find((v) => v.id === id))
                  .filter((v): v is Vibe => Boolean(v))
                  .map((v) => (
                    <MegaLink key={v.id} href={`/v/${v.id}?group=posters`}>
                      {v.name}
                    </MegaLink>
                  ))}
              </Column>
              <Link href="/v/f1-motorsport?type=wall-posters" className="grid content-start gap-2 rounded-card border border-line bg-bg p-5 hover:border-lime">
                <span className="mx-auto h-40 w-32">
                  <Art spec={{ kind: 'poster', seed: 62, poster: 'speed', title: 'PIT LANE', dark: 0 }} idPrefix="mega" />
                </span>
                <span className="font-display text-xl uppercase">Pit lane series</span>
                <span className="text-sm text-muted">Racing posters from {formatINR(9900)}. Buy 3, get 1 free.</span>
              </Link>
            </NavItem>
            <NavItem label="Polaroids & more">
              <Column title="Polaroids">
                {ofGroup('polaroids').map((t) => (
                  <MegaLink key={t.id} href={`/c/${t.id}`}>
                    {t.name}
                  </MegaLink>
                ))}
                <MegaLink href="/custom/polaroids">Custom photo polaroids</MegaLink>
              </Column>
              <Column title="More">
                {ofGroup('more').map((t) => (
                  <MegaLink key={t.id} href={`/c/${t.id}`}>
                    {t.name}
                  </MegaLink>
                ))}
              </Column>
              <Link href="/c/polaroid-sets" className="grid content-start gap-2 rounded-card border border-line bg-bg p-5 hover:border-lime">
                <span className="mx-auto h-32 w-36">
                  <Art spec={{ kind: 'polaroids', seed: 63, caption: 'best night', dark: 1 }} idPrefix="mega" />
                </span>
                <span className="font-display text-xl uppercase">Polaroid sets</span>
                <span className="text-sm text-muted">Sets of 10 to 50 prints, or upload your own photos.</span>
              </Link>
            </NavItem>
            <NavItem label="Fandoms" wide>
              {[0, 1, 2, 3].map((col) => (
                <ul key={col} className="grid content-start gap-0.5">
                  {vibes.slice(col * Math.ceil(vibes.length / 4), (col + 1) * Math.ceil(vibes.length / 4)).map((v) => (
                    <MegaLink key={v.id} href={`/v/${v.id}`}>
                      {v.name}
                    </MegaLink>
                  ))}
                </ul>
              ))}
            </NavItem>
            <Link href="/custom/stickers" className="rounded-[2px] px-2.5 py-2 text-[13.5px] font-semibold uppercase tracking-[0.07em] text-lime hover:bg-surface-2">
              Custom
            </Link>
          </nav>
          <SearchBox className="col-span-3 row-start-2 md:col-span-1 md:row-start-auto" />
          <div className="flex items-center justify-self-end">
            <Link href="/wishlist" className={`${iconBtn} max-md:hidden`} aria-label="Wishlist">
              <HeartIcon />
            </Link>
            <Link href="/account" className={`${iconBtn} max-md:hidden`} aria-label="Your account">
              <UserIcon />
            </Link>
            <CartButton className={iconBtn} />
          </div>
        </div>
      </header>
    </>
  );
}

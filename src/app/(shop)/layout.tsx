import { CartDrawer } from '@/components/cart/cart-drawer';
import { Dock } from '@/components/layout/dock';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { getSettings } from '@/lib/catalog/queries';

/** The storefront: header, footer, cart drawer and the phone bottom bar. */
export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  return (
    <>
      <SiteHeader />
      <main id="main">{children}</main>
      <SiteFooter />
      <CartDrawer />
      <Dock whatsapp={settings.contact.whatsapp} />
    </>
  );
}

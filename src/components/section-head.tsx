import Link from 'next/link';
import { ArrowIcon } from '@/components/icons';

export function SectionHead({ title, href, link, id }: { title: string; href?: string; link?: string; id?: string }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <h2 id={id} className="section-title">
        {title}
      </h2>
      {href && (
        <Link href={href} className="inline-flex shrink-0 items-center gap-1.5 py-1 text-[13px] font-bold uppercase tracking-[0.08em] text-lime hover:text-lime-2">
          {link ?? 'View all'} <ArrowIcon size={16} />
        </Link>
      )}
    </div>
  );
}

import Link from 'next/link';
import { cn } from '@/lib/cn';

export function Logo({ className, onClick }: { className?: string; onClick?: () => void }) {
  return (
    <Link href="/" onClick={onClick} className={cn('font-display text-[22px] uppercase leading-none tracking-[0.02em] whitespace-nowrap md:text-[25px]', className)} aria-label="PrintYourVibe home">
      <span className="text-lime">{'//'}</span>PrintYourVibe
    </Link>
  );
}

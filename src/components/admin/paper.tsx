import { cn } from '@/lib/cn';

/** A white, printable sheet (packing slips and receipts). */
export function Paper({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('paper mx-auto max-w-[800px] rounded-[4px] bg-white p-8 text-[#111] shadow-[0_10px_40px_rgba(0,0,0,0.5)] print:max-w-none print:rounded-none print:p-0 print:shadow-none', className)}>
      {children}
    </div>
  );
}

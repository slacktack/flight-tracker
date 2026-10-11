import { ThemeToggle } from '@/components/ThemeToggle';
import { cn } from '@/lib/cn';

export function PageShell({ children, className, wide = false }: { children: React.ReactNode; className?: string; wide?: boolean }) {
  return (
    <main className="min-h-dvh bg-night pb-[calc(5rem+env(safe-area-inset-bottom))] pt-[max(0.5rem,env(safe-area-inset-top))] md:pb-16 md:pt-20">
      <div className="fixed right-3 top-[max(0.5rem,env(safe-area-inset-top))] z-30 md:right-4 md:top-4">
        <ThemeToggle className="glass rounded-full shadow-float" />
      </div>
      <div className={cn('mx-auto w-full px-4 md:px-6', wide ? 'max-w-5xl' : 'max-w-3xl', className)}>{children}</div>
    </main>
  );
}

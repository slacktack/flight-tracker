import type { Metadata } from 'next';
import { Suspense } from 'react';
import { FaresScreen } from '@/components/fares/FaresScreen';
import { PageShell } from '@/components/ui/PageShell';

export const metadata: Metadata = { title: 'Fares' };

export default function FaresPage() {
  return (
    <PageShell>
      <Suspense>
        <FaresScreen />
      </Suspense>
    </PageShell>
  );
}

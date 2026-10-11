import type { Metadata } from 'next';
import { AirportsIndex } from '@/components/airports/AirportsIndex';
import { PageShell } from '@/components/ui/PageShell';

export const metadata: Metadata = { title: 'Airports' };

export default function AirportsPage() {
  return (
    <PageShell>
      <AirportsIndex />
    </PageShell>
  );
}

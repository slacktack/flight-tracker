import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AirportBoard } from '@/components/airports/AirportBoard';
import { PageShell } from '@/components/ui/PageShell';

export function generateMetadata({ params }: { params: { code: string } }): Metadata {
  return { title: `${params.code.toUpperCase()} arrivals and departures` };
}

export default function AirportPage({ params }: { params: { code: string } }) {
  const code = params.code.toUpperCase();
  if (!/^[A-Z]{3}$/.test(code)) notFound();
  return (
    <PageShell>
      <AirportBoard code={code} />
    </PageShell>
  );
}

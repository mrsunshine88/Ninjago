"use client";

import nextDynamic from 'next/dynamic';

// Vi flyttar ner dessa och ser till att de är de enda ställena ordet nämns
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const DynamicGame = nextDynamic(() => import('@/components/game/NinjagoGame'), {
  ssr: false,
  loading: () => <main className="min-h-screen bg-black" />
});

export default function Page() {
  return <DynamicGame />;
}
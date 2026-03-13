"use client";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import nextDynamic from 'next/dynamic';

const DynamicGame = nextDynamic(() => import('@/components/game/NinjagoGame'), {
  ssr: false,
  loading: () => <main className="min-h-screen bg-black" />
});

export default function Page() {
  return <DynamicGame />;
}
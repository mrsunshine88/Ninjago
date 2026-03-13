
"use client";


import dynamic from 'next/dynamic';



const DynamicGame = dynamic(() => import('@/components/game/NinjagoGame'), {

  ssr: false,

  loading: () => <main className="min-h-screen bg-black" />

});



export default function Page() {

  return <DynamicGame />;

}
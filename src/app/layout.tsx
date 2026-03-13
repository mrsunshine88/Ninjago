import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Ninjago: Elemental Clash',
  description: 'Embark on a heroic journey with the elemental masters of Ninjago.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sv" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0, viewport-fit=cover, interactive-widget=resizes-content" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300..700&display=swap" rel="stylesheet" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Ninjago" />
        <link rel="apple-touch-icon" href="/icon.png" />
        <link rel="icon" type="image/png" href="/icon.png" />
        <meta name="theme-color" content="#EF4444" />
        <meta name="mobile-web-app-capable" content="yes" />
        <script dangerouslySetInnerHTML={{
          __html: `
          window.deferredPrompt = null;
          window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            window.deferredPrompt = e;
            console.log('[v2.28] beforeinstallprompt captured');
            window.dispatchEvent(new Event('pwa-prompt-available'));
          });

          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js');
            });
          }
        `}} />
      </head>
      <body
        className="font-body antialiased bg-background text-foreground overflow-x-hidden"
        suppressHydrationWarning
      >
        {/* Vi tog bort <main> härifrån eftersom NinjagoGame.tsx har sin egen main/div */}
        {children}
      </body>
    </html>
  );
}
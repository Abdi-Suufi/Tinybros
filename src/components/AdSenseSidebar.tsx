'use client';

import { useEffect } from 'react';

type AdPlacement = 'left' | 'right';

declare global {
  interface Window {
    adsbygoogle?: Record<string, unknown>[];
  }
}

const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || 'ca-pub-1648425218847882';

const slotIds: Record<AdPlacement, string | undefined> = {
  left: process.env.NEXT_PUBLIC_ADSENSE_LEFT_SLOT_ID,
  right: process.env.NEXT_PUBLIC_ADSENSE_RIGHT_SLOT_ID,
};

export default function AdSenseSidebar({ placement }: { placement: AdPlacement }) {
  const slotId = slotIds[placement];
  const isConfigured = Boolean(clientId && slotId);

  useEffect(() => {
    if (!clientId || !slotId) {
      return;
    }

    if (!document.getElementById('google-adsense-script')) {
      const script = document.createElement('script');
      script.id = 'google-adsense-script';
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(clientId)}`;
      document.head.appendChild(script);
    }

    window.adsbygoogle = window.adsbygoogle || [];
    window.adsbygoogle.push({});
  }, [slotId]);

  return (
    <aside
      aria-label={`${placement === 'left' ? 'Left' : 'Right'} advertisement`}
      className="hidden w-[160px] flex-col items-center 2xl:flex"
    >
      {isConfigured ? (
        <>
          <span className="mb-2 text-xs text-gray-500">Advertisement</span>
          <ins
            className="adsbygoogle"
            style={{ display: 'block', width: '160px', minHeight: '600px' }}
            data-ad-client={clientId}
            data-ad-slot={slotId}
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
        </>
      ) : (
        <div className="flex min-h-[600px] w-[160px] items-center justify-center rounded-lg border border-dashed border-gray-700 text-center text-xs text-gray-500">
          Ad space
        </div>
      )}
    </aside>
  );
}

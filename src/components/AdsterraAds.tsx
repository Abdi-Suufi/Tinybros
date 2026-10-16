'use client';

export function AdsterraSidebar({ placement }: { placement: 'left' | 'right' }) {
  const ad = placement === 'left'
    ? {
        height: 600,
        key: 'd7bc5ddf24f28654e3856e132a4b4b86',
      }
    : {
        height: 300,
        key: 'e5788c8864b93bb8ecbfcd80d3291d4c',
      };

  return (
    <aside
      aria-label={`${placement === 'left' ? 'Left' : 'Right'} advertisement`}
      className={`mx-auto flex w-[160px] flex-col items-center lg:mx-0 ${
        placement === 'left' ? 'lg:col-start-1' : 'lg:col-start-3'
      } lg:row-start-1`}
    >
      <span className="mb-2 text-xs text-gray-500">Advertisement</span>
      <iframe
        title={`Adsterra 160 by ${ad.height} ${placement} banner`}
        className={`${placement === 'left' ? 'h-[600px]' : 'h-[300px]'} w-[160px] border-0`}
        referrerPolicy="strict-origin-when-cross-origin"
        srcDoc={`<!doctype html>
          <html>
            <head><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
            <body style="margin:0;width:160px;height:${ad.height}px;overflow:hidden">
              <script>
                window.atOptions = {
                  key: '${ad.key}',
                  format: 'iframe',
                  height: ${ad.height},
                  width: 160,
                  params: {}
                };
              </script>
              <script src="https://bancadeltempoidea.org/22/${ad.key}"></script>
            </body>
          </html>`}
        />
    </aside>
  );
}

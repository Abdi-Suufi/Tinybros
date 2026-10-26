import type { Metadata } from 'next';
import Image from 'next/image';
import { patchNotes } from '@/lib/patchNotes';

export const metadata: Metadata = {
  title: 'Patch Notes | Tinywatch',
  description: 'See the latest Tinywatch updates, new features, and upcoming improvements.',
};

export default function PatchNotesPage() {
  return (
    <main className="min-h-screen px-4 pb-16 pt-28 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-yellow-400">
          Tinywatch updates
        </p>
        <h1 className="text-4xl font-bold sm:text-5xl">Patch Notes</h1>
        <p className="mt-4 max-w-2xl text-gray-300">
          A running list of new features, improvements, and what is coming next.
        </p>

        <div className="mt-10 space-y-6">
          {patchNotes.map((note) => (
            <article
              key={`${note.date}-${note.title}`}
              className={`rounded-2xl border border-yellow-500/20 bg-black p-6 sm:p-8 ${
                note.image ? 'grid gap-x-6 gap-y-4 md:grid-cols-[minmax(0,1fr)_250px]' : ''
              }`}
            >
              <div className={note.image ? 'md:col-span-2' : ''}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <time className="text-sm text-gray-400">{note.date}</time>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                      note.status === 'upcoming'
                        ? 'bg-yellow-400/10 text-yellow-300'
                        : 'bg-green-400/10 text-green-300'
                    }`}
                  >
                    {note.status === 'upcoming' ? 'Coming soon' : 'Released'}
                  </span>
                </div>
              </div>
              <div>
                <h2 className="mt-4 text-2xl font-bold">{note.title}</h2>
                <p className="mt-3 text-gray-300">{note.summary}</p>
                <ul className="mt-5 list-disc space-y-2 pl-5 text-gray-300 marker:text-yellow-400">
                  {note.changes.map((change) => (
                    <li key={change}>{change}</li>
                  ))}
                </ul>
              </div>
              {note.image && (
                <div className="relative aspect-[4/3] w-full max-w-[250px] justify-self-center overflow-hidden rounded-xl bg-black/40 md:justify-self-end">
                  <Image
                    src={note.image.src}
                    alt={note.image.alt}
                    fill
                    sizes="250px"
                    className="object-cover"
                  />
                </div>
              )}
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}

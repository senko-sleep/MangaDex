import { MangaCard } from './MangaCard';

export function MangaGrid({ mangas, columns = 'sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' }) {
  return (
    <div className={`grid grid-cols-1 gap-4 ${columns}`}>
      {mangas.map((manga) => (
        <MangaCard key={manga.id} manga={manga} />
      ))}
    </div>
  );
}

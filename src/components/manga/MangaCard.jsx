import { Link } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getCoverUrl, getAnilistCoverUrl, PLACEHOLDER_COVER } from '../../lib/imageUtils';

export default function MangaCard({ manga }) {
  const [imgError, setImgError] = useState(false);
  const [coverUrl, setCoverUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    if (!manga) return;
    
    setImgError(false);
    setIsLoading(true);
    
    // First try sync cover URL
    const syncCover = getCoverUrl(manga);
    if (syncCover) {
      setCoverUrl(syncCover);
      setIsLoading(false);
      return;
    }
    
    // Fall back to Anilist API
    getAnilistCoverUrl(manga).then(url => {
      setCoverUrl(url);
      setIsLoading(false);
    }).catch(() => {
      setCoverUrl(PLACEHOLDER_COVER);
      setIsLoading(false);
    });
  }, [manga?.id, manga?.title]);
  
  if (!manga) return null;
  
  const showImg = coverUrl && !imgError;
  
  return (
    <Link to={`/manga/${manga.id}`} className="group block">
      <div className="bg-zinc-900 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
        {/* Cover */}
        <div className="aspect-[3/4] bg-zinc-800 relative overflow-hidden">
          {isLoading ? (
            <div className="w-full h-full flex items-center justify-center animate-pulse">
              <BookOpen className="w-8 h-8 text-zinc-600" />
            </div>
          ) : showImg ? (
            <img
              src={coverUrl}
              alt=""
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
              onError={() => {
                setImgError(true);
                setCoverUrl(PLACEHOLDER_COVER);
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <BookOpen className="w-8 h-8 text-zinc-600" />
            </div>
          )}
          
          {/* Status badge */}
          {manga.status && manga.status !== 'unknown' && (
            <span className={`absolute top-2 left-2 px-2 py-0.5 text-[10px] font-medium text-white rounded ${
              manga.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'
            }`}>
              {manga.status}
            </span>
          )}
        </div>
        
        {/* Info */}
        <div className="p-2.5">
          <h3 className="text-sm font-medium text-zinc-100 line-clamp-2 leading-snug group-hover:text-orange-400 transition-colors">
            {manga.title || 'Unknown'}
          </h3>
          {manga.chapterCount > 0 && (
            <p className="text-xs text-zinc-500 mt-1">Ch. {manga.chapterCount}</p>
          )}
        </div>
      </div>
    </Link>
  );
}


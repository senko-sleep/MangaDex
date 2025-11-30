'use client';

import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import { useState } from 'react';

export default function MangaCard({ manga }) {
  const [imgError, setImgError] = useState(false);
  
  if (!manga) return null;
  
  const cover = manga.coverUrl || manga.thumbnail || manga.cover;
  const showImg = cover && !imgError;
  
  return (
    <Link href={`/manga/${manga.id}`} className="group block">
      <div className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
        {/* Cover */}
        <div className="aspect-[3/4] bg-gray-100 relative overflow-hidden">
          {showImg ? (
            <img
              src={cover}
              alt=""
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <BookOpen className="w-8 h-8 text-gray-300" />
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
          <h3 className="text-sm font-medium text-gray-900 line-clamp-2 leading-snug group-hover:text-indigo-600 transition-colors">
            {manga.title || 'Unknown'}
          </h3>
          {manga.chapterCount > 0 && (
            <p className="text-xs text-gray-500 mt-1">Ch. {manga.chapterCount}</p>
          )}
        </div>
      </div>
    </Link>
  );
}

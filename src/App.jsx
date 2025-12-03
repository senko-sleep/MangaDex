import { Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import HomePage from './pages/HomePage';
import MangaDetailPage from './pages/MangaDetailPage';
import ChapterReaderPage from './pages/ChapterReaderPage';

export default function App() {
  const location = useLocation();

  useEffect(() => {
    // Disable automatic scroll restoration by the browser
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/manga/:id" element={<MangaDetailPage />} />
      <Route path="/manga/:id/:chapterId" element={<ChapterReaderPage />} />
    </Routes>
  );
}

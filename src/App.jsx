import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import MangaDetailPage from './pages/MangaDetailPage';
import ChapterReaderPage from './pages/ChapterReaderPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/manga/:id" element={<MangaDetailPage />} />
      <Route path="/manga/:id/:chapterId" element={<ChapterReaderPage />} />
    </Routes>
  );
}

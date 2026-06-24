import { Routes, Route } from 'react-router-dom'
import { LangProvider } from './contexts/LangContext'
import LandingPage from './pages/LandingPage'
import UploadPage from './pages/UploadPage'
import ResultsPage from './pages/ResultsPage'
import ArchivePage from './pages/ArchivePage'
import ArchiveEntryPage from './pages/ArchiveEntryPage'
import IdentitiesPage from './pages/IdentitiesPage'
import CreatorPage from './pages/CreatorPage'
import CreatorCullPage from './pages/CreatorCullPage'
import CreatorCullResultsPage from './pages/CreatorCullResultsPage'
import { initializeGallery, resetAndSeedGallery } from './data/gallerySeeder'

// Seed the Community Gallery with founder entries on first visit.
initializeGallery()

// Dev helper — call window.__resetGallery() in the browser console to re-seed.
if (typeof window !== 'undefined') {
  window.__resetGallery = resetAndSeedGallery
}

export default function App() {
  return (
    <LangProvider>
      <Routes>
        <Route path="/"            element={<LandingPage />} />
        <Route path="/archive"          element={<ArchivePage />} />
        <Route path="/archive/:id"      element={<ArchiveEntryPage />} />
        <Route path="/identities"       element={<IdentitiesPage />} />
        <Route path="/identities/:slug" element={<IdentitiesPage />} />
        <Route path="/creator"          element={<CreatorPage />} />
        <Route path="/creator/cull"     element={<CreatorCullPage />} />
        <Route path="/creator/results"  element={<CreatorCullResultsPage />} />
        <Route path="/upload"      element={<UploadPage />} />
        <Route path="/results"     element={<ResultsPage />} />
      </Routes>
    </LangProvider>
  )
}

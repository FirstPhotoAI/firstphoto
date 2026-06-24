import { Routes, Route, Navigate } from 'react-router-dom'
import { LangProvider } from './contexts/LangContext'
import LandingPage from './pages/LandingPage'
import UploadPage from './pages/UploadPage'
import ResultsPage from './pages/ResultsPage'
import CreatorPage from './pages/CreatorPage'
import CreatorCullPage from './pages/CreatorCullPage'
import CreatorCullResultsPage from './pages/CreatorCullResultsPage'

export default function App() {
  return (
    <LangProvider>
      <Routes>
        <Route path="/"            element={<LandingPage />} />
        <Route path="/archive"        element={<Navigate to="/" replace />} />
        <Route path="/archive/:id"    element={<Navigate to="/" replace />} />
        <Route path="/identities"       element={<Navigate to="/" replace />} />
        <Route path="/identities/:slug" element={<Navigate to="/" replace />} />
        <Route path="/creator"          element={<CreatorPage />} />
        <Route path="/creator/cull"     element={<CreatorCullPage />} />
        <Route path="/creator/results"  element={<CreatorCullResultsPage />} />
        <Route path="/upload"      element={<UploadPage />} />
        <Route path="/results"     element={<ResultsPage />} />
      </Routes>
    </LangProvider>
  )
}

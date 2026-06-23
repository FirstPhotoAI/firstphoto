import { Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import UploadPage from './pages/UploadPage'
import ResultsPage from './pages/ResultsPage'
import ArchivePage from './pages/ArchivePage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/archive" element={<ArchivePage />} />
      <Route path="/upload" element={<UploadPage />} />
      <Route path="/results" element={<ResultsPage />} />
    </Routes>
  )
}

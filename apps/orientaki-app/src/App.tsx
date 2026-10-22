import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import SplashScreen from './pages/SplashScreen';
import OnboardingScreen from './pages/OnboardingScreen';
import ParticipantNameScreen from './pages/ParticipantNameScreen';
import VocationalMatchScreen from './pages/VocationalMatchScreen';
import PreResultsScreen from './pages/PreResultsScreen';
import ReportUnlockScreen from './pages/ReportUnlockScreen';
import ResultsScreen from './pages/ResultsScreen';
import SessionHistoryScreen from './pages/SessionHistoryScreen';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SplashScreen />} />
        <Route path="/onboarding" element={<OnboardingScreen />} />
        <Route path="/participant" element={<ParticipantNameScreen />} />
        <Route path="/test" element={<VocationalMatchScreen />} />
        <Route path="/pre-results" element={<PreResultsScreen />} />
        <Route path="/unlock" element={<ReportUnlockScreen />} />
        <Route path="/results" element={<ResultsScreen />} />
        <Route path="/history" element={<SessionHistoryScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

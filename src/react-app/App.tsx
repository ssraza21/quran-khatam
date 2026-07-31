import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/layout/Layout";
import LandingPage from "./pages/LandingPage";
import KhatamPage from "./pages/KhatamPage";
import AdminPage from "./pages/AdminPage";
import MetricsPage from "./pages/MetricsPage";
import GlobePage from "./pages/GlobePage";
import CampaignDirectoryPage from "@/pages/CampaignDirectoryPage";
import CampaignOverviewPage from "@/pages/CampaignOverviewPage";
import { CompletionToastProvider } from "./components/ui/CompletionToast";

export default function App() {
  return (
    <CompletionToastProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/campaigns" element={<CampaignDirectoryPage />} />
          <Route path="/k/:slug" element={<CampaignOverviewPage />} />
          <Route path="/k/:slug/tracker" element={<KhatamPage />} />
          <Route path="/k/:slug/metrics" element={<MetricsPage />} />
          <Route path="/k/:slug/admin" element={<AdminPage />} />
          <Route path="/globe" element={<GlobePage />} />
        </Route>
        {/* Redirect old routes */}
        <Route path="/khatam/*" element={<Navigate to="/" replace />} />
        <Route path="/metrics" element={<Navigate to="/" replace />} />
      </Routes>
    </CompletionToastProvider>
  );
}

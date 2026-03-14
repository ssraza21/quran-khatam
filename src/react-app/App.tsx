import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/layout/Layout";
import LandingPage from "./pages/LandingPage";
import KhatamPage from "./pages/KhatamPage";
import MetricsPage from "./pages/MetricsPage";
import { CompletionToastProvider } from "./components/ui/CompletionToast";

export default function App() {
  return (
    <CompletionToastProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/khatam" element={<Navigate to="/khatam/brothers" replace />} />
          <Route path="/khatam/:group" element={<KhatamPage />} />
        </Route>
        <Route path="/metrics" element={<MetricsPage />} />
      </Routes>
    </CompletionToastProvider>
  );
}

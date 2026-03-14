import { Routes, Route } from "react-router-dom";
import Layout from "./components/layout/Layout";
import LandingPage from "./pages/LandingPage";
import KhatamPage from "./pages/KhatamPage";
import MetricsPage from "./pages/MetricsPage";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/khatam" element={<KhatamPage />} />
      </Route>
      <Route path="/metrics" element={<MetricsPage />} />
    </Routes>
  );
}

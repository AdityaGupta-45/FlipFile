import { useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { Footer, Header } from "./components/Layout.jsx";
import Contact from "./pages/Contact.jsx";
import Home from "./pages/Home.jsx";
import Info from "./pages/Info.jsx";
import ToolPage from "./pages/ToolPage.jsx";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <ScrollToTop />
      <Header />
      <main className="mx-auto w-full max-w-7xl flex-1 px-5 pb-10">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/tools" element={<Home />} />
          <Route path="/privacy" element={<Info page="privacy" />} />
          <Route path="/terms" element={<Info page="terms" />} />
          <Route path="/docs" element={<Info page="docs" />} />
          <Route path="/changelog" element={<Info page="changelog" />} />
          <Route path="/about" element={<Info page="about" />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/:id" element={<ToolPage />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
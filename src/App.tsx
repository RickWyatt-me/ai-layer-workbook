import { HashRouter, Routes, Route } from 'react-router-dom';

function Placeholder() {
  return (
    <main style={{ padding: '2rem', maxWidth: '720px', margin: '0 auto' }}>
      <p style={{ fontFamily: 'var(--body)', color: 'var(--ink-soft)' }}>
        Scaffold ready. Shell and content coming in step 2.
      </p>
    </main>
  );
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Placeholder />} />
        <Route path="*" element={<Placeholder />} />
      </Routes>
    </HashRouter>
  );
}

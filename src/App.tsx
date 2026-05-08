import './index.css'
import Background from './components/Background'
import ApiKeyGate from './components/ApiKeyGate'
import IndexPage from './pages/index'

export default function App() {
  return (
    <ApiKeyGate>
      <div className="relative min-h-screen bg-black">
        <Background />
        {/* Sits between the WebGL canvas (z-0) and the UI (z-10).
            backdrop-blur softens the tubes everywhere; the radial gradient
            darkens the central content area so text stays readable while
            the tubes remain visible and interactive at the screen edges. */}
        <div
          className="fixed inset-0 z-[5] pointer-events-none backdrop-blur-[3px]"
          style={{
            background:
              "radial-gradient(ellipse 80% 65% at 50% 30%, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.12) 100%)",
          }}
        />
        <div className="relative z-10">
          <IndexPage />
        </div>
      </div>
    </ApiKeyGate>
  );
}

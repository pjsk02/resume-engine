import './index.css'
import Background from './components/Background'
import ApiKeyGate from './components/ApiKeyGate'
import IndexPage from './pages/index'

export default function App() {
  return (
    <ApiKeyGate>
      <div className="relative min-h-screen bg-gray-50 dark:bg-gray-900">
        <Background />
        <div className="relative z-10">
          <IndexPage />
        </div>
      </div>
    </ApiKeyGate>
  );
}

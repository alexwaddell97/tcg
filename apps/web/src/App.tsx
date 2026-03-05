import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import MainMenu from './pages/MainMenu.tsx'
import Lobby from './pages/Lobby.tsx'
import GameRoom from './pages/GameRoom.tsx'
import DeckBuilder from './pages/DeckBuilder.tsx'
import PackOpening from './pages/PackOpening.tsx'
import Collection from './pages/Collection.tsx'
import Quests from './pages/Quests.tsx'
import { useGameSync } from './hooks/useGameSync.ts'

function AppRoutes() {
  useGameSync()

  return (
    <Routes>
      <Route path="/" element={<MainMenu />} />
      <Route path="/lobby" element={<Lobby />} />
      <Route path="/game" element={<GameRoom />} />
      <Route path="/deck-builder" element={<DeckBuilder />} />
      <Route path="/pack-opening" element={<PackOpening />} />
      <Route path="/collection" element={<Collection />} />
      <Route path="/quests" element={<Quests />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}

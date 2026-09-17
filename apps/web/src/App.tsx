import { Routes, Route, Navigate } from 'react-router-dom'
import MainMenu from './pages/MainMenu.tsx'
import Lobby from './pages/Lobby.tsx'
import GameRoom from './pages/GameRoom.tsx'
import DeckBuilder from './pages/DeckBuilder.tsx'
import PackOpening from './pages/PackOpening.tsx'
import Collection from './pages/Collection.tsx'
import Quests from './pages/Quests.tsx'
import { useGameSync } from './hooks/useGameSync.ts'
import RunEntryPage from './pages/RunEntryPage.tsx'
import RunMapPage from './pages/RunMapPage.tsx'
import CombatPage from './pages/CombatPage.tsx'
import CardRewardPage from './pages/CardRewardPage.tsx'
import CampfirePage from './pages/CampfirePage.tsx'
import ShopPage from './pages/ShopPage.tsx'
import EventPage from './pages/EventPage.tsx'
import RunOverPage from './pages/RunOverPage.tsx'
import HexBoardPreview from './pages/HexBoardPreview.tsx'
import ArenaPractice from './pages/ArenaPractice.tsx'
import ArtDirection from './pages/ArtDirection.tsx'
import ArenaLayoutPreview from './pages/ArenaLayoutPreview.tsx'
import PackOpeningPreview from './pages/PackOpeningPreview.tsx'
import SoundEffects from './components/audio/SoundEffects.tsx'
import SoundLibrary from './pages/SoundLibrary.tsx'
import './styles/art-direction.css'
import './styles/cursors.css'

function AppRoutes() {
  useGameSync()

  return (
    <Routes>
      <Route path="/" element={<MainMenu />} />
      <Route path="/lobby" element={<Lobby />} />
      <Route path="/game" element={<GameRoom />} />
      <Route path="/practice" element={<ArenaPractice />} />
      {import.meta.env.DEV && <Route path="/art-direction" element={<ArtDirection />} />}
      {import.meta.env.DEV && <Route path="/board-preview" element={<ArenaLayoutPreview />} />}
      {import.meta.env.DEV && <Route path="/pack-preview" element={<PackOpeningPreview />} />}
      {import.meta.env.DEV && <Route path="/sound-library" element={<SoundLibrary />} />}
      {import.meta.env.DEV && <Route path="/hex-preview" element={<HexBoardPreview />} />}
      <Route path="/deck-builder" element={<DeckBuilder />} />
      <Route path="/shop" element={<PackOpening />} />
      <Route path="/pack-opening" element={<PackOpening />} />
      <Route path="/collection" element={<Collection />} />
      <Route path="/quests" element={<Quests />} />
      {/* Singleplayer roguelike */}
      <Route path="/run" element={<RunEntryPage />} />
      <Route path="/run/map" element={<RunMapPage />} />
      <Route path="/run/combat" element={<CombatPage />} />
      <Route path="/run/reward" element={<CardRewardPage />} />
      <Route path="/run/campfire" element={<CampfirePage />} />
      <Route path="/run/shop" element={<ShopPage />} />
      <Route path="/run/event" element={<EventPage />} />
      <Route path="/run/over" element={<RunOverPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <>
      <SoundEffects />
      <AppRoutes />
    </>
  )
}

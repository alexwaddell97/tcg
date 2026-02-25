import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { CARD_DATABASE } from '@tcg/shared'
import CardComponent from '../components/game/Card.tsx'

export default function DeckBuilder() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-slate-900 p-4">
      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-white">Deck Builder</h1>
          <span className="text-slate-500 text-sm">({CARD_DATABASE.length} cards available)</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {CARD_DATABASE.map((def) => (
            <CardComponent
              key={def.definitionId}
              card={{ ...def, id: def.definitionId }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

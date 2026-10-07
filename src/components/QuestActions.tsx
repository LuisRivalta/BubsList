import { Dices, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { drawPool } from '../lib/filters'
import { doneQuestIds } from '../lib/tree'
import type { AppData } from '../lib/types'
import DrawDialog from './DrawDialog'

// Hero buttons of the quest pages: a new quest (already in the category, if any) and the draw.
export default function QuestActions({ data, categoryId }: { data: AppData; categoryId: string | null }) {
  const [drawing, setDrawing] = useState(false)
  // Disabled only when nothing at all can be drawn; the filters are chosen inside the draw.
  const pool = drawPool(data.quests, doneQuestIds(data.completions), { categoryId: null, typeIds: [], difficulties: [], cities: [] })
  return (
    <>
      <Link
        to={categoryId ? `/quests/nova?categoria=${categoryId}` : '/quests/nova'}
        className="fab relative inline-flex flex-1 items-center justify-center gap-2 rounded-full px-6 py-4 text-lg font-semibold text-white md:flex-none"
      >
        <Sparkles aria-hidden className="size-6" /> Nova quest
      </Link>
      <button type="button" className="btn btn-ghost shrink-0 rounded-full px-5 text-base" disabled={pool.length === 0} onClick={() => setDrawing(true)}>
        <Dices aria-hidden className="size-5" /> Sortear
      </button>
      {drawing && <DrawDialog data={data} categoryId={categoryId} onClose={() => setDrawing(false)} />}
    </>
  )
}

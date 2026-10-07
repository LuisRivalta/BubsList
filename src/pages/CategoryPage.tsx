import { ChevronLeft } from 'lucide-react'
import { Link, useParams } from 'react-router'
import Bubble from '../components/Bubble'
import PageHero from '../components/PageHero'
import QuestActions from '../components/QuestActions'
import QuestList from '../components/QuestList'
import { LoadError, NotFound, PageLoading } from '../components/Status'
import { useAppData } from '../data/hooks'
import { count } from '../lib/text'
import { doneQuestIds } from '../lib/tree'

// One category's quests; `/categoria/todas` shows every category.
export default function CategoryPage() {
  const { id = '' } = useParams()
  const q = useAppData()
  if (q.error) return <LoadError retry={() => q.refetch()} />
  if (!q.data) return <PageLoading />
  const data = q.data
  const category = data.categories.find((c) => c.id === id)
  if (id !== 'todas' && !category) return <NotFound title="Categoria não encontrada" />
  const categoryId = category?.id ?? null
  const done = doneQuestIds(data.completions)
  const topLevel = data.quests.filter((x) => x.parent_id === null && (!categoryId || x.category_id === categoryId))
  const doneCount = topLevel.filter((x) => done.has(x.id)).length

  return (
    <>
      <PageHero
        eyebrow={
          <Link to="/" className="inline-flex items-center gap-1 text-sm font-bold text-white/80 hover:text-white">
            <ChevronLeft aria-hidden className="size-4" /> Categorias
          </Link>
        }
        title={
          category ? (
            <span className="inline-flex items-center gap-3">
              <Bubble icon={category.icon} color={category.color} size="lg" /> {category.name}
            </span>
          ) : (
            'Todas'
          )
        }
        stats={
          <>
            <span className="text-white">{count(topLevel.length - doneCount, 'pendente', 'pendentes')}</span>
            <span aria-hidden>·</span>
            <span className="text-white">{count(doneCount, 'feita', 'feitas')}</span>
          </>
        }
        actions={<QuestActions data={data} categoryId={categoryId} />}
      />
      <QuestList key={id} data={data} categoryId={categoryId} />
    </>
  )
}

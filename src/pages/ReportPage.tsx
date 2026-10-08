import { ChevronLeft, ChevronRight, Sparkles, Star } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import Bubble from '../components/Bubble'
import CountUp from '../components/CountUp'
import EmptyState from '../components/EmptyState'
import Gems from '../components/Gems'
import Icon from '../components/Icon'
import PageHero from '../components/PageHero'
import PhotoGrid from '../components/PhotoGrid'
import RarityBadge from '../components/RarityBadge'
import SegmentedControl from '../components/SegmentedControl'
import { LoadError, PageLoading } from '../components/Status'
import { useAppData } from '../data/hooks'
import { evaluateAchievements } from '../lib/achievements'
import { formatDate, todayISO } from '../lib/dates'
import { DIFFICULTIES } from '../lib/difficulty'
import { buildReport, last3Period, monthPeriod, shiftPeriod, yearPeriod, type Period, type PeriodKind } from '../lib/report'

export default function ReportPage() {
  const q = useAppData()
  const today = todayISO()
  const [y, m] = today.split('-').map(Number)
  const [period, setPeriod] = useState<Period>(() => monthPeriod(y, m))
  if (q.error) return <LoadError retry={() => q.refetch()} />
  if (!q.data) return <PageLoading />
  const data = q.data
  const report = buildReport(period, data, evaluateAchievements(data.achievements, data.quests, data.completions))
  const nameOf = (userId: string) => data.profiles.find((p) => p.id === userId)?.display_name ?? '?'
  const empty = report.total === 0 && report.unlocked.length === 0
  const makers: Record<PeriodKind, () => Period> = { month: () => monthPeriod(y, m), last3: () => last3Period(today), year: () => yearPeriod(y) }
  const maxCount = Math.max(1, ...report.byCategory.map((c) => c.count))

  return (
    <>
      <PageHero
        title="Retrospectiva"
        actions={
          period.kind === 'year' && report.total > 0 ? (
            <Link to={`/retrospectiva/${period.year}`} className="btn btn-primary">
              <Sparkles aria-hidden className="size-5" /> Retrospectiva {period.year}
            </Link>
          ) : undefined
        }
      >
        <div className="max-w-md space-y-3">
          <SegmentedControl
            label="Período"
            tone="dark"
            value={period.kind}
            onChange={(kind) => setPeriod(makers[kind]())}
            options={[{ value: 'month', label: 'Mês' }, { value: 'last3', label: 'Últimos 3 meses' }, { value: 'year', label: 'Ano' }]}
          />
          <div className="flex items-center justify-between gap-2">
            {period.kind !== 'last3' ? (
              <button type="button" className="btn btn-ghost px-3" aria-label="Período anterior" onClick={() => setPeriod(shiftPeriod(period, -1))}>
                <ChevronLeft aria-hidden className="size-5" />
              </button>
            ) : <span />}
            <h2 className="text-xl font-semibold first-letter:uppercase">{period.label}</h2>
            {period.kind !== 'last3' ? (
              <button type="button" className="btn btn-ghost px-3" aria-label="Próximo período" onClick={() => setPeriod(shiftPeriod(period, 1))}>
                <ChevronRight aria-hidden className="size-5" />
              </button>
            ) : <span />}
          </div>
        </div>
      </PageHero>

      {empty ? (
        <EmptyState>Nada por aqui ainda. Bora completar uma quest?</EmptyState>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <section className="card flex items-center gap-4 p-5 md:col-span-2">
            <CountUp value={report.total} className="font-display text-6xl font-bold text-accent" />
            <p className="text-lg font-semibold text-ink/70">{report.total === 1 ? 'quest concluída' : 'quests concluídas'}</p>
          </section>

          <section className="card space-y-3 p-5">
            <h3 className="text-lg font-semibold">Por categoria</h3>
            {report.byCategory.map(({ category, count }) => (
              <div key={category.id} className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Bubble icon={category.icon} color={category.color} size="sm" />
                  <span>{category.name}: {count}</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-ink/10">
                  <div className="h-full rounded-full" style={{ width: `${(count / maxCount) * 100}%`, background: category.color }} />
                </div>
              </div>
            ))}
          </section>

          <section className="card space-y-3 p-5">
            <h3 className="text-lg font-semibold">Por dificuldade</h3>
            <ul className="grid grid-cols-4 gap-2 text-center">
              {DIFFICULTIES.map((d) => (
                <li key={d} className="flex flex-col items-center gap-2 rounded-2xl bg-paper/70 py-3">
                  <span className="font-display text-3xl font-bold">{report.byDifficulty[d]}</span>
                  <Gems difficulty={d} stacked />
                </li>
              ))}
            </ul>
          </section>

          {report.unlocked.length > 0 && (
            <section className="card space-y-3 p-5 md:col-span-2">
              <h3 className="text-lg font-semibold">Conquistas desbloqueadas</h3>
              <ul className="grid gap-2 sm:grid-cols-2">
                {report.unlocked.map((s) => (
                  <li key={s.achievement.id} className={`medal-${s.achievement.rarity} flex items-center gap-3`}>
                    <span className="medallion size-11"><Icon name={s.achievement.icon} className="size-5" /></span>
                    <span className="flex-1 font-semibold">{s.achievement.name}</span>
                    <RarityBadge rarity={s.achievement.rarity} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {report.best.length > 0 && (
            <section className="space-y-3 md:col-span-2">
              <h3 className="text-lg font-semibold">Melhores momentos</h3>
              <div className="grid gap-3 md:grid-cols-3">
                {report.best.map((i) => (
                  <Link key={i.completion.id} to={`/quests/${i.quest.id}`} className="card card-hover space-y-1 p-4">
                    <p className="font-display text-lg font-semibold">{i.quest.title}</p>
                    <p className="inline-flex items-center gap-1 font-bold text-accent">
                      <Star aria-hidden className="size-4 fill-current" /> {i.average!.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {report.photos.length > 0 && (
            <section className="space-y-3 md:col-span-2">
              <h3 className="text-lg font-semibold">Álbum</h3>
              <PhotoGrid photos={report.photos} mosaic />
            </section>
          )}

          <section className="space-y-3 md:col-span-2">
            <h3 className="text-lg font-semibold">Linha do tempo</h3>
            <ol className="timeline">
              {report.timeline.map((i) => (
                <li key={i.completion.id}>
                  <div className="card space-y-1 p-4">
                    <p className="text-xs font-semibold text-ink/60">{formatDate(i.completion.done_on)}{i.path ? ` · ${i.path}` : ''}</p>
                    <Link to={`/quests/${i.quest.id}`} className="inline-flex items-center gap-2 font-display text-lg font-semibold">
                      <Bubble icon={i.category?.icon ?? ''} color={i.category?.color ?? '#b3607e'} size="sm" /> {i.quest.title}
                    </Link>
                    {i.ratings.length > 0 && (
                      <p className="text-sm text-ink/60">{i.ratings.map((r) => `${nameOf(r.user_id)}: ${r.rating}/5`).join(' · ')}</p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>
      )}
    </>
  )
}

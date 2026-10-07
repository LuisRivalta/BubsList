import { ChevronLeft, ChevronRight, Star } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import DifficultyBadge from '../components/DifficultyBadge'
import Icon from '../components/Icon'
import PhotoGrid from '../components/PhotoGrid'
import RarityBadge from '../components/RarityBadge'
import { LoadError, Loading } from '../components/Status'
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
  if (!q.data) return <Loading />
  const data = q.data
  const report = buildReport(period, data, evaluateAchievements(data.achievements, data.quests, data.completions))
  const nameOf = (userId: string) => data.profiles.find((p) => p.id === userId)?.display_name ?? '?'
  const empty = report.total === 0 && report.unlocked.length === 0
  const tabs: [PeriodKind, string, () => Period][] = [
    ['month', 'Mês', () => monthPeriod(y, m)],
    ['last3', 'Últimos 3 meses', () => last3Period(today)],
    ['year', 'Ano', () => yearPeriod(y)],
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Relatório</h1>

      <div role="tablist" aria-label="Período" className="grid grid-cols-3 gap-2">
        {tabs.map(([kind, label, make]) => (
          <button key={kind} role="tab" aria-selected={period.kind === kind} onClick={() => setPeriod(make())} className={`btn px-2 ${period.kind === kind ? 'btn-primary' : ''}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between">
        {period.kind !== 'last3' ? (
          <button type="button" className="btn" aria-label="Período anterior" onClick={() => setPeriod(shiftPeriod(period, -1))}><ChevronLeft aria-hidden className="size-5" /></button>
        ) : <span />}
        <h2 className="text-lg font-semibold capitalize">{period.label}</h2>
        {period.kind !== 'last3' ? (
          <button type="button" className="btn" aria-label="Próximo período" onClick={() => setPeriod(shiftPeriod(period, 1))}><ChevronRight aria-hidden className="size-5" /></button>
        ) : <span />}
      </div>

      {empty ? (
        <p className="py-10 text-center text-gray-500">Nada por aqui ainda. Bora completar uma quest?</p>
      ) : (
        <>
          <section className="card p-4">
            <p className="text-4xl font-bold text-accent">{report.total}</p>
            <p className="text-gray-600">{report.total === 1 ? 'quest concluída' : 'quests concluídas'}</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {report.byCategory.map(({ category, count }) => (
                <li key={category.id} className="inline-flex items-center gap-1.5 rounded-full bg-blush/40 px-3 py-1 text-sm">
                  <Icon name={category.icon} className="size-4" /> {category.name}: {count}
                </li>
              ))}
            </ul>
          </section>

          <section className="card p-4">
            <h3 className="mb-2 font-semibold">Por dificuldade</h3>
            <ul className="grid grid-cols-4 gap-2 text-center">
              {DIFFICULTIES.map((d) => (
                <li key={d} className="space-y-1">
                  <p className="text-2xl font-bold">{report.byDifficulty[d]}</p>
                  <DifficultyBadge difficulty={d} />
                </li>
              ))}
            </ul>
          </section>

          {report.unlocked.length > 0 && (
            <section className="space-y-2">
              <h3 className="font-semibold">Conquistas desbloqueadas</h3>
              <ul className="space-y-2">
                {report.unlocked.map((s) => (
                  <li key={s.achievement.id} className="card flex items-center gap-3 p-3">
                    <Icon name={s.achievement.icon} className="size-8 text-accent" />
                    <span className="flex-1">{s.achievement.name}</span>
                    <RarityBadge rarity={s.achievement.rarity} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {report.best.length > 0 && (
            <section className="space-y-2">
              <h3 className="font-semibold">Melhores momentos</h3>
              <div className="grid gap-2 md:grid-cols-3">
                {report.best.map((i) => (
                  <Link key={i.completion.id} to={`/quests/${i.quest.id}`} className="card block p-3">
                    <p className="font-medium">{i.quest.title}</p>
                    <p className="inline-flex items-center gap-1 text-sm text-accent">
                      <Star aria-hidden className="size-4 fill-current" /> {i.average!.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {report.photos.length > 0 && (
            <section className="space-y-2">
              <h3 className="font-semibold">Álbum</h3>
              <PhotoGrid photos={report.photos} />
            </section>
          )}

          <section className="space-y-2">
            <h3 className="font-semibold">Linha do tempo</h3>
            <ol className="space-y-2">
              {report.timeline.map((i) => (
                <li key={i.completion.id} className="card p-3">
                  <p className="text-xs text-gray-500">{formatDate(i.completion.done_on)}{i.path ? ` · ${i.path}` : ''}</p>
                  <Link to={`/quests/${i.quest.id}`} className="inline-flex items-center gap-1.5 font-medium">
                    <Icon name={i.category?.icon ?? ''} className="size-4" /> {i.quest.title}
                  </Link>
                  {i.ratings.length > 0 && (
                    <p className="text-sm text-gray-600">{i.ratings.map((r) => `${nameOf(r.user_id)}: ${r.rating}/5`).join(' · ')}</p>
                  )}
                </li>
              ))}
            </ol>
          </section>
        </>
      )}
    </div>
  )
}

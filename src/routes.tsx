import type { RouteObject } from 'react-router'
import Layout from './components/Layout'
import AchievementFormPage from './pages/AchievementFormPage'
import AchievementsPage from './pages/AchievementsPage'
import CompletePage from './pages/CompletePage'
import ProfilePage from './pages/ProfilePage'
import QuestFormPage from './pages/QuestFormPage'
import QuestPage from './pages/QuestPage'
import QuestsPage from './pages/QuestsPage'
import ReportPage from './pages/ReportPage'

export const routes: RouteObject[] = [
  {
    element: <Layout />,
    children: [
      { path: '/', element: <QuestsPage /> },
      { path: '/quests/nova', element: <QuestFormPage /> },
      { path: '/quests/:id/editar', element: <QuestFormPage /> },
      { path: '/quests/:id', element: <QuestPage /> },
      { path: '/quests/:id/concluir', element: <CompletePage /> },
      { path: '/conquistas', element: <AchievementsPage /> },
      { path: '/conquistas/nova', element: <AchievementFormPage /> },
      { path: '/conquistas/:id/editar', element: <AchievementFormPage /> },
      { path: '/relatorio', element: <ReportPage /> },
      { path: '/perfil', element: <ProfilePage /> },
      { path: '*', element: <p>Página não encontrada.</p> },
    ],
  },
]

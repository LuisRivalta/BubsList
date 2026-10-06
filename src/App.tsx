import { createBrowserRouter, RouterProvider } from 'react-router'
import Layout from './components/Layout'
import QuestFormPage from './pages/QuestFormPage'
import QuestPage from './pages/QuestPage'
import QuestsPage from './pages/QuestsPage'

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <QuestsPage /> },
      { path: '/quests/nova', element: <QuestFormPage /> },
      { path: '/quests/:id/editar', element: <QuestFormPage /> },
      { path: '/quests/:id', element: <QuestPage /> },
      { path: '*', element: <p>Página não encontrada.</p> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}

import { createBrowserRouter, RouterProvider } from 'react-router'
import Layout from './components/Layout'
import QuestsPage from './pages/QuestsPage'

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <QuestsPage /> },
      { path: '*', element: <p>Página não encontrada.</p> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { AuthProvider } from './features/auth/context/AuthContext'
import { router } from './router'
import './index.css'
import { ThemeProvider } from './components/providers/ThemeProvider'

createRoot(document.getElementById('root')!).render(
<StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
)

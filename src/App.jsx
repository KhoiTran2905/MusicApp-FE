import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'sonner'

import AppRoutes from '@/routes/AppRoutes'

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
      <Toaster richColors position="top-right" />
    </BrowserRouter>
  )
}

export default App

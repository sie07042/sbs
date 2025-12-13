import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  // <StrictMode></StrictMode>
  // 개발 중에만 일부 동작을 더 엄격하게, 때로는 두 번씩 실행해 보면서
  //‘이 코드가 진짜 안전하게 짜여졌는지’ 확인해 주는 보호막.
  <StrictMode>
    <App />
  </StrictMode>
)

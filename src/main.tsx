import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import '@21st-sdk/react/styles.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// restore theme
try {
	const saved = localStorage.getItem('app.theme') as 'light' | 'dark' | null
	if (saved) document.documentElement.dataset.theme = saved
} catch { /* noop */ }

import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './App.css'
import Home from './pages/Home'
import Signup from './pages/Signup'
import Login from './pages/Login'
import OAuthCallback from './pages/OAuthCallback'
import Profile from './pages/Profile'
import PostList from './pages/PostList'
import PostCreate from './pages/PostCreate'
import PostDetail from './pages/PostDetail'
import { AuthProvider } from './contexts/AuthProvider'
import { LanguageProvider } from './contexts/LanguageContext'
import { NotificationProvider } from './contexts/NotificationContext'
import { ThemeProvider } from './contexts/ThemeContext'
import DmPage from './pages/DmPage'
import Notifications from './pages/Notifications'

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <NotificationProvider>
            <BrowserRouter>
              <Routes>
                <Route path='/' element={<Home />} />
                <Route path='/login' element={<Login />} />
                <Route path='/signup' element={<Signup />} />
                <Route path='/oauth/callback' element={<OAuthCallback />} />
                <Route path='/profile' element={<Profile />} />
                <Route path='/posts' element={<PostList />} />
                <Route path='/posts/create' element={<PostCreate />} />
                <Route path='/posts/:id' element={<PostDetail />} />
                <Route path='/dm' element={<DmPage />} />
                <Route path='/notifications' element={<Notifications />} />
              </Routes>
            </BrowserRouter>
          </NotificationProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  )
}

export default App

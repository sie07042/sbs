import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../hooks/useTheme'
import './Gnb.css'
import defaultUserImage from '../assets/default_user.png'

function GNB() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, isAuthenticated, isLoading, logout } = useAuth()
  const { isDarkMode, toggleTheme } = useTheme()

  const handleLogout = async () => {
    if (!window.confirm('Do you want to log out?')) {
      return
    }

    try {
      await logout()
      alert('Logged out.')
      navigate('/')
    } catch (error) {
      console.error('Logout error:', error)
      navigate('/')
    }
  }

  return (
    <nav className="gnb">
      <div className="gnb-container">
        <div className="gnb-menu-shell">
          <div className="gnb-brand-mark">
            <span>S</span>
          </div>

          <div className="gnb-primary-links">
            <Link to="/" className={`gnb-menu-link ${location.pathname === '/' ? 'active' : ''}`}>
              홈
            </Link>
            <Link
              to="/posts"
              className={`gnb-menu-link ${location.pathname.startsWith('/posts') ? 'active' : ''}`}
            >
              피드
            </Link>
            {isAuthenticated && (
              <Link
                to="/dm"
                className={`gnb-menu-link ${location.pathname.startsWith('/dm') ? 'active' : ''}`}
              >
                DM
              </Link>
            )}
          </div>

          <div className="gnb-right-actions">
            <button type="button" className="gnb-theme-toggle" onClick={toggleTheme}>
              <span className="gnb-theme-toggle-icon">{isDarkMode ? '라이트' : '다크'}</span>
            </button>

            {isLoading ? (
              <span className="gnb-loading">불러오는 중...</span>
            ) : isAuthenticated ? (
              <>
                <Link to="/profile" className="gnb-user-chip">
                  <img
                    src={user?.profileImage || defaultUserImage}
                    alt="프로필"
                    className="gnb-user-avatar"
                  />
                  <span className="gnb-user-name">{user?.name || '사용자'}</span>
                </Link>
                <button onClick={handleLogout} className="gnb-menu-button" type="button">
                  로그아웃
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className={`gnb-menu-link ${location.pathname === '/login' ? 'active' : ''}`}>
                  로그인
                </Link>
                <Link
                  to="/signup"
                  className={`gnb-menu-link gnb-signup-link ${location.pathname === '/signup' ? 'active' : ''}`}
                >
                  회원가입
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

export default GNB

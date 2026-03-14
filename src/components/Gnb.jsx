import { Link, useLocation, useNavigate } from 'react-router-dom'

import defaultUserImage from '../assets/default_user.png'
import { useAuth } from '../hooks/useAuth'
import { useLanguage } from '../hooks/useLanguage'
import { useNotifications } from '../hooks/useNotifications'
import { useTheme } from '../hooks/useTheme'
import './Gnb.css'

function GNB() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, isAuthenticated, isLoading, logout } = useAuth()
  const { isDarkMode, toggleTheme } = useTheme()
  const { t } = useLanguage()
  const { unreadCount } = useNotifications()

  const handleLogout = async () => {
    if (!window.confirm(t('logoutConfirm'))) {
      return
    }

    try {
      await logout()
      alert(t('logoutDone'))
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
              {t('navHome')}
            </Link>
            <Link
              to="/posts"
              className={`gnb-menu-link ${location.pathname.startsWith('/posts') ? 'active' : ''}`}
            >
              {t('navFeed')}
            </Link>
            {isAuthenticated && (
              <Link
                to="/notifications"
                className={`gnb-menu-link gnb-menu-link-with-badge ${
                  location.pathname.startsWith('/notifications') ? 'active' : ''
                }`}
              >
                <span>{t('navNotifications', '\uc54c\ub9bc')}</span>
                {unreadCount > 0 && (
                  <span className="gnb-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
                )}
              </Link>
            )}
            {isAuthenticated && (
              <Link
                to="/dm"
                className={`gnb-menu-link ${location.pathname.startsWith('/dm') ? 'active' : ''}`}
              >
                {t('navDm')}
              </Link>
            )}
          </div>

          <div className="gnb-right-actions">
            <button type="button" className="gnb-theme-toggle" onClick={toggleTheme}>
              <span className="gnb-theme-toggle-icon">
                {isDarkMode ? t('navLight') : t('navDark')}
              </span>
            </button>

            {isLoading ? (
              <span className="gnb-loading">{t('navLoading')}</span>
            ) : isAuthenticated ? (
              <>
                <Link to="/profile" className="gnb-user-chip">
                  <img
                    src={user?.profileImage || defaultUserImage}
                    alt={t('navProfileAlt')}
                    className="gnb-user-avatar"
                  />
                  <span className="gnb-user-name">{user?.name || t('navUserFallback')}</span>
                </Link>
                <button onClick={handleLogout} className="gnb-menu-button" type="button">
                  {t('navLogout')}
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className={`gnb-menu-link ${location.pathname === '/login' ? 'active' : ''}`}
                >
                  {t('navLogin')}
                </Link>
                <Link
                  to="/signup"
                  className={`gnb-menu-link gnb-signup-link ${
                    location.pathname === '/signup' ? 'active' : ''
                  }`}
                >
                  {t('navSignup')}
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

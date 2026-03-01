import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import './Gnb.css'
import defaultUserImage from '../assets/default_user.png'

function GNB() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, isAuthenticated, isLoading, logout } = useAuth()

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
          <div className="gnb-menu-side gnb-menu-left">
            <Link to="/" className={`gnb-menu-link ${location.pathname === '/' ? 'active' : ''}`}>
              Home
            </Link>
            <Link
              to="/posts"
              className={`gnb-menu-link ${location.pathname.startsWith('/posts') ? 'active' : ''}`}
            >
              Posts
            </Link>
          </div>

          <span className="gnb-menu-trigger">Menu</span>

          <div className="gnb-menu-side gnb-menu-right">
            {isLoading ? (
              <span className="gnb-loading">Loading...</span>
            ) : isAuthenticated ? (
              <>
                <Link to="/profile" className="gnb-user-chip">
                  <img
                    src={user?.profileImage || defaultUserImage}
                    alt="Profile"
                    className="gnb-user-avatar"
                  />
                  <span className="gnb-user-name">{user?.name || 'User'}</span>
                </Link>
                <button onClick={handleLogout} className="gnb-menu-button" type="button">
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className={`gnb-menu-link ${location.pathname === '/login' ? 'active' : ''}`}>
                  Login
                </Link>
                <Link
                  to="/signup"
                  className={`gnb-menu-link gnb-signup-link ${location.pathname === '/signup' ? 'active' : ''}`}
                >
                  Sign Up
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

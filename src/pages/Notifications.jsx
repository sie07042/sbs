import { useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import Footer from '../components/Footer'
import GNB from '../components/Gnb'
import { useAuth } from '../hooks/useAuth'
import { useLanguage } from '../hooks/useLanguage'
import { useNotifications } from '../hooks/useNotifications'
import './Notifications.css'

const TEXT = {
  navLabel: '\uc54c\ub9bc',
  title: '\uc0c8 \ud65c\ub3d9\uc744 \ud55c \uacf3\uc5d0\uc11c \ud655\uc778\ud558\uc138\uc694',
  description: '\ub313\uae00, \uc88b\uc544\uc694, \ud314\ub85c\uc6b0\ub97c \ubaa8\uc544 \ubcf4\uace0 \uc0c8 \uc54c\ub9bc\uc774 \uc788\uc73c\uba74 \ubc14\ub85c \ud655\uc778\ud560 \uc218 \uc788\uc5b4\uc694.',
  unread: '\uc77d\uc9c0 \uc54a\uc740 \uc54c\ub9bc',
  markAllRead: '\ubaa8\ub450 \uc77d\uc74c \ucc98\ub9ac',
  live: '\uc2e4\uc2dc\uac04 \uc54c\ub9bc',
  all: '\uc804\uccb4 \uc54c\ub9bc',
  refresh: '\uc0c8\ub85c\uace0\uce68',
  empty: '\uc544\uc9c1 \ub3c4\ucc29\ud55c \uc54c\ub9bc\uc774 \uc5c6\uc2b5\ub2c8\ub2e4.',
  followSuffix: '\ub2d8\uc774 \ud68c\uc6d0\ub2d8\uc744 \ud314\ub85c\uc6b0\ud588\uc2b5\ub2c8\ub2e4.',
  commentSuffix: '\ub2d8\uc774 \ud68c\uc6d0\ub2d8\uc758 \uac8c\uc2dc\uae00\uc5d0 \ub313\uae00\uc744 \ub0a8\uacbc\uc2b5\ub2c8\ub2e4.',
  likeSuffix: '\ub2d8\uc774 \ud68c\uc6d0\ub2d8\uc758 \uac8c\uc2dc\uae00\uc744 \uc88b\uc544\ud569\ub2c8\ub2e4.',
  recentFallback: '\ubc29\uae08 \ud655\uc778\ub41c \ud65c\ub3d9',
  justNow: '\ubc29\uae08 \uc804',
  minAgo: '\ubd84 \uc804',
  hourAgo: '\uc2dc\uac04 \uc804',
  dayAgo: '\uc77c \uc804',
  followLabel: '\ud314\ub85c\uc6b0',
  commentLabel: '\ub313\uae00',
  likeLabel: '\uc88b\uc544\uc694',
  followHelp: '\uc0c8 \ud314\ub85c\uc6cc\uac00 \uc0dd\uae30\uba74 \uc774\uacf3\uacfc \uc0c1\ub2e8 \uba54\ub274\uc5d0 \ud45c\uc2dc\ub429\ub2c8\ub2e4.',
  commentHelp: '\ub0b4 \ucd5c\uadfc \uac8c\uc2dc\uae00\uc5d0 \ub2ec\ub9b0 \ub313\uae00\uc744 \ube60\ub974\uac8c \ubaa8\uc544 \ubcfc \uc218 \uc788\uc2b5\ub2c8\ub2e4.',
  likeHelp: '\uc88b\uc544\uc694 \ud65c\ub3d9\uc740 \ubc31\uc5d4\ub4dc\uc5d0\uc11c \uc2dc\uac04 \uc815\ubcf4\uac00 \uc5c6\uc5b4\uc11c \ucd5c\uadfc \uc218\uc9d1 \uc21c\uc73c\ub85c \ubcf4\uc5ec\uc90d\ub2c8\ub2e4.',
}

function Notifications() {
  const navigate = useNavigate()
  const { isAuthenticated, isLoading } = useAuth()
  const { t } = useLanguage()
  const {
    notifications,
    unreadCount,
    isLoading: isNotificationsLoading,
    refreshNotifications,
    markAllAsRead,
  } = useNotifications()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login', { replace: true })
    }
  }, [isAuthenticated, isLoading, navigate])

  useEffect(() => {
    if (!isAuthenticated) {
      return
    }

    refreshNotifications()
  }, [isAuthenticated, refreshNotifications])

  useEffect(() => {
    if (!isAuthenticated || notifications.length === 0) {
      return
    }

    markAllAsRead()
  }, [isAuthenticated, markAllAsRead, notifications])

  const notificationGroups = useMemo(() => {
    const groups = { follow: [], comment: [], like: [] }

    notifications.forEach((item) => {
      if (groups[item.type]) {
        groups[item.type].push(item)
      }
    })

    return groups
  }, [notifications])

  const getNotificationText = (item) => {
    if (item.type === 'follow') {
      return `${item.actorName || t('navUserFallback')}${TEXT.followSuffix}`
    }

    if (item.type === 'comment') {
      return `${item.actorName || t('navUserFallback')}${TEXT.commentSuffix}`
    }

    return `${item.actorName || t('navUserFallback')}${TEXT.likeSuffix}`
  }

  const formatRelativeTime = (createdAt) => {
    if (!createdAt) {
      return TEXT.recentFallback
    }

    const diffMinutes = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000))

    if (diffMinutes < 1) {
      return TEXT.justNow
    }

    if (diffMinutes < 60) {
      return `${diffMinutes}${TEXT.minAgo}`
    }

    const diffHours = Math.floor(diffMinutes / 60)
    if (diffHours < 24) {
      return `${diffHours}${TEXT.hourAgo}`
    }

    return `${Math.floor(diffHours / 24)}${TEXT.dayAgo}`
  }

  if (isLoading || !isAuthenticated) {
    return null
  }

  return (
    <>
      <GNB />
      <div className="notifications-page">
        <div className="notifications-shell">
          <section className="notifications-hero">
            <div>
              <span className="notifications-eyebrow">{TEXT.navLabel}</span>
              <h1>{TEXT.title}</h1>
              <p>{TEXT.description}</p>
            </div>

            <div className="notifications-actions">
              <div className="notifications-summary-card">
                <span>{TEXT.unread}</span>
                <strong>{unreadCount}</strong>
              </div>
              <button type="button" className="notifications-action-button" onClick={markAllAsRead}>
                {TEXT.markAllRead}
              </button>
            </div>
          </section>

          <section className="notifications-grid">
            <article className="notifications-panel notifications-panel-main">
              <div className="notifications-panel-header">
                <div>
                  <span>{isNotificationsLoading ? t('homeSyncing', 'Syncing...') : TEXT.live}</span>
                  <h2>{TEXT.all}</h2>
                </div>
                <button type="button" className="notifications-refresh-button" onClick={refreshNotifications}>
                  {TEXT.refresh}
                </button>
              </div>

              {notifications.length === 0 ? (
                <div className="notifications-empty-state">
                  <p>{TEXT.empty}</p>
                </div>
              ) : (
                <div className="notifications-list">
                  {notifications.map((item) => (
                    <Link
                      key={item.id}
                      to={item.type === 'follow' ? '/profile' : `/posts/${item.targetId}`}
                      className="notifications-item"
                    >
                      <div className="notifications-avatar">
                        {item.actorImage ? (
                          <img src={item.actorImage} alt={item.actorName || t('navUserFallback')} />
                        ) : (
                          <span>{(item.actorName || 'U').charAt(0)}</span>
                        )}
                      </div>

                      <div className="notifications-copy">
                        <div className="notifications-meta">
                          <span className={`notifications-type ${item.type}`}>{item.type.toUpperCase()}</span>
                          <span>{formatRelativeTime(item.createdAt)}</span>
                        </div>
                        <strong>{getNotificationText(item)}</strong>
                        {item.content && <p>{item.content}</p>}
                        {!item.content && item.postPreview && <p>{item.postPreview}</p>}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </article>

            <div className="notifications-side">
              <article className="notifications-panel">
                <div className="notifications-panel-header compact">
                  <div>
                    <span>{TEXT.followLabel}</span>
                    <h2>{notificationGroups.follow.length}</h2>
                  </div>
                </div>
                <p className="notifications-side-copy">
                  {TEXT.followHelp}
                </p>
              </article>

              <article className="notifications-panel">
                <div className="notifications-panel-header compact">
                  <div>
                    <span>{TEXT.commentLabel}</span>
                    <h2>{notificationGroups.comment.length}</h2>
                  </div>
                </div>
                <p className="notifications-side-copy">
                  {TEXT.commentHelp}
                </p>
              </article>

              <article className="notifications-panel">
                <div className="notifications-panel-header compact">
                  <div>
                    <span>{TEXT.likeLabel}</span>
                    <h2>{notificationGroups.like.length}</h2>
                  </div>
                </div>
                <p className="notifications-side-copy">
                  {TEXT.likeHelp}
                </p>
              </article>
            </div>
          </section>
        </div>
      </div>
      <Footer />
    </>
  )
}

export default Notifications

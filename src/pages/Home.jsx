import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'

import Footer from '../components/Footer'
import GNB from '../components/Gnb'
import PostCard from '../components/PostCard'
import { useAuth } from '../hooks/useAuth'
import { useLanguage } from '../hooks/useLanguage'
import './Home.css'
import './PostList.css'

function Home() {
  const { isAuthenticated, accessToken, user } = useAuth()
  const { t } = useLanguage()
  const [isLoading, setIsLoading] = useState(true)
  const [dashboard, setDashboard] = useState({
    rooms: [],
    bookmarks: [],
    myPosts: [],
    trending: [],
  })

  useEffect(() => {
    const fetchDashboard = async () => {
      setIsLoading(true)

      try {
        const authHeaders = accessToken
          ? { Authorization: `Bearer ${accessToken}` }
          : undefined

        const requests = [
          axios.get('/api/hashtags/trending/top?limit=6', {
            headers: authHeaders,
            withCredentials: true,
          }),
        ]

        if (isAuthenticated && accessToken) {
          requests.push(
            axios.get('/api/dm/rooms?page=0&size=10', {
              headers: authHeaders,
              withCredentials: true,
            }),
            axios.get('/api/me/bookmarks?page=0&size=4', {
              headers: authHeaders,
              withCredentials: true,
            }),
            axios.get('/api/posts/me', {
              headers: authHeaders,
              withCredentials: true,
            })
          )
        }

        const responses = await Promise.all(requests)

        const trendingResponse = responses[0]
        const roomsResponse = responses[1]
        const bookmarksResponse = responses[2]
        const myPostsResponse = responses[3]

        setDashboard({
          trending: trendingResponse?.data?.data || [],
          rooms: roomsResponse?.data?.data?.content || [],
          bookmarks: bookmarksResponse?.data?.data?.content || [],
          myPosts: Array.isArray(myPostsResponse?.data?.data)
            ? myPostsResponse.data.data
            : myPostsResponse?.data?.data?.content || [],
        })
      } catch (error) {
        console.error('Failed to load home dashboard:', error)
        setDashboard({
          rooms: [],
          bookmarks: [],
          myPosts: [],
          trending: [],
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboard()
  }, [accessToken, isAuthenticated])

  const unreadDmCount = useMemo(
    () => dashboard.rooms.reduce((total, room) => total + (room.unreadCount || 0), 0),
    [dashboard.rooms]
  )

  const bookmarkedPosts = useMemo(
    () => dashboard.bookmarks
      .map((bookmark) => {
        const post = bookmark.post || {}
        const postId = post.id || bookmark.postId

        if (!postId) {
          return null
        }

        return {
          ...post,
          id: postId,
          postId,
          content: post.content || bookmark.content || '',
          author: post.author || bookmark.author || {
            id: bookmark.authorId || bookmark.userId,
            name: bookmark.authorName || bookmark.userName || t('homeSavedFallback'),
            profileImage: bookmark.authorProfileImage || bookmark.userProfileImage || null,
          },
          userId: post.author?.id || bookmark.authorId || bookmark.userId,
          userName: post.author?.name || bookmark.authorName || bookmark.userName,
          userProfileImage: post.author?.profileImage || bookmark.authorProfileImage || bookmark.userProfileImage,
          createdAt: post.createdAt || bookmark.bookmarkedAt,
          thumbnailUrl: post.thumbnailUrl || bookmark.thumbnailUrl,
          likeCount: post.likeCount || 0,
          commentCount: post.commentCount || 0,
          viewCount: post.viewCount || 0,
          visibility: post.visibility || 'PUBLIC',
          imageCount: post.imageCount || 0,
        }
      })
      .filter(Boolean),
    [dashboard.bookmarks, t]
  )

  const alertItems = useMemo(() => {
    const items = []

    if (!isAuthenticated) {
      items.push({
        id: 'guest',
        title: t('homeGuestTitle'),
        description: t('homeGuestDescription'),
        action: '/login',
        actionLabel: t('homeGoLogin'),
      })
      return items
    }

    items.push({
      id: 'dm',
      title: unreadDmCount > 0 ? `${unreadDmCount}${t('homeUnreadTitleSuffix')}` : t('homeInboxCaughtUp'),
      description: unreadDmCount > 0
        ? t('homeUnreadDescription')
        : t('homeDmQuietDescription'),
      action: '/dm',
      actionLabel: t('homeOpenDm'),
    })

    items.push({
      id: 'bookmarks',
      title: dashboard.bookmarks.length > 0
        ? `${dashboard.bookmarks.length}${t('homeSavedReadySuffix')}`
        : t('homeSavedEmptyTitle'),
      description: dashboard.bookmarks.length > 0
        ? t('homeSavedDescription')
        : t('homeSavedEmptyDescription'),
      action: '/posts',
      actionLabel: t('homeBrowseFeed'),
    })

    items.push({
      id: 'posts',
      title: dashboard.myPosts.length > 0
        ? `${dashboard.myPosts.length}${t('homePostsPublishedSuffix')}`
        : t('homeNoPostsYet'),
      description: dashboard.myPosts.length > 0
        ? t('homePostsDescription')
        : t('homeNoPostsDescription'),
      action: '/posts/create',
      actionLabel: t('homeCreatePost'),
    })

    return items
  }, [dashboard.bookmarks.length, dashboard.myPosts.length, isAuthenticated, t, unreadDmCount])

  return (
    <>
      <GNB />
      <div className="home-page">
        <div className="home-shell">
          <section className="home-hero">
            <div className="home-hero-copy">
              <span className="home-eyebrow">{t('homeActivityHub')}</span>
              <h1>{isAuthenticated ? `${user?.name || t('navUserFallback')}${t('homeOverviewUserSuffix')}` : t('homeOverviewGuest')}</h1>
              <p>
                {t('homeHeroDescription')}
              </p>
            </div>
            <div className="home-hero-actions">
              <Link to="/posts" className="home-primary-link">{t('homeOpenFeed')}</Link>
              <Link to={isAuthenticated ? '/posts/create' : '/login'} className="home-secondary-link">
                {isAuthenticated ? t('homeCreatePost') : t('homeLogIn')}
              </Link>
            </div>
          </section>

          <section className="home-summary-grid">
            <article className="home-summary-card">
              <span className="home-summary-label">{t('homeUnreadDm')}</span>
              <strong>{isAuthenticated ? unreadDmCount : '-'}</strong>
              <p>{t('homeMessagesWaiting')}</p>
            </article>
            <article className="home-summary-card">
              <span className="home-summary-label">{t('homeSavedPosts')}</span>
              <strong>{isAuthenticated ? dashboard.bookmarks.length : '-'}</strong>
              <p>{t('homeShortlist')}</p>
            </article>
            <article className="home-summary-card">
              <span className="home-summary-label">{t('homeMyPosts')}</span>
              <strong>{isAuthenticated ? dashboard.myPosts.length : '-'}</strong>
              <p>{t('homePublishedPosts')}</p>
            </article>
            <article className="home-summary-card">
              <span className="home-summary-label">{t('homeTrendingTags')}</span>
              <strong>{dashboard.trending.length}</strong>
              <p>{t('homeTopicsMomentum')}</p>
            </article>
          </section>

          <div className="home-grid">
            <section className="home-panel">
              <div className="home-panel-header">
                <h2>{t('homeNotifications')}</h2>
                <span>{isLoading ? t('homeSyncing') : t('homeLiveSummary')}</span>
              </div>
              <div className="home-alert-list">
                {alertItems.map((item) => (
                  <article key={item.id} className="home-alert-card">
                    <div>
                      <h3>{item.title}</h3>
                      <p>{item.description}</p>
                    </div>
                    <Link to={item.action} className="home-inline-link">
                      {item.actionLabel}
                    </Link>
                  </article>
                ))}
              </div>
            </section>

            <section className="home-panel">
              <div className="home-panel-header">
                <h2>{t('homeSavedPosts')}</h2>
                <span>{isAuthenticated ? t('homeRecentBookmarks') : t('homeLoginRequired')}</span>
              </div>
              {!isAuthenticated ? (
                <div className="home-empty-state">
                  <p>{t('homeSavedHint')}</p>
                </div>
              ) : bookmarkedPosts.length === 0 ? (
                <div className="home-empty-state">
                  <p>{t('homeNoBookmarks')}</p>
                </div>
              ) : (
                <div className="home-bookmark-feed">
                  {bookmarkedPosts.map((bookmarkPost) => (
                    <PostCard
                      key={bookmarkPost.id}
                      post={bookmarkPost}
                      isAuthenticated={isAuthenticated}
                      currentUserId={user?.id}
                      isBookmarked
                    />
                  ))}
                </div>
              )}
            </section>

            <section className="home-panel">
              <div className="home-panel-header">
                <h2>{t('homeInboxSnapshot')}</h2>
                <span>{isAuthenticated ? t('homeRecentRooms') : t('homeLoginRequired')}</span>
              </div>
              {!isAuthenticated ? (
                <div className="home-empty-state">
                  <p>{t('homeInboxHint')}</p>
                </div>
              ) : dashboard.rooms.length === 0 ? (
                <div className="home-empty-state">
                  <p>{t('homeNoConversations')}</p>
                </div>
              ) : (
                <div className="home-list">
                  {dashboard.rooms.slice(0, 4).map((room) => (
                    <Link key={room.roomId || room.id} to="/dm" className="home-list-row">
                      <strong>{room.peerUserName || room.name || t('homeConversation')}</strong>
                      <span>{room.lastMessagePreview || t('homeOpenConversation')}</span>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            <section className="home-panel">
              <div className="home-panel-header">
                <h2>{t('homeTrendingHeading')}</h2>
                <span>{t('homeTrendingHint')}</span>
              </div>
              {dashboard.trending.length === 0 ? (
                <div className="home-empty-state">
                  <p>{t('homeTrendingEmpty')}</p>
                </div>
              ) : (
                <div className="home-tag-grid">
                  {dashboard.trending.map((tag) => (
                    <Link
                      key={tag.id || tag.name}
                      to="/posts"
                      className="home-tag"
                    >
                      #{tag.name}
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}

export default Home

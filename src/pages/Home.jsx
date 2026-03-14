import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'

import Footer from '../components/Footer'
import GNB from '../components/Gnb'
import { useAuth } from '../hooks/useAuth'
import './Home.css'

function Home() {
  const { isAuthenticated, accessToken, user } = useAuth()
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

  const alertItems = useMemo(() => {
    const items = []

    if (!isAuthenticated) {
      items.push({
        id: 'guest',
        title: 'Log in to unlock your activity board',
        description: 'Track unread DMs, saved posts, and recent conversations in one place.',
        action: '/login',
        actionLabel: 'Go to login',
      })
      return items
    }

    items.push({
      id: 'dm',
      title: unreadDmCount > 0 ? `${unreadDmCount} unread messages waiting` : 'Your inbox is caught up',
      description: unreadDmCount > 0
        ? 'Jump back into recent conversations from the DM panel.'
        : 'No unread DM right now, but your chat list is ready.',
      action: '/dm',
      actionLabel: 'Open DM',
    })

    items.push({
      id: 'bookmarks',
      title: dashboard.bookmarks.length > 0
        ? `${dashboard.bookmarks.length} saved posts ready to revisit`
        : 'Start saving posts you want to revisit',
      description: dashboard.bookmarks.length > 0
        ? 'Your latest bookmarked posts are waiting below.'
        : 'Use the new save button in the feed to build your own collection.',
      action: '/posts',
      actionLabel: 'Browse feed',
    })

    items.push({
      id: 'posts',
      title: dashboard.myPosts.length > 0
        ? `${dashboard.myPosts.length} posts published so far`
        : 'You have not posted yet',
      description: dashboard.myPosts.length > 0
        ? 'Keep your profile moving with a fresh update today.'
        : 'Share your first update and start building momentum.',
      action: '/posts/create',
      actionLabel: 'Create post',
    })

    return items
  }, [dashboard.bookmarks.length, dashboard.myPosts.length, isAuthenticated, unreadDmCount])

  return (
    <>
      <GNB />
      <div className="home-page">
        <div className="home-shell">
          <section className="home-hero">
            <div className="home-hero-copy">
              <span className="home-eyebrow">Activity Hub</span>
              <h1>{isAuthenticated ? `${user?.name || 'Member'}, here is your live overview.` : 'See what matters at a glance.'}</h1>
              <p>
                Build around the pieces your app already has: messages, saved posts, your own publishing flow,
                and trending topics.
              </p>
            </div>
            <div className="home-hero-actions">
              <Link to="/posts" className="home-primary-link">Open feed</Link>
              <Link to={isAuthenticated ? '/posts/create' : '/login'} className="home-secondary-link">
                {isAuthenticated ? 'Create post' : 'Log in'}
              </Link>
            </div>
          </section>

          <section className="home-summary-grid">
            <article className="home-summary-card">
              <span className="home-summary-label">Unread DM</span>
              <strong>{isAuthenticated ? unreadDmCount : '-'}</strong>
              <p>Messages waiting for your reply.</p>
            </article>
            <article className="home-summary-card">
              <span className="home-summary-label">Saved Posts</span>
              <strong>{isAuthenticated ? dashboard.bookmarks.length : '-'}</strong>
              <p>Shortlist of posts you bookmarked.</p>
            </article>
            <article className="home-summary-card">
              <span className="home-summary-label">My Posts</span>
              <strong>{isAuthenticated ? dashboard.myPosts.length : '-'}</strong>
              <p>Updates published from your account.</p>
            </article>
            <article className="home-summary-card">
              <span className="home-summary-label">Trending Tags</span>
              <strong>{dashboard.trending.length}</strong>
              <p>Topics with momentum right now.</p>
            </article>
          </section>

          <div className="home-grid">
            <section className="home-panel">
              <div className="home-panel-header">
                <h2>Notifications</h2>
                <span>{isLoading ? 'Syncing...' : 'Live summary'}</span>
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
                <h2>Saved Posts</h2>
                <span>{isAuthenticated ? 'Recent bookmarks' : 'Login required'}</span>
              </div>
              {!isAuthenticated ? (
                <div className="home-empty-state">
                  <p>Save posts from the feed and they will appear here.</p>
                </div>
              ) : dashboard.bookmarks.length === 0 ? (
                <div className="home-empty-state">
                  <p>No bookmarks yet. Try the new save button in the feed.</p>
                </div>
              ) : (
                <div className="home-list">
                  {dashboard.bookmarks.map((bookmark) => (
                    <Link key={bookmark.postId || bookmark.id} to={`/posts/${bookmark.postId || bookmark.id}`} className="home-list-row">
                      <strong>{bookmark.authorName || bookmark.userName || 'Saved post'}</strong>
                      <span>{bookmark.content || 'Open post details'}</span>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            <section className="home-panel">
              <div className="home-panel-header">
                <h2>Inbox Snapshot</h2>
                <span>{isAuthenticated ? 'Recent rooms' : 'Login required'}</span>
              </div>
              {!isAuthenticated ? (
                <div className="home-empty-state">
                  <p>Log in to see unread messages and active conversations.</p>
                </div>
              ) : dashboard.rooms.length === 0 ? (
                <div className="home-empty-state">
                  <p>No conversations yet. Start one from a post card or profile.</p>
                </div>
              ) : (
                <div className="home-list">
                  {dashboard.rooms.slice(0, 4).map((room) => (
                    <Link key={room.roomId || room.id} to="/dm" className="home-list-row">
                      <strong>{room.peerUserName || room.name || 'Conversation'}</strong>
                      <span>{room.lastMessagePreview || 'Open the conversation'}</span>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            <section className="home-panel">
              <div className="home-panel-header">
                <h2>Trending Hashtags</h2>
                <span>What people are opening now</span>
              </div>
              {dashboard.trending.length === 0 ? (
                <div className="home-empty-state">
                  <p>Trending topics will appear here once the feed data is available.</p>
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

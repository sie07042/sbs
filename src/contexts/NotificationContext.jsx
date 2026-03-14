import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { useAuth } from '../hooks/useAuth'

const NotificationContext = createContext(null)

const getSeenStorageKey = (userId) => `notifications:seen:${userId}`

export function NotificationProvider({ children }) {
  const { user, accessToken, isAuthenticated } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  const refreshNotifications = useCallback(async () => {
    if (!isAuthenticated || !accessToken || !user?.id) {
      setNotifications([])
      setUnreadCount(0)
      return
    }

    setIsLoading(true)

    try {
      const headers = {
        Authorization: `Bearer ${accessToken}`,
      }

      const [postsResponse, followersResponse] = await Promise.all([
        axios.get('/api/posts/me', {
          headers,
          withCredentials: true,
        }),
        axios.get(`/api/users/${user.id}/followers?page=0&size=10`, {
          headers,
          withCredentials: true,
        }),
      ])

      const myPosts = Array.isArray(postsResponse.data?.data)
        ? postsResponse.data.data
        : postsResponse.data?.data?.content || []

      const latestPosts = myPosts.slice(0, 6)

      const interactionResponses = await Promise.all(
        latestPosts.map(async (post) => {
          const postId = post.id || post.postId

          const [commentsResponse, likesResponse] = await Promise.all([
            axios.get(`/api/posts/${postId}/comments?page=0&size=5`, {
              headers,
              withCredentials: true,
            }),
            axios.get(`/api/posts/${postId}/likes?page=0&size=5`, {
              headers,
              withCredentials: true,
            }),
          ])

          return {
            post,
            comments: commentsResponse.data?.data?.content || [],
            likes: likesResponse.data?.data?.content || [],
          }
        })
      )

      const followerItems = (followersResponse.data?.data?.content || [])
        .filter((follower) => String(follower.id) !== String(user.id))
        .map((follower) => ({
          id: `follow-${follower.id}`,
          type: 'follow',
          actorId: follower.id,
          actorName: follower.name,
          actorImage: follower.profileImage,
          createdAt: follower.followedAt || null,
          targetId: follower.id,
        }))

      const commentItems = interactionResponses.flatMap(({ post, comments }) => {
        const postId = post.id || post.postId

        return comments
          .filter((comment) => String(comment.author?.id) !== String(user.id))
          .map((comment) => ({
            id: `comment-${comment.id}`,
            type: 'comment',
            actorId: comment.author?.id,
            actorName: comment.author?.name,
            actorImage: comment.author?.profileImage,
            createdAt: comment.createdAt || null,
            targetId: postId,
            postPreview: post.content || '',
            content: comment.content || '',
          }))
      })

      const likeItems = interactionResponses.flatMap(({ post, likes }) => {
        const postId = post.id || post.postId

        return likes
          .filter((likeUser) => String(likeUser.id) !== String(user.id))
          .map((likeUser, index) => ({
            id: `like-${postId}-${likeUser.id}`,
            type: 'like',
            actorId: likeUser.id,
            actorName: likeUser.name,
            actorImage: likeUser.profileImage,
            createdAt: null,
            syntheticOrder: index,
            targetId: postId,
            postPreview: post.content || '',
          }))
      })

      const nextNotifications = [...followerItems, ...commentItems, ...likeItems].sort((a, b) => {
        if (a.createdAt && b.createdAt) {
          return new Date(b.createdAt) - new Date(a.createdAt)
        }

        if (a.createdAt && !b.createdAt) return -1
        if (!a.createdAt && b.createdAt) return 1

        return (a.syntheticOrder || 0) - (b.syntheticOrder || 0)
      })

      setNotifications(nextNotifications)

      const seenIds = new Set(
        JSON.parse(localStorage.getItem(getSeenStorageKey(user.id)) || '[]')
      )

      setUnreadCount(nextNotifications.filter((item) => !seenIds.has(item.id)).length)
    } catch (error) {
      console.error('Failed to load notifications:', error)
      setNotifications([])
      setUnreadCount(0)
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, isAuthenticated, user?.id])

  const markAllAsRead = useCallback(() => {
    if (!user?.id) {
      return
    }

    const ids = notifications.map((item) => item.id)
    localStorage.setItem(getSeenStorageKey(user.id), JSON.stringify(ids))
    setUnreadCount(0)
  }, [notifications, user?.id])

  useEffect(() => {
    refreshNotifications()
  }, [refreshNotifications])

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      return undefined
    }

    const interval = setInterval(() => {
      refreshNotifications()
    }, 45000)

    return () => clearInterval(interval)
  }, [isAuthenticated, refreshNotifications, user?.id])

  const value = useMemo(() => ({
    notifications,
    unreadCount,
    isLoading,
    refreshNotifications,
    markAllAsRead,
  }), [isLoading, markAllAsRead, notifications, refreshNotifications, unreadCount])

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}

export default NotificationContext

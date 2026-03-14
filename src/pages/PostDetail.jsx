import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'

import GNB from '../components/Gnb'
import Footer from '../components/Footer'
import { useAuth } from '../hooks/useAuth'
import { API_CONFIG } from '../config'
import './PostDetail.css'

function PostDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, accessToken, isAuthenticated } = useAuth()

  const [post, setPost] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isLikeLoading, setIsLikeLoading] = useState(false)
  const [followCounts, setFollowCounts] = useState({ followerCount: 0, followingCount: 0 })
  const [isFollowing, setIsFollowing] = useState(false)
  const [isFollowLoading, setIsFollowLoading] = useState(false)
  const [followModalType, setFollowModalType] = useState(null)
  const [followUsers, setFollowUsers] = useState([])
  const [isFollowListLoading, setIsFollowListLoading] = useState(false)

  const fetchPost = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const url = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.posts}/${id}`
      const headers = {}

      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`
      }

      const response = await axios.get(url, {
        headers,
        withCredentials: true,
      })

      setPost(response.data?.data || response.data)
    } catch (err) {
      console.error('Post detail fetch failed:', err)

      if (err.response?.status === 404) {
        setError('게시글을 찾을 수 없어요.')
      } else {
        setError('게시글을 불러오지 못했어요.')
      }
    } finally {
      setIsLoading(false)
    }
  }, [id, accessToken])

  useEffect(() => {
    fetchPost()
  }, [fetchPost])

  const authorId = post?.author?.id || post?.userId
  const authorName = post?.author?.name || post?.userName || '알 수 없음'
  const authorImage = post?.author?.profileImage || post?.userProfileImage || null

  const isOwner = user && post && (
    user.id === post.userId ||
    user.id === post.author?.id ||
    user.email === post.author?.email
  )

  const canStartDm = isAuthenticated && authorId && !isOwner
  const canFollow = isAuthenticated && authorId && !isOwner

  const fetchFollowState = useCallback(async () => {
    if (!authorId) return

    try {
      const countResponse = await axios.get(`/api/users/${authorId}/follow/count`, {
        headers: accessToken
          ? {
              Authorization: `Bearer ${accessToken}`,
            }
          : undefined,
        withCredentials: true,
      })

      setFollowCounts(countResponse.data?.data || { followerCount: 0, followingCount: 0 })

      if (!canFollow) {
        setIsFollowing(false)
        return
      }

      const followCheckResponse = await axios.get(`/api/users/${authorId}/follow/check`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        withCredentials: true,
      })

      setIsFollowing(!!followCheckResponse.data?.data)
    } catch (err) {
      if (err.response?.status !== 401) {
        console.error('Failed to fetch follow state:', err)
      }
    }
  }, [accessToken, authorId, canFollow])

  useEffect(() => {
    fetchFollowState()
  }, [fetchFollowState])

  const handleDelete = async () => {
    if (!window.confirm('이 게시글을 삭제할까요?')) {
      return
    }

    try {
      const url = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.posts}/${id}`

      await axios.delete(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        withCredentials: true,
      })

      alert('게시글을 삭제했어요.')
      navigate('/posts')
    } catch (err) {
      console.error('Post delete failed:', err)
      alert('게시글을 삭제하지 못했어요.')
    }
  }

  const handleToggleLike = async () => {
    if (!post || isLikeLoading) {
      return
    }

    if (!isAuthenticated || !accessToken) {
      alert('좋아요는 로그인 후 사용할 수 있어요.')
      return
    }

    setIsLikeLoading(true)

    try {
      const url = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.posts}/${id}/like`
      const response = await axios({
        url,
        method: post.liked ? 'delete' : 'post',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        withCredentials: true,
      })

      const likeData = response.data?.data

      setPost((prev) => ({
        ...prev,
        liked: typeof likeData?.liked === 'boolean' ? likeData.liked : !prev.liked,
        likeCount: typeof likeData?.likeCount === 'number'
          ? likeData.likeCount
          : Math.max(0, (prev.likeCount || 0) + (prev.liked ? -1 : 1)),
      }))
    } catch (err) {
      console.error('Like toggle failed:', err)
      alert('좋아요를 반영하지 못했어요.')
    } finally {
      setIsLikeLoading(false)
    }
  }

  const handleToggleFollow = async () => {
    if (!canFollow || !authorId) {
      return
    }

    if (!accessToken) {
      alert('팔로우는 로그인 후 사용할 수 있어요.')
      return
    }

    try {
      setIsFollowLoading(true)

      const response = await axios({
        url: `/api/users/${authorId}/follow`,
        method: isFollowing ? 'delete' : 'post',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        withCredentials: true,
      })

      const nextData = response.data?.data
      setIsFollowing(!!nextData?.following)
      setFollowCounts({
        followerCount: nextData?.followerCount ?? followCounts.followerCount,
        followingCount: nextData?.followingCount ?? followCounts.followingCount,
      })
    } catch (err) {
      console.error('Failed to toggle follow:', err)
      alert(err.response?.data?.message || '팔로우를 반영하지 못했어요.')
    } finally {
      setIsFollowLoading(false)
    }
  }

  const fetchFollowUsers = async (type) => {
    if (!authorId) return

    try {
      setIsFollowListLoading(true)

      const response = await axios.get(`/api/users/${authorId}/${type}?page=0&size=20`, {
        headers: accessToken
          ? {
              Authorization: `Bearer ${accessToken}`,
            }
          : undefined,
        withCredentials: true,
      })

      setFollowUsers(response.data?.data?.content || [])
      setFollowModalType(type)
    } catch (err) {
      console.error(`Failed to fetch ${type}:`, err)
      alert(err.response?.data?.message || '팔로우 목록을 불러오지 못했어요.')
    } finally {
      setIsFollowListLoading(false)
    }
  }

  const handleFollowUserFromList = async (targetUserId, currentlyFollowing) => {
    if (!accessToken) {
      alert('팔로우는 로그인 후 사용할 수 있어요.')
      return
    }

    try {
      await axios({
        url: `/api/users/${targetUserId}/follow`,
        method: currentlyFollowing ? 'delete' : 'post',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        withCredentials: true,
      })

      setFollowUsers((prev) => prev.map((followUser) => (
        followUser.id === targetUserId
          ? { ...followUser, isFollowing: !currentlyFollowing }
          : followUser
      )))
    } catch (err) {
      console.error('Failed to update follow user from list:', err)
      alert(err.response?.data?.message || '팔로우를 반영하지 못했어요.')
    }
  }

  const handleStartDm = () => {
    if (!authorId) {
      return
    }

    navigate(`/dm?userId=${authorId}&name=${encodeURIComponent(authorName)}`)
  }

  const formatDate = (dateString) => {
    if (!dateString) return ''

    const date = new Date(dateString)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')

    return `${year}.${month}.${day} ${hours}:${minutes}`
  }

  const visibilityLabel = post?.visibility === 'PRIVATE'
    ? '비공개'
    : post?.visibility === 'FOLLOWERS_ONLY'
      ? '팔로워 공개'
      : '전체 공개'

  return (
    <>
      <GNB />
      <div className="post-detail-page">
        {isLoading ? (
          <div className="post-detail-state">
            <p>게시글을 불러오는 중...</p>
          </div>
        ) : error ? (
          <div className="post-detail-state">
            <p>{error}</p>
            <button onClick={() => navigate(-1)} className="post-detail-back-button" type="button">
              뒤로가기
            </button>
          </div>
        ) : post ? (
          <div className="post-detail-shell">
            <div className="post-detail-topbar">
              <button onClick={() => navigate(-1)} className="post-detail-back-button" type="button">
                뒤로가기
              </button>
              <button onClick={() => navigate('/posts')} className="post-detail-ghost-button" type="button">
                피드로 이동
              </button>
            </div>

            <article className="post-detail-card">
              <div className="post-detail-header">
                <div className="post-detail-author">
                  {authorImage ? (
                    <img src={authorImage} alt={authorName} className="post-detail-avatar" />
                  ) : (
                    <div className="post-detail-avatar-placeholder">
                      {authorName.charAt(0)}
                    </div>
                  )}

                  <div className="post-detail-author-info">
                    <div className="post-detail-author-row">
                      <span className="post-detail-author-name">{authorName}</span>
                      <span className="post-detail-visibility-chip">{visibilityLabel}</span>
                    </div>
                    <span className="post-detail-date">{formatDate(post.createdAt)}</span>
                    <div className="post-detail-follow-summary">
                      <button
                        type="button"
                        className="post-detail-follow-stat"
                        onClick={() => fetchFollowUsers('followers')}
                      >
                        팔로워 {followCounts.followerCount || 0}
                      </button>
                      <button
                        type="button"
                        className="post-detail-follow-stat"
                        onClick={() => fetchFollowUsers('followings')}
                      >
                        팔로잉 {followCounts.followingCount || 0}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="post-detail-actions">
                  {canFollow && (
                    <button
                      onClick={handleToggleFollow}
                      className={`post-detail-action-button accent ${isFollowing ? 'following' : ''}`}
                      type="button"
                      disabled={isFollowLoading}
                    >
                      {isFollowLoading ? '처리 중...' : isFollowing ? '팔로잉' : '팔로우'}
                    </button>
                  )}

                  {canStartDm && (
                    <button onClick={handleStartDm} className="post-detail-action-button" type="button">
                      메시지
                    </button>
                  )}

                  {isOwner && (
                    <button onClick={handleDelete} className="post-detail-action-button danger" type="button">
                      삭제
                    </button>
                  )}
                </div>
              </div>

              <div className="post-detail-content">
                <p>{post.content}</p>
              </div>

              {post.images && post.images.length > 0 && (
                <div className="post-detail-images">
                  {post.images.map((image, index) => (
                    <div key={image.id || index} className="post-detail-image-item">
                      <img
                        src={image.imageUrl || image.url}
                        alt={`게시글 이미지 ${index + 1}`}
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="post-detail-stats">
                <button
                  type="button"
                  className={`post-detail-like-button ${post.liked ? 'liked' : ''}`}
                  onClick={handleToggleLike}
                  disabled={isLikeLoading}
                  aria-pressed={!!post.liked}
                >
                  좋아요 {post.likeCount || 0}
                </button>
                <span className="post-detail-stat">댓글 {post.commentCount || 0}</span>
                <span className="post-detail-stat">조회 {post.viewCount || 0}</span>
              </div>
            </article>
          </div>
        ) : null}
      </div>

      {followModalType && (
        <div className="follow-modal-overlay" onClick={() => setFollowModalType(null)}>
          <div className="follow-modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="follow-modal-header">
              <h3>{followModalType === 'followers' ? '팔로워' : '팔로잉'}</h3>
              <button
                type="button"
                className="follow-modal-close"
                onClick={() => setFollowModalType(null)}
              >
                닫기
              </button>
            </div>

            <div className="follow-modal-body">
              {isFollowListLoading ? (
                <div className="follow-modal-empty">불러오는 중...</div>
              ) : followUsers.length === 0 ? (
                <div className="follow-modal-empty">표시할 사용자가 없어요.</div>
              ) : (
                followUsers.map((followUser) => {
                  const isCurrentUser = String(followUser.id) === String(user?.id)

                  return (
                    <div key={followUser.id} className="follow-user-row">
                      <div className="follow-user-meta">
                        {followUser.profileImage ? (
                          <img
                            src={followUser.profileImage}
                            alt={followUser.name}
                            className="follow-user-avatar"
                          />
                        ) : (
                          <div className="follow-user-avatar placeholder">
                            {followUser.name?.charAt(0) || 'U'}
                          </div>
                        )}
                        <div className="follow-user-copy">
                          <span className="follow-user-name">{followUser.name}</span>
                          <span className="follow-user-email">{followUser.email}</span>
                        </div>
                      </div>

                      {!isCurrentUser && isAuthenticated && typeof followUser.isFollowing === 'boolean' && (
                        <button
                          type="button"
                          className={`follow-user-button ${followUser.isFollowing ? 'following' : ''}`}
                          onClick={() => handleFollowUserFromList(followUser.id, !!followUser.isFollowing)}
                        >
                          {followUser.isFollowing ? '팔로잉' : '팔로우'}
                        </button>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}

      <Footer />
    </>
  )
}

export default PostDetail

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'

import Footer from '../components/Footer'
import GNB from '../components/Gnb'
import { API_CONFIG } from '../config'
import { useAuth } from '../hooks/useAuth'
import { useLanguage } from '../hooks/useLanguage'
import './PostDetail.css'

function PostDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, accessToken, isAuthenticated } = useAuth()
  const { t } = useLanguage()
  const postId = id && id !== 'undefined' && id !== 'null' ? id : null

  const [post, setPost] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isLikeLoading, setIsLikeLoading] = useState(false)
  const [isBookmarkLoading, setIsBookmarkLoading] = useState(false)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [followCounts, setFollowCounts] = useState({ followerCount: 0, followingCount: 0 })
  const [isFollowing, setIsFollowing] = useState(false)
  const [isFollowLoading, setIsFollowLoading] = useState(false)
  const [followModalType, setFollowModalType] = useState(null)
  const [followUsers, setFollowUsers] = useState([])
  const [isFollowListLoading, setIsFollowListLoading] = useState(false)
  const [comments, setComments] = useState([])
  const [isCommentsLoading, setIsCommentsLoading] = useState(false)
  const [commentInput, setCommentInput] = useState('')
  const [replyInputs, setReplyInputs] = useState({})
  const [replyOpenMap, setReplyOpenMap] = useState({})
  const [replyLoadingMap, setReplyLoadingMap] = useState({})
  const [replyLoadedMap, setReplyLoadedMap] = useState({})
  const [commentSubmitting, setCommentSubmitting] = useState(false)
  const [deletingCommentIds, setDeletingCommentIds] = useState([])

  const authHeaders = useMemo(
    () => (accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined),
    [accessToken]
  )

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

  const fetchPost = useCallback(async () => {
    if (!postId) {
      setError(t('postInvalidId'))
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await axios.get(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.posts}/${postId}`, {
        headers: authHeaders,
        withCredentials: true,
      })

      setPost(response.data?.data || response.data)
    } catch (err) {
      console.error('Post detail fetch failed:', err)
      setError(err.response?.status === 404 ? t('postNotFound') : t('postLoadFailed'))
    } finally {
      setIsLoading(false)
    }
  }, [authHeaders, postId, t])

  const fetchComments = useCallback(async () => {
    if (!postId) {
      setComments([])
      setIsCommentsLoading(false)
      return
    }

    setIsCommentsLoading(true)

    try {
      const response = await axios.get(`/api/posts/${postId}/comments?page=0&size=20`, {
        headers: authHeaders,
        withCredentials: true,
      })

      setComments(response.data?.data?.content || [])
    } catch (err) {
      console.error('Failed to fetch comments:', err)
      setComments([])
    } finally {
      setIsCommentsLoading(false)
    }
  }, [authHeaders, postId])

  useEffect(() => {
    fetchPost()
    fetchComments()
  }, [fetchComments, fetchPost])

  const authorId = post?.author?.id || post?.userId
  const authorName = post?.author?.name || post?.userName || t('cardUnknown')
  const authorImage = post?.author?.profileImage || post?.userProfileImage || null
  const isOwner = !!(user && post && (
    user.id === post.userId ||
    user.id === post.author?.id ||
    user.email === post.author?.email
  ))
  const canStartDm = isAuthenticated && authorId && !isOwner
  const canFollow = isAuthenticated && authorId && !isOwner

  const fetchFollowState = useCallback(async () => {
    if (!authorId) {
      return
    }

    try {
      const countResponse = await axios.get(`/api/users/${authorId}/follow/count`, {
        headers: authHeaders,
        withCredentials: true,
      })

      setFollowCounts(countResponse.data?.data || { followerCount: 0, followingCount: 0 })

      if (!canFollow || !accessToken) {
        setIsFollowing(false)
        return
      }

      const followCheckResponse = await axios.get(`/api/users/${authorId}/follow/check`, {
        headers: authHeaders,
        withCredentials: true,
      })

      setIsFollowing(!!followCheckResponse.data?.data)
    } catch (err) {
      if (err.response?.status !== 401) {
        console.error('Failed to fetch follow state:', err)
      }
    }
  }, [accessToken, authHeaders, authorId, canFollow])

  const fetchBookmarkState = useCallback(async () => {
    if (!isAuthenticated || !accessToken || !postId) {
      setIsBookmarked(false)
      return
    }

    try {
      const response = await axios.get(`/api/posts/${postId}/bookmark/check`, {
        headers: authHeaders,
        withCredentials: true,
      })

      setIsBookmarked(!!response.data?.data)
    } catch (err) {
      console.error('Failed to fetch bookmark state:', err)
      setIsBookmarked(false)
    }
  }, [accessToken, authHeaders, isAuthenticated, postId])

  useEffect(() => {
    fetchFollowState()
  }, [fetchFollowState])

  useEffect(() => {
    fetchBookmarkState()
  }, [fetchBookmarkState])

  const updateCommentInTree = (targetCommentId, updater) => {
    setComments((prev) => prev.map((comment) => {
      if (comment.id === targetCommentId) {
        return updater(comment)
      }

      if (!Array.isArray(comment.replies)) {
        return comment
      }

      return {
        ...comment,
        replies: comment.replies.map((reply) => (
          reply.id === targetCommentId ? updater(reply) : reply
        )),
      }
    }))
  }

  const isOwnedComment = (commentAuthor) => !!(
    user &&
    commentAuthor &&
    (
      String(user.id) === String(commentAuthor.id) ||
      user.email === commentAuthor.email
    )
  )

  const handleDelete = async () => {
    if (!window.confirm(t('postDeleteConfirm'))) {
      return
    }

    try {
      await axios.delete(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.posts}/${postId}`, {
        headers: authHeaders,
        withCredentials: true,
      })

      alert(t('postDeleteDone'))
      navigate('/posts')
    } catch (err) {
      console.error('Post delete failed:', err)
      alert(t('postDeleteFailed'))
    }
  }

  const handleToggleLike = async () => {
    if (!post || isLikeLoading) {
      return
    }

    if (!isAuthenticated || !accessToken) {
      alert(t('postLoginLike'))
      return
    }

    setIsLikeLoading(true)

    try {
      const response = await axios({
        url: `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.posts}/${postId}/like`,
        method: post.liked ? 'delete' : 'post',
        headers: authHeaders,
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
      alert(t('postLikeFailed'))
    } finally {
      setIsLikeLoading(false)
    }
  }

  const handleToggleBookmark = async () => {
    if (!isAuthenticated || !accessToken) {
      alert(t('postLoginSave'))
      return
    }

    if (isBookmarkLoading) {
      return
    }

    try {
      setIsBookmarkLoading(true)

      const response = await axios({
        url: `/api/posts/${postId}/bookmark`,
        method: isBookmarked ? 'delete' : 'post',
        headers: authHeaders,
        withCredentials: true,
      })

      setIsBookmarked(
        typeof response.data?.data?.bookmarked === 'boolean'
          ? response.data.data.bookmarked
          : !isBookmarked
      )
    } catch (err) {
      console.error('Failed to update bookmark:', err)
      alert(err.response?.data?.message || t('postSaveFailed'))
    } finally {
      setIsBookmarkLoading(false)
    }
  }

  const handleToggleFollow = async () => {
    if (!canFollow || !authorId) {
      return
    }

    if (!accessToken) {
      alert(t('postLoginFollow'))
      return
    }

    try {
      setIsFollowLoading(true)

      const response = await axios({
        url: `/api/users/${authorId}/follow`,
        method: isFollowing ? 'delete' : 'post',
        headers: authHeaders,
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
      alert(err.response?.data?.message || t('postFollowFailed'))
    } finally {
      setIsFollowLoading(false)
    }
  }

  const fetchFollowUsers = async (type) => {
    if (!authorId) {
      return
    }

    try {
      setIsFollowListLoading(true)

      const response = await axios.get(`/api/users/${authorId}/${type}?page=0&size=20`, {
        headers: authHeaders,
        withCredentials: true,
      })

      setFollowUsers(response.data?.data?.content || [])
      setFollowModalType(type)
    } catch (err) {
      console.error(`Failed to fetch ${type}:`, err)
      alert(err.response?.data?.message || t('postFollowListFailed'))
    } finally {
      setIsFollowListLoading(false)
    }
  }

  const handleFollowUserFromList = async (targetUserId, currentlyFollowing) => {
    if (!accessToken) {
      alert(t('postLoginFollow'))
      return
    }

    try {
      await axios({
        url: `/api/users/${targetUserId}/follow`,
        method: currentlyFollowing ? 'delete' : 'post',
        headers: authHeaders,
        withCredentials: true,
      })

      setFollowUsers((prev) => prev.map((followUser) => (
        followUser.id === targetUserId
          ? { ...followUser, isFollowing: !currentlyFollowing }
          : followUser
      )))
    } catch (err) {
      console.error('Failed to update follow from list:', err)
      alert(err.response?.data?.message || t('postFollowFailed'))
    }
  }

  const handleStartDm = () => {
    if (!authorId) {
      return
    }

    navigate(`/dm?userId=${authorId}&name=${encodeURIComponent(authorName)}`)
  }

  const handleSubmitComment = async (event) => {
    event.preventDefault()

    if (!commentInput.trim()) {
      return
    }

    if (!isAuthenticated || !accessToken) {
      alert(t('postLoginComment'))
      return
    }

    try {
      setCommentSubmitting(true)

      const response = await axios.post(
        `/api/posts/${postId}/comments`,
        { content: commentInput.trim() },
        {
          headers: {
            ...authHeaders,
            'Content-Type': 'application/json',
          },
          withCredentials: true,
        }
      )

      const nextComment = response.data?.data
      setComments((prev) => [nextComment, ...prev])
      setCommentInput('')
      setPost((prev) => (
        prev
          ? {
              ...prev,
              commentCount: (prev.commentCount || 0) + 1,
            }
          : prev
      ))
    } catch (err) {
      console.error('Failed to create comment:', err)
      alert(err.response?.data?.message || t('postCommentFailed'))
    } finally {
      setCommentSubmitting(false)
    }
  }

  const loadReplies = async (commentId) => {
    if (replyLoadingMap[commentId]) {
      return
    }

    try {
      setReplyLoadingMap((prev) => ({ ...prev, [commentId]: true }))

      const response = await axios.get(`/api/comments/${commentId}/replies`, {
        headers: authHeaders,
        withCredentials: true,
      })

      const replies = response.data?.data || []
      updateCommentInTree(commentId, (comment) => ({
        ...comment,
        replies,
        replyCount: replies.length,
      }))
      setReplyLoadedMap((prev) => ({ ...prev, [commentId]: true }))
    } catch (err) {
      console.error('Failed to load replies:', err)
      alert(err.response?.data?.message || t('postLoadRepliesFailed'))
    } finally {
      setReplyLoadingMap((prev) => ({ ...prev, [commentId]: false }))
    }
  }

  const handleToggleReplies = async (comment) => {
    const hasInlineReplies = Array.isArray(comment.replies)
    const nextOpen = !replyOpenMap[comment.id]
    setReplyOpenMap((prev) => ({ ...prev, [comment.id]: nextOpen }))

    if (nextOpen && !replyLoadedMap[comment.id] && !hasInlineReplies) {
      await loadReplies(comment.id)
    }

    if (nextOpen && hasInlineReplies && !replyLoadedMap[comment.id]) {
      setReplyLoadedMap((prev) => ({ ...prev, [comment.id]: true }))
    }
  }

  const handleSubmitReply = async (commentId) => {
    const content = replyInputs[commentId]?.trim()

    if (!content) {
      return
    }

    if (!isAuthenticated || !accessToken) {
      alert(t('postLoginReply'))
      return
    }

    try {
      setReplyLoadingMap((prev) => ({ ...prev, [commentId]: true }))

      const response = await axios.post(
        `/api/comments/${commentId}/replies`,
        { content },
        {
          headers: {
            ...authHeaders,
            'Content-Type': 'application/json',
          },
          withCredentials: true,
        }
      )

      const nextReply = response.data?.data
      updateCommentInTree(commentId, (comment) => ({
        ...comment,
        replies: [...(comment.replies || []), nextReply],
        replyCount: (comment.replyCount || 0) + 1,
      }))
      setReplyInputs((prev) => ({ ...prev, [commentId]: '' }))
      setReplyOpenMap((prev) => ({ ...prev, [commentId]: true }))
      setReplyLoadedMap((prev) => ({ ...prev, [commentId]: true }))
      setPost((prev) => (
        prev
          ? {
              ...prev,
              commentCount: (prev.commentCount || 0) + 1,
            }
          : prev
      ))
    } catch (err) {
      console.error('Failed to create reply:', err)
      alert(err.response?.data?.message || t('postReplyFailed'))
    } finally {
      setReplyLoadingMap((prev) => ({ ...prev, [commentId]: false }))
    }
  }

  const handleDeleteComment = async (commentId) => {
    if (!accessToken || deletingCommentIds.includes(commentId)) {
      return
    }

    if (!window.confirm(t('postDeleteCommentConfirm', '이 댓글을 삭제할까요?'))) {
      return
    }

    try {
      setDeletingCommentIds((prev) => [...prev, commentId])

      await axios.delete(`/api/comments/${commentId}`, {
        headers: authHeaders,
        withCredentials: true,
      })

      updateCommentInTree(commentId, (comment) => ({
        ...comment,
        isDeleted: true,
        content: '',
      }))

      setPost((prev) => (
        prev
          ? {
              ...prev,
              commentCount: Math.max(0, (prev.commentCount || 0) - 1),
            }
          : prev
      ))
    } catch (err) {
      console.error('Failed to delete comment:', err)
      alert(err.response?.data?.message || t('postDeleteCommentFailed', '댓글 삭제에 실패했습니다.'))
    } finally {
      setDeletingCommentIds((prev) => prev.filter((id) => id !== commentId))
    }
  }

  const visibilityLabel = post?.visibility === 'PRIVATE'
    ? t('postPrivate')
    : post?.visibility === 'FOLLOWERS_ONLY'
      ? t('postFollowersOnly')
      : t('postPublic')

  return (
    <>
      <GNB />
      <div className="post-detail-page">
        {isLoading ? (
          <div className="post-detail-state">
            <p>{t('postLoading')}</p>
          </div>
        ) : error ? (
          <div className="post-detail-state">
            <p>{error}</p>
            <button onClick={() => navigate(-1)} className="post-detail-back-button" type="button">
              {t('postGoBack')}
            </button>
          </div>
        ) : post ? (
          <div className="post-detail-shell">
            <div className="post-detail-topbar">
              <button onClick={() => navigate(-1)} className="post-detail-back-button" type="button">
                {t('postGoBack')}
              </button>
              <button onClick={() => navigate('/posts')} className="post-detail-ghost-button" type="button">
                {t('postBackToFeed')}
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
                        {t('profileFollowers')} {followCounts.followerCount || 0}
                      </button>
                      <button
                        type="button"
                        className="post-detail-follow-stat"
                        onClick={() => fetchFollowUsers('followings')}
                      >
                        {t('profileFollowing')} {followCounts.followingCount || 0}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="post-detail-actions">
                  <button
                    onClick={handleToggleBookmark}
                    className={`post-detail-action-button ${isBookmarked ? 'saved' : ''}`}
                    type="button"
                    disabled={isBookmarkLoading}
                  >
                    {isBookmarkLoading ? t('postSaving') : isBookmarked ? t('postSaved') : t('postSave')}
                  </button>

                  {canFollow && (
                    <button
                      onClick={handleToggleFollow}
                      className={`post-detail-action-button accent ${isFollowing ? 'following' : ''}`}
                      type="button"
                      disabled={isFollowLoading}
                    >
                      {isFollowLoading ? t('postWorking') : isFollowing ? t('postFollowing') : t('postFollow')}
                    </button>
                  )}

                  {canStartDm && (
                    <button onClick={handleStartDm} className="post-detail-action-button" type="button">
                      {t('postMessage')}
                    </button>
                  )}

                  {isOwner && (
                    <button onClick={handleDelete} className="post-detail-action-button danger" type="button">
                      {t('postDelete')}
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
                      <img src={image.imageUrl || image.url} alt={`Post image ${index + 1}`} />
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
                  {t('postLike')} {post.likeCount || 0}
                </button>
                <span className="post-detail-stat">{t('postComments')} {post.commentCount || 0}</span>
                <span className="post-detail-stat">{t('postViews')} {post.viewCount || 0}</span>
              </div>
            </article>

            <section className="post-detail-comments-card">
              <div className="post-detail-comments-header">
                <div>
                  <span className="post-detail-comments-kicker">{t('postThread')}</span>
                  <h2>{t('postCommentsHeading')}</h2>
                </div>
                <span className="post-detail-stat">{comments.length}{t('postLoadedCountSuffix')}</span>
              </div>

              <form className="post-detail-comment-form" onSubmit={handleSubmitComment}>
                <textarea
                  value={commentInput}
                  onChange={(event) => setCommentInput(event.target.value)}
                  placeholder={isAuthenticated ? t('postCommentPlaceholder') : t('postCommentLoginHint')}
                  disabled={!isAuthenticated || commentSubmitting}
                />
                <div className="post-detail-comment-form-footer">
                  <span>{isAuthenticated ? t('postReplyDepthHint') : t('postCommentLoginHint')}</span>
                  <button type="submit" disabled={!isAuthenticated || commentSubmitting || !commentInput.trim()}>
                    {commentSubmitting ? t('postPosting') : t('postCommentButton')}
                  </button>
                </div>
              </form>

              <div className="post-detail-comment-list">
                {isCommentsLoading ? (
                  <div className="post-detail-comment-empty">{t('postCommentsLoading')}</div>
                ) : comments.length === 0 ? (
                  <div className="post-detail-comment-empty">{t('postNoComments')}</div>
                ) : (
                  comments.map((comment) => (
                    <article key={comment.id} className="post-detail-comment-card">
                      <div className="post-detail-comment-head">
                        <div className="post-detail-comment-author">
                          {comment.author?.profileImage ? (
                            <img
                              src={comment.author.profileImage}
                              alt={comment.author?.name || t('cardUnknown')}
                              className="post-detail-comment-avatar"
                            />
                          ) : (
                            <div className="post-detail-comment-avatar placeholder">
                              {(comment.author?.name || 'U').charAt(0)}
                            </div>
                          )}
                          <div>
                            <strong>{comment.author?.name || t('cardUnknown')}</strong>
                            <span>{formatDate(comment.createdAt)}</span>
                          </div>
                        </div>
                        <div className="post-detail-comment-meta">
                          <span>{`${t('postReplies')} ${comment.replyCount || comment.replies?.length || 0}`}</span>
                          <span>{`${t('postLikes')} ${comment.likeCount || 0}`}</span>
                        </div>
                      </div>

                      <p className="post-detail-comment-body">
                        {comment.isDeleted ? t('postDeletedComment') : comment.content}
                      </p>

                      <div className="post-detail-comment-actions">
                        <button type="button" onClick={() => handleToggleReplies(comment)}>
                          {replyOpenMap[comment.id] ? t('postHideReplies') : t('postViewReplies')}
                        </button>
                        {isAuthenticated && !comment.isDeleted && (
                          <button
                            type="button"
                            onClick={() => setReplyOpenMap((prev) => ({ ...prev, [comment.id]: true }))}
                          >
                            {t('postReply')}
                          </button>
                        )}
                        {isOwnedComment(comment.author) && !comment.isDeleted && (
                          <button
                            type="button"
                            className="post-detail-comment-delete"
                            onClick={() => handleDeleteComment(comment.id)}
                            disabled={deletingCommentIds.includes(comment.id)}
                          >
                            {deletingCommentIds.includes(comment.id)
                              ? t('postWorking')
                              : t('postDelete', '삭제')}
                          </button>
                        )}
                      </div>

                      {replyOpenMap[comment.id] && (
                        <div className="post-detail-reply-section">
                          {replyLoadingMap[comment.id] && !replyLoadedMap[comment.id] ? (
                            <div className="post-detail-reply-empty">{t('postRepliesLoading')}</div>
                          ) : (
                            <div className="post-detail-reply-list">
                              {(comment.replies || []).length === 0 ? (
                                <div className="post-detail-reply-empty">{t('postNoReplies')}</div>
                              ) : (
                                (comment.replies || []).map((reply) => (
                                  <div key={reply.id} className="post-detail-reply-card">
                                    <div className="post-detail-comment-author">
                                      {reply.author?.profileImage ? (
                                        <img
                                          src={reply.author.profileImage}
                                          alt={reply.author?.name || t('cardUnknown')}
                                          className="post-detail-comment-avatar"
                                        />
                                      ) : (
                                        <div className="post-detail-comment-avatar placeholder">
                                          {(reply.author?.name || 'U').charAt(0)}
                                        </div>
                                      )}
                                      <div>
                                        <strong>{reply.author?.name || t('cardUnknown')}</strong>
                                        <span>{formatDate(reply.createdAt)}</span>
                                      </div>
                                    </div>
                                    <p className="post-detail-comment-body">
                                      {reply.isDeleted ? t('postDeletedReply') : reply.content}
                                    </p>
                                    {isOwnedComment(reply.author) && !reply.isDeleted && (
                                      <div className="post-detail-comment-actions reply">
                                        <button
                                          type="button"
                                          className="post-detail-comment-delete"
                                          onClick={() => handleDeleteComment(reply.id)}
                                          disabled={deletingCommentIds.includes(reply.id)}
                                        >
                                          {deletingCommentIds.includes(reply.id)
                                            ? t('postWorking')
                                            : t('postDelete', '삭제')}
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                ))
                              )}
                            </div>
                          )}

                          {isAuthenticated && !comment.isDeleted && (
                            <div className="post-detail-reply-form">
                              <input
                                type="text"
                                value={replyInputs[comment.id] || ''}
                                onChange={(event) => setReplyInputs((prev) => ({
                                  ...prev,
                                  [comment.id]: event.target.value,
                                }))}
                                placeholder={t('postReplyPlaceholder')}
                              />
                              <button
                                type="button"
                                disabled={replyLoadingMap[comment.id] || !(replyInputs[comment.id] || '').trim()}
                                onClick={() => handleSubmitReply(comment.id)}
                              >
                                {replyLoadingMap[comment.id] ? t('postPosting') : t('postReply')}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </article>
                  ))
                )}
              </div>
            </section>
          </div>
        ) : null}
      </div>

      {followModalType && (
        <div className="follow-modal-overlay" onClick={() => setFollowModalType(null)}>
          <div className="follow-modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="follow-modal-header">
              <h3>{followModalType === 'followers' ? t('profileFollowers') : t('profileFollowing')}</h3>
              <button
                type="button"
                className="follow-modal-close"
                onClick={() => setFollowModalType(null)}
              >
                {t('profileModalClose')}
              </button>
            </div>

            <div className="follow-modal-body">
              {isFollowListLoading ? (
                <div className="follow-modal-empty">{t('profileLoadingShort')}</div>
              ) : followUsers.length === 0 ? (
                <div className="follow-modal-empty">{t('profileNoUsers')}</div>
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
                          {followUser.isFollowing ? t('postFollowing') : t('postFollow')}
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

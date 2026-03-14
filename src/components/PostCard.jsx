import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../hooks/useLanguage'

function PostCard({
  post,
  isAuthenticated,
  currentUserId,
  isLiking,
  isBookmarked = false,
  isBookmarkLoading = false,
  onToggleLike,
  onToggleBookmark,
  isFollowingAuthor = false,
  isFollowLoading = false,
  onToggleFollow,
}) {
  const navigate = useNavigate()
  const { language, t } = useLanguage()

  const formatTime = (dateString) => {
    if (!dateString) return ''

    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now - date
    const diffMin = Math.floor(diffMs / 60000)
    const diffHour = Math.floor(diffMin / 60)
    const diffDay = Math.floor(diffHour / 24)

    if (diffMin < 1) return t('cardJustNow')
    if (diffMin < 60) return `${diffMin}${t('cardMinAgoSuffix')}`
    if (diffHour < 24) return `${diffHour}${t('cardHourAgoSuffix')}`
    if (diffDay < 7) return `${diffDay}${t('cardDayAgoSuffix')}`

    return date.toLocaleDateString(language === 'ko' ? 'ko-KR' : 'en-US')
  }

  const previewContent = post.content?.length > 150
    ? `${post.content.substring(0, 150)}...`
    : post.content

  const authorName = post.author?.name || post.userName || t('cardUnknown')
  const authorImage = post.author?.profileImage || post.userProfileImage || null
  const authorId = post.author?.id || post.userId
  const postId = post.id || post.postId
  const canStartDm = isAuthenticated && authorId && String(authorId) !== String(currentUserId)
  const imageCount = post.imageCount || post.images?.length || 0
  const authorHandle = authorName.replace(/\s+/g, '').toLowerCase() || 'user'

  const handleMoveToDetail = () => {
    if (!postId) {
      return
    }

    navigate(`/posts/${postId}`)
  }

  const stopEvent = (event) => {
    event.preventDefault()
    event.stopPropagation()
  }

  const handleLikeClick = (event) => {
    stopEvent(event)

    if (onToggleLike && postId) {
      onToggleLike(postId, !!post.liked)
    }
  }

  const handleBookmarkClick = (event) => {
    stopEvent(event)

    if (onToggleBookmark && postId) {
      onToggleBookmark(postId, isBookmarked)
    }
  }

  const handleStartDm = (event) => {
    stopEvent(event)
    navigate(`/dm?userId=${authorId}&name=${encodeURIComponent(authorName)}`)
  }

  const handleToggleFollow = (event) => {
    stopEvent(event)

    if (onToggleFollow && authorId) {
      onToggleFollow(authorId, isFollowingAuthor)
    }
  }

  const visibilityIcon = post.visibility === 'PRIVATE'
    ? '🔒'
    : post.visibility === 'FOLLOWERS_ONLY'
      ? '👥'
      : '🔓'

  return (
    <article
      className="post-card"
      onClick={handleMoveToDetail}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          handleMoveToDetail()
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="post-card-header">
        <div className="post-card-author">
          {authorImage ? (
            <img src={authorImage} alt={authorName} className="post-card-avatar" />
          ) : (
            <div className="post-card-avatar-placeholder">
              {authorName.charAt(0)}
            </div>
          )}
          <div className="post-card-author-meta">
            <span className="post-card-author-name">{authorName}</span>
            <span className="post-card-author-handle">@{authorHandle}</span>
          </div>
        </div>
        <div className="post-card-header-side">
          <span className="post-card-time">{formatTime(post.createdAt)}</span>
          <span className="post-card-visibility-badge" title={post.visibility || 'PUBLIC'}>
            {visibilityIcon}
          </span>
        </div>
      </div>

      <div className="post-card-content">
        <p>{previewContent}</p>
      </div>

      {(post.thumbnailUrl || (post.images && post.images.length > 0)) && (
        <div className="post-card-thumbnail">
          <img
            src={post.thumbnailUrl || post.images[0]?.imageUrl || post.images[0]?.thumbnailUrl}
            alt={t('homeOpenPostDetails')}
          />
          {(post.imageCount > 1 || (post.images && post.images.length > 1)) && (
            <span className="post-card-image-count">
              +{(post.imageCount || post.images?.length) - 1}
            </span>
          )}
        </div>
      )}

      <div className="post-card-footer">
        <div className="post-card-actions">
          <button
            type="button"
            className={`post-card-like-button ${post.liked ? 'liked' : ''}`}
            onClick={handleLikeClick}
            disabled={isLiking}
            aria-pressed={!!post.liked}
            aria-label={isAuthenticated ? t('cardToggleLike') : t('cardLoginLike')}
          >
            {`${t('postLike')} ${post.likeCount || 0}`}
          </button>
          <button
            type="button"
            className={`post-card-bookmark-button ${isBookmarked ? 'active' : ''}`}
            onClick={handleBookmarkClick}
            disabled={isBookmarkLoading}
          >
            {isBookmarkLoading ? t('cardSaving') : isBookmarked ? t('cardSaved') : t('cardSave')}
          </button>
          {canStartDm && (
            <button
              type="button"
              className={`post-card-follow-button ${isFollowingAuthor ? 'following' : ''}`}
              onClick={handleToggleFollow}
              disabled={isFollowLoading}
            >
              {isFollowLoading ? t('cardWorking') : isFollowingAuthor ? t('cardFollowing') : t('cardFollow')}
            </button>
          )}
          {canStartDm && (
            <button
              type="button"
              className="post-card-message-button"
              onClick={handleStartDm}
            >
              {t('cardMessage')}
            </button>
          )}
        </div>
        <span className="post-card-stat">{`${t('postComments')} ${post.commentCount || 0}`}</span>
        <span className="post-card-stat">{`${t('postViews')} ${post.viewCount || 0}`}</span>
      </div>
    </article>
  )
}

export default PostCard

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
  canDelete = false,
  isFollowingAuthor = false,
  isFollowLoading = false,
  onDeletePost,
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
  const authorHandle = authorName.replace(/\s+/g, '').toLowerCase() || 'user'
  const followerCount = post.author?.followerCount || post.followerCount || 0
  const followingCount = post.author?.followingCount || post.followingCount || 0

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

  const handleOpenComments = (event) => {
    stopEvent(event)
    handleMoveToDetail()
  }

  const handleShare = async (event) => {
    stopEvent(event)

    if (!postId) {
      return
    }

    const shareUrl = `${window.location.origin}/posts/${postId}`

    try {
      if (navigator.share) {
        await navigator.share({
          title: authorName,
          text: previewContent || '',
          url: shareUrl,
        })
        return
      }

      await navigator.clipboard.writeText(shareUrl)
      alert(t('postLinkCopied', '\ub9c1\ud06c\ub97c \ubcf5\uc0ac\ud588\uc2b5\ub2c8\ub2e4.'))
    } catch (error) {
      console.error('Share failed:', error)
    }
  }

  const handleDeletePost = (event) => {
    stopEvent(event)

    if (onDeletePost && postId) {
      onDeletePost(postId)
    }
  }

  const visibilityIcon = post.visibility === 'PRIVATE'
    ? '🔒︎'
    : post.visibility === 'FOLLOWERS_ONLY'
      ? '🔐︎'
      : '🔓︎'

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
        <div className="post-card-author post-card-author-hoverable">
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

          <div className="post-card-profile-popover">
            <div className="post-card-profile-top">
              {authorImage ? (
                <img src={authorImage} alt={authorName} className="post-card-profile-avatar" />
              ) : (
                <div className="post-card-profile-avatar placeholder">{authorName.charAt(0)}</div>
              )}
              <div className="post-card-profile-copy">
                <strong>{authorName}</strong>
                <span>@{authorHandle}</span>
              </div>
            </div>
            <div className="post-card-profile-stats">
              <span>{t('profileFollowers')} {followerCount}</span>
              <span>{t('profileFollowing')} {followingCount}</span>
            </div>
            <div className="post-card-profile-actions">
              {canStartDm && (
                <>
                  <button
                    type="button"
                    className={`post-card-inline-chip ${isFollowingAuthor ? 'active' : ''}`}
                    onClick={handleToggleFollow}
                    disabled={isFollowLoading}
                  >
                    {isFollowLoading ? t('cardWorking') : isFollowingAuthor ? t('cardFollowing') : t('cardFollow')}
                  </button>
                  <button
                    type="button"
                    className="post-card-inline-chip"
                    onClick={handleStartDm}
                  >
                    {t('cardMessage')}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="post-card-header-side">
          <span className="post-card-time">{formatTime(post.createdAt)}</span>
          <div className="post-card-inline-tools">
            <span
              className="post-card-inline-lock"
              title={post.visibility || 'PUBLIC'}
            >
              {visibilityIcon}
            </span>
            {canDelete && (
              <button
                type="button"
                className="post-card-inline-chip delete"
                onClick={handleDeletePost}
              >
                {t('postDelete', '\uc0ad\uc81c')}
              </button>
            )}
            {canStartDm && (
              <>
                <button
                  type="button"
                  className={`post-card-inline-chip ${isFollowingAuthor ? 'active' : ''}`}
                  onClick={handleToggleFollow}
                  disabled={isFollowLoading}
                >
                  {isFollowLoading ? t('cardWorking') : isFollowingAuthor ? t('cardFollowing') : t('cardFollow')}
                </button>
                <button
                  type="button"
                  className="post-card-inline-chip"
                  onClick={handleStartDm}
                >
                  {t('cardMessage')}
                </button>
              </>
            )}
          </div>
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
        <button
          type="button"
          className="post-card-metric"
          onClick={handleOpenComments}
        >
          <span className="post-card-metric-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M4 5.5A3.5 3.5 0 0 1 7.5 2h9A3.5 3.5 0 0 1 20 5.5v6A3.5 3.5 0 0 1 16.5 15H10l-4.5 4v-4.5A3.5 3.5 0 0 1 4 11.5z" />
            </svg>
          </span>
          <span className="post-card-metric-value">{post.commentCount || 0}</span>
        </button>

        <button
          type="button"
          className={`post-card-metric ${post.liked ? 'liked' : ''}`}
          onClick={handleLikeClick}
          disabled={isLiking}
          aria-pressed={!!post.liked}
          aria-label={isAuthenticated ? t('cardToggleLike') : t('cardLoginLike')}
        >
          <span className="post-card-metric-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M12 21s-6.7-4.35-9.2-8.15A5.26 5.26 0 0 1 7.2 4.7c1.82 0 3.1.96 4.03 2.16C12.16 5.66 13.44 4.7 15.26 4.7a5.26 5.26 0 0 1 4.4 8.15C18.7 14.39 17 16.16 15 17.8 13.78 18.8 12.56 19.67 12 21Z" />
            </svg>
          </span>
          <span className="post-card-metric-value">{post.likeCount || 0}</span>
        </button>

        <span className="post-card-metric stat-only">
          <span className="post-card-metric-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M4 18h2V9H4zm5 0h2V5H9zm5 0h2v-7h-2zm5 0h2V3h-2z" />
            </svg>
          </span>
          <span className="post-card-metric-value">{post.viewCount || 0}</span>
        </span>

        <button
          type="button"
          className={`post-card-metric icon-only ${isBookmarked ? 'saved' : ''}`}
          onClick={handleBookmarkClick}
          disabled={isBookmarkLoading}
        >
          <span className="post-card-metric-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M6 4.5A2.5 2.5 0 0 1 8.5 2h7A2.5 2.5 0 0 1 18 4.5V22l-6-4-6 4z" />
            </svg>
          </span>
        </button>

        <button
          type="button"
          className="post-card-metric icon-only"
          onClick={handleShare}
        >
          <span className="post-card-metric-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M13 5.5 18.5 11 17 12.5 14 9.56V18h-2V9.56l-3 2.94L7.5 11z" />
              <path d="M5 14.5h2V18h10v-3.5h2V18A2 2 0 0 1 17 20H7a2 2 0 0 1-2-2z" />
            </svg>
          </span>
        </button>
      </div>
    </article>
  )
}

export default PostCard

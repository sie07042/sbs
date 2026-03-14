import { useNavigate } from 'react-router-dom'

function PostCard({
  post,
  isAuthenticated,
  currentUserId,
  isLiking,
  onToggleLike,
  isFollowingAuthor = false,
  isFollowLoading = false,
  onToggleFollow,
}) {
  const navigate = useNavigate()

  const formatTime = (dateString) => {
    if (!dateString) return ''

    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now - date
    const diffMin = Math.floor(diffMs / 60000)
    const diffHour = Math.floor(diffMin / 60)
    const diffDay = Math.floor(diffHour / 24)

    if (diffMin < 1) return 'Just now'
    if (diffMin < 60) return `${diffMin}m ago`
    if (diffHour < 24) return `${diffHour}h ago`
    if (diffDay < 7) return `${diffDay}d ago`
    return date.toLocaleDateString('ko-KR')
  }

  const previewContent = post.content?.length > 150
    ? `${post.content.substring(0, 150)}...`
    : post.content

  const authorName = post.author?.name || post.userName || 'Unknown'
  const authorImage = post.author?.profileImage || post.userProfileImage || null
  const authorId = post.author?.id || post.userId
  const canStartDm = isAuthenticated && authorId && String(authorId) !== String(currentUserId)
  const imageCount = post.imageCount || post.images?.length || 0
  const authorHandle = authorName.replace(/\s+/g, '').toLowerCase() || 'user'

  const handleMoveToDetail = () => {
    navigate(`/posts/${post.id}`)
  }

  const handleLikeClick = (event) => {
    event.preventDefault()
    event.stopPropagation()

    if (onToggleLike) {
      onToggleLike(post.id, !!post.liked)
    }
  }

  const handleStartDm = (event) => {
    event.preventDefault()
    event.stopPropagation()

    navigate(`/dm?userId=${authorId}&name=${encodeURIComponent(authorName)}`)
  }

  const handleToggleFollow = (event) => {
    event.preventDefault()
    event.stopPropagation()

    if (onToggleFollow && authorId) {
      onToggleFollow(authorId, isFollowingAuthor)
    }
  }

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
        <span className="post-card-time">{formatTime(post.createdAt)}</span>
      </div>

      <div className="post-card-content">
        <p>{previewContent}</p>
      </div>

      <div className="post-card-tags">
        <span className="post-card-chip">{post.visibility || 'PUBLIC'}</span>
        {imageCount > 0 && (
          <span className="post-card-chip">{`${imageCount} photo${imageCount > 1 ? 's' : ''}`}</span>
        )}
      </div>

      {(post.thumbnailUrl || (post.images && post.images.length > 0)) && (
        <div className="post-card-thumbnail">
          <img
            src={post.thumbnailUrl || post.images[0]?.imageUrl || post.images[0]?.thumbnailUrl}
            alt="Post image"
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
            aria-label={isAuthenticated ? 'Toggle like' : 'Login required to like'}
          >
            {`Like ${post.likeCount || 0}`}
          </button>
          {canStartDm && (
            <button
              type="button"
              className={`post-card-follow-button ${isFollowingAuthor ? 'following' : ''}`}
              onClick={handleToggleFollow}
              disabled={isFollowLoading}
            >
              {isFollowLoading ? 'Saving...' : isFollowingAuthor ? 'Following' : 'Follow'}
            </button>
          )}
          {canStartDm && (
            <button
              type="button"
              className="post-card-message-button"
              onClick={handleStartDm}
            >
              Message
            </button>
          )}
        </div>
        <span className="post-card-stat">{`Comments ${post.commentCount || 0}`}</span>
        <span className="post-card-stat">{`Views ${post.viewCount || 0}`}</span>
      </div>
    </article>
  )
}

export default PostCard

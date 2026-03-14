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

    if (diffMin < 1) return '방금 전'
    if (diffMin < 60) return `${diffMin}분 전`
    if (diffHour < 24) return `${diffHour}시간 전`
    if (diffDay < 7) return `${diffDay}일 전`
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
        <span className="post-card-chip">
          {post.visibility === 'FOLLOWERS_ONLY'
            ? '팔로워 공개'
            : post.visibility === 'PRIVATE'
              ? '비공개'
              : '전체 공개'}
        </span>
        {imageCount > 0 && (
          <span className="post-card-chip">{`사진 ${imageCount}장`}</span>
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
            aria-label={isAuthenticated ? '좋아요 토글' : '좋아요는 로그인 후 사용할 수 있습니다'}
          >
            {`좋아요 ${post.likeCount || 0}`}
          </button>
          {canStartDm && (
            <button
              type="button"
              className={`post-card-follow-button ${isFollowingAuthor ? 'following' : ''}`}
              onClick={handleToggleFollow}
              disabled={isFollowLoading}
            >
              {isFollowLoading ? '처리 중...' : isFollowingAuthor ? '팔로잉' : '팔로우'}
            </button>
          )}
          {canStartDm && (
            <button
              type="button"
              className="post-card-message-button"
              onClick={handleStartDm}
            >
              메시지
            </button>
          )}
        </div>
        <span className="post-card-stat">{`댓글 ${post.commentCount || 0}`}</span>
        <span className="post-card-stat">{`조회 ${post.viewCount || 0}`}</span>
      </div>
    </article>
  )
}

export default PostCard

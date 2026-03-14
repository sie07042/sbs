import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

import GNB from '../components/Gnb'
import Footer from '../components/Footer'
import { useAuth } from '../hooks/useAuth'
import { usePostForm } from '../hooks/usePostForm'
import './PostCreate.css'

const VISIBILITY_OPTIONS = [
  { value: 'PUBLIC', label: '전체 공개', hint: '누구나 이 게시글을 볼 수 있어요.' },
  { value: 'PRIVATE', label: '비공개', hint: '나만 볼 수 있는 개인 메모예요.' },
  { value: 'FOLLOWERS', label: '팔로워 공개', hint: '나를 팔로우하는 사람에게만 보여요.' },
]

function PostCreate() {
  const navigate = useNavigate()
  const { user, accessToken, isAuthenticated } = useAuth()
  const {
    content,
    visibility,
    previewImages,
    errors,
    isLoading,
    setContent,
    setVisibility,
    handleImageSelect,
    removeImage,
    submitPost,
  } = usePostForm(accessToken)

  const selectedVisibility = useMemo(
    () => VISIBILITY_OPTIONS.find((option) => option.value === visibility) || VISIBILITY_OPTIONS[0],
    [visibility]
  )

  const handleSubmit = async (event) => {
    event.preventDefault()

    try {
      const success = await submitPost()

      if (success) {
        alert('게시글이 작성되었어요.')
        navigate('/posts')
      }
    } catch (error) {
      console.error('Post create failed:', error)
      alert('게시글 작성에 실패했어요. 잠시 후 다시 시도해주세요.')
    }
  }

  const handleFileChange = (event) => {
    if (event.target.files && event.target.files.length > 0) {
      handleImageSelect(event.target.files)
      event.target.value = ''
    }
  }

  if (!isAuthenticated) {
    return (
      <>
        <GNB />
        <div className="post-create-page">
          <div className="post-create-modal post-create-modal-locked">
            <h1>게시글 작성</h1>
            <p className="post-create-auth-message">
              게시글을 작성하려면 먼저 로그인해 주세요.
            </p>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  return (
    <>
      <GNB />
      <div className="post-create-page">
        <div className="post-create-backdrop" />
        <div className="post-create-modal">
          <div className="post-create-topbar">
            <button type="button" className="post-create-close" onClick={() => navigate('/posts')}>
              닫기
            </button>
            <span className="post-create-draft">초안</span>
          </div>

          <form onSubmit={handleSubmit} className="post-create-form">
            <div className="post-create-main">
              <div className="post-create-author">
                <div className="post-create-avatar">
                  {user?.profileImage ? (
                    <img src={user.profileImage} alt={user?.name || '사용자'} />
                  ) : (
                    <span>{(user?.name || 'U').charAt(0)}</span>
                  )}
                </div>
              </div>

              <div className="post-create-body">
                <div className="post-create-header">
                  <strong>{user?.name || '사용자'}</strong>
                  <span>{selectedVisibility.label}</span>
                </div>

                <textarea
                  id="content"
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  placeholder="무슨 일이 일어나고 있나요?"
                  rows={6}
                  maxLength={5000}
                  className={errors.content ? 'error' : ''}
                />

                <div className="post-create-meta">
                  <span className="post-create-hint">{selectedVisibility.hint}</span>
                  <span className={`post-create-count ${content.length > 4500 ? 'warning' : ''}`}>
                    {content.length} / 5000
                  </span>
                </div>

                {errors.content && (
                  <p className="post-create-error">{errors.content}</p>
                )}

                {previewImages.length > 0 && (
                  <div className="post-create-preview-grid">
                    {previewImages.map((src, index) => (
                      <div key={index} className="post-create-preview-item">
                        <img src={src} alt={`미리보기 ${index + 1}`} />
                        <button
                          type="button"
                          className="post-create-remove-image"
                          onClick={() => removeImage(index)}
                        >
                          삭제
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="post-create-toolbar">
              <div className="post-create-tools">
                <label className="post-create-tool-button" htmlFor="image-input">
                  사진 추가
                </label>
                <input
                  id="image-input"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                  hidden
                />

                <div className="post-create-visibility">
                  <label htmlFor="visibility">공개 범위</label>
                  <select
                    id="visibility"
                    value={visibility}
                    onChange={(event) => setVisibility(event.target.value)}
                  >
                    {VISIBILITY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="post-create-actions">
                <button
                  type="button"
                  className="post-create-secondary"
                  onClick={() => navigate('/posts')}
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="post-create-submit"
                  disabled={isLoading || !content.trim()}
                >
                  {isLoading ? '게시 중...' : '게시하기'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
      <Footer />
    </>
  )
}

export default PostCreate

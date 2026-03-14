import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

import GNB from '../components/Gnb'
import Footer from '../components/Footer'
import PostCard from '../components/PostCard'
import ProfileImageSection from '../components/ProfileImageSection'
import { useAuth } from '../hooks/useAuth'
import { useLanguage } from '../hooks/useLanguage'
import { useProfileForm } from '../hooks/useProfileForm'
import './Profile.css'

function Profile() {
  const navigate = useNavigate()
  const { user, isAuthenticated, accessToken, updateUser } = useAuth()
  const { t, setLanguageByCountry } = useLanguage()
  const {
    formData,
    errors,
    isLoading,
    isLoadingProfile,
    previewImage,
    previewBackground,
    handleChange,
    handleImageSelect,
    submitProfile,
  } = useProfileForm(accessToken)

  const [followCounts, setFollowCounts] = useState({ followerCount: 0, followingCount: 0 })
  const [followModalType, setFollowModalType] = useState(null)
  const [followUsers, setFollowUsers] = useState([])
  const [isFollowListLoading, setIsFollowListLoading] = useState(false)
  const [followLoadingIds, setFollowLoadingIds] = useState([])
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [timelinePosts, setTimelinePosts] = useState([])
  const [isTimelineLoading, setIsTimelineLoading] = useState(true)
  const [timelineError, setTimelineError] = useState('')

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login')
    }
  }, [isAuthenticated, navigate])

  useEffect(() => {
    if (formData.country) {
      setLanguageByCountry(formData.country)
    }
  }, [formData.country, setLanguageByCountry])

  useEffect(() => {
    const fetchFollowCounts = async () => {
      if (!user?.id) {
        return
      }

      try {
        const response = await axios.get(`/api/users/${user.id}/follow/count`, {
          headers: accessToken
            ? { Authorization: `Bearer ${accessToken}` }
            : undefined,
          withCredentials: true,
        })

        setFollowCounts(response.data?.data || { followerCount: 0, followingCount: 0 })
      } catch (error) {
        console.error('Failed to load profile follow counts:', error)
      }
    }

    fetchFollowCounts()
  }, [accessToken, user?.id])

  useEffect(() => {
    const fetchTimelinePosts = async () => {
      if (!user?.id) {
        setTimelinePosts([])
        setIsTimelineLoading(false)
        return
      }

      try {
        setIsTimelineLoading(true)
        setTimelineError('')

        const response = await axios.get(`/api/posts/user/${user.id}?page=0&size=20`, {
          headers: accessToken
            ? { Authorization: `Bearer ${accessToken}` }
            : undefined,
          withCredentials: true,
        })

        const content = Array.isArray(response.data?.data)
          ? response.data.data
          : response.data?.data?.content || []

        setTimelinePosts(content)
      } catch (error) {
        console.error('Failed to load profile timeline:', error)
        setTimelineError(t('profileTimelineLoadFailed', '타임라인을 불러오지 못했습니다.'))
        setTimelinePosts([])
      } finally {
        setIsTimelineLoading(false)
      }
    }

    fetchTimelinePosts()
  }, [accessToken, t, user?.id])

  const profileTitle = useMemo(
    () => formData.name?.trim() || user?.name || t('profileMyProfile'),
    [formData.name, t, user?.name]
  )

  const countryOptions = useMemo(() => ([
    { value: '1', label: t('country1') },
    { value: '2', label: t('country2') },
    { value: '3', label: t('country3') },
    { value: '4', label: t('country4') },
    { value: '5', label: t('country5') },
  ]), [t])

  const fetchFollowUsers = async (type) => {
    if (!user?.id) {
      return
    }

    try {
      setIsFollowListLoading(true)

      const response = await axios.get(`/api/users/${user.id}/${type}?page=0&size=30`, {
        headers: accessToken
          ? { Authorization: `Bearer ${accessToken}` }
          : undefined,
        withCredentials: true,
      })

      setFollowUsers(response.data?.data?.content || [])
      setFollowModalType(type)
    } catch (error) {
      console.error(`Failed to load ${type}:`, error)
      alert(error.response?.data?.message || t('profileFollowLoadFailed'))
    } finally {
      setIsFollowListLoading(false)
    }
  }

  const handleToggleFollowUser = async (targetUserId, currentlyFollowing) => {
    if (!accessToken) {
      alert(t('profileFollowUpdateLogin'))
      return
    }

    setFollowLoadingIds((prev) => [...prev, targetUserId])

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
    } catch (error) {
      console.error('Failed to update follow status from profile:', error)
      alert(error.response?.data?.message || t('postFollowFailed'))
    } finally {
      setFollowLoadingIds((prev) => prev.filter((id) => id !== targetUserId))
    }
  }

  const handleSaveProfile = async () => {
    try {
      const result = await submitProfile()

      if (!result?.success) {
        alert(t('profileUpdateFailed'))
        return
      }

      updateUser({
        ...user,
        ...result.user,
        name: result.user?.name || formData.name,
        profileImage: result.user?.profileImage || result.user?.profileImageUrl || previewImage || user?.profileImage,
        bgImage: result.user?.bgImage || previewBackground || user?.bgImage,
      })

      alert(t('profileUpdated'))
      setIsEditModalOpen(false)
    } catch (error) {
      const message = error.response?.data?.message || t('profileUpdateError')
      alert(message)
    }
  }

  const handleDeletePost = async (postId) => {
    if (!accessToken || !postId) {
      return
    }

    if (!window.confirm(t('postDeleteConfirm'))) {
      return
    }

    try {
      await axios.delete(`/api/posts/${postId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        withCredentials: true,
      })

      setTimelinePosts((prev) => prev.filter((post) => String(post.id || post.postId) !== String(postId)))
    } catch (error) {
      console.error('Failed to delete profile timeline post:', error)
      alert(error.response?.data?.message || t('postDeleteFailed'))
    }
  }

  if (!isAuthenticated) {
    return null
  }

  if (isLoadingProfile) {
    return (
      <>
        <GNB />
        <div className="profile-container">
          <div className="profile-card">
            <h1>{t('profileEdit')}</h1>
            <div className="profile-loading">
              <p>{t('profileLoading')}</p>
            </div>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  return (
    <>
      <GNB />
      <div className="profile-container">
        <div className="profile-card profile-card-modern">
          <section className="profile-summary-panel">
            <div className="profile-summary-copy">
              <span className="profile-summary-eyebrow">{t('profileStudio')}</span>
              <h1>{profileTitle}</h1>
              <p>{t('profileDescription')}</p>
              <div className="profile-summary-actions">
                <button
                  type="button"
                  className="profile-action-button primary"
                  onClick={() => setIsEditModalOpen(true)}
                >
                  {t('profileEdit')}
                </button>
                <button
                  type="button"
                  className="profile-action-button"
                  onClick={handleSaveProfile}
                  disabled={isLoading}
                >
                  {isLoading ? t('profileSaving') : t('profileSave')}
                </button>
              </div>
            </div>

            <div className="profile-summary-meta">
              <div className="profile-summary-user">
                <div
                  className="profile-summary-avatar"
                  style={previewImage ? { backgroundImage: `url(${previewImage})` } : undefined}
                >
                  {!previewImage && <span>{profileTitle.charAt(0)}</span>}
                </div>
                <div className="profile-summary-user-copy">
                  <strong>{profileTitle}</strong>
                  <span>{user?.email}</span>
                </div>
              </div>

              <div className="profile-summary-stats">
                <button
                  type="button"
                  className="profile-summary-stat"
                  onClick={() => fetchFollowUsers('followers')}
                >
                  <strong>{followCounts.followerCount || 0}</strong>
                  <span>{t('profileFollowers')}</span>
                </button>
                <button
                  type="button"
                  className="profile-summary-stat"
                  onClick={() => fetchFollowUsers('followings')}
                >
                  <strong>{followCounts.followingCount || 0}</strong>
                  <span>{t('profileFollowing')}</span>
                </button>
              </div>
            </div>
          </section>

          <section className="profile-media-panel">
            <div className="profile-panel-header">
              <div>
                <span className="profile-panel-kicker">MEDIA</span>
                <h2>Profile visuals</h2>
              </div>
              <p>배경 이미지와 프로필 사진을 한 곳에서 바꿀 수 있어요.</p>
            </div>
            <ProfileImageSection
              previewImage={previewImage}
              previewBackground={previewBackground}
              onImageSelect={handleImageSelect}
            />
          </section>

          <section className="profile-timeline-panel">
            <div className="profile-panel-header">
              <div>
                <span className="profile-panel-kicker">TIMELINE</span>
                <h2>{t('profileTimelineTitle', '내 타임라인')}</h2>
              </div>
              <p>{t('profileTimelineHint', '공개 범위와 상관없이 내 피드에서는 모든 게시글이 보입니다.')}</p>
            </div>

            {isTimelineLoading ? (
              <div className="profile-timeline-state">{t('profileTimelineLoading', '타임라인을 불러오는 중입니다.')}</div>
            ) : timelineError ? (
              <div className="profile-timeline-state error">{timelineError}</div>
            ) : timelinePosts.length === 0 ? (
              <div className="profile-timeline-state">{t('profileTimelineEmpty', '아직 작성한 게시글이 없습니다.')}</div>
            ) : (
              <div className="profile-timeline-list">
                {timelinePosts.map((post) => {
                  const postId = post.id || post.postId

                  if (!postId) {
                    return null
                  }

                  return (
                    <PostCard
                      key={postId}
                      post={post}
                      isAuthenticated={isAuthenticated}
                      currentUserId={user?.id}
                      canDelete
                      onDeletePost={handleDeletePost}
                    />
                  )
                })}
              </div>
            )}
          </section>
        </div>
      </div>

      {isEditModalOpen && (
        <div className="profile-edit-modal-overlay" onClick={() => setIsEditModalOpen(false)}>
          <div className="profile-edit-modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="profile-edit-modal-header">
              <div>
                <span className="profile-panel-kicker">EDIT</span>
                <h3>{t('profileEdit')}</h3>
              </div>
              <button
                type="button"
                className="profile-edit-modal-close"
                onClick={() => setIsEditModalOpen(false)}
              >
                {t('profileModalClose')}
              </button>
            </div>

            <div className="profile-edit-modal-body">
              <FormField
                label={t('profileNickname')}
                name="name"
                value={formData.name}
                onChange={handleChange}
                error={errors.name}
                placeholder={t('profileNicknamePlaceholder')}
                required
              />

              <div className="form-row">
                <FormField
                  label={t('profileLastName')}
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  error={errors.lastName}
                  placeholder={t('profileLastName')}
                  half
                />
                <FormField
                  label={t('profileFirstName')}
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  error={errors.firstName}
                  placeholder={t('profileFirstName')}
                  half
                />
              </div>

              <FormField
                label={t('profilePhone')}
                name="phoneNumber"
                type="tel"
                value={formData.phoneNumber}
                onChange={handleChange}
                error={errors.phoneNumber}
                placeholder="010-1234-5678"
              />

              <div className="form-group">
                <label htmlFor="country">{t('profileCountry')}</label>
                <select
                  id="country"
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                >
                  {countryOptions.map((country) => (
                    <option key={country.value} value={country.value}>
                      {country.label}
                    </option>
                  ))}
                </select>
              </div>

              <FormField
                label={t('profileAddress1')}
                name="address1"
                value={formData.address1}
                onChange={handleChange}
                placeholder={t('profileAddress1Placeholder')}
              />
              <FormField
                label={t('profileAddress2')}
                name="address2"
                value={formData.address2}
                onChange={handleChange}
                placeholder={t('profileAddress2Placeholder')}
              />

              <FormField
                label={t('profileBirth')}
                name="birth"
                type="date"
                value={formData.birth}
                onChange={handleChange}
              />
            </div>

            <div className="profile-edit-modal-footer">
              <button
                type="button"
                className="profile-action-button"
                onClick={() => setIsEditModalOpen(false)}
                disabled={isLoading}
              >
                {t('profileCancel')}
              </button>
              <button
                type="button"
                className="profile-action-button primary"
                onClick={handleSaveProfile}
                disabled={isLoading}
              >
                {isLoading ? t('profileSaving') : t('profileSave')}
              </button>
            </div>
          </div>
        </div>
      )}

      {followModalType && (
        <div className="profile-follow-modal-overlay" onClick={() => setFollowModalType(null)}>
          <div className="profile-follow-modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="profile-follow-modal-header">
              <h3>{followModalType === 'followers' ? t('profileFollowers') : t('profileFollowing')}</h3>
              <button
                type="button"
                className="profile-follow-modal-close"
                onClick={() => setFollowModalType(null)}
              >
                {t('profileModalClose')}
              </button>
            </div>

            <div className="profile-follow-modal-body">
              {isFollowListLoading ? (
                <div className="profile-follow-empty">{t('profileLoadingShort')}</div>
              ) : followUsers.length === 0 ? (
                <div className="profile-follow-empty">{t('profileNoUsers')}</div>
              ) : (
                followUsers.map((followUser) => {
                  const isCurrentUser = String(followUser.id) === String(user?.id)
                  const isSaving = followLoadingIds.includes(followUser.id)

                  return (
                    <div key={followUser.id} className="profile-follow-user-row">
                      <div className="profile-follow-user-meta">
                        {followUser.profileImage ? (
                          <img
                            src={followUser.profileImage}
                            alt={followUser.name}
                            className="profile-follow-user-avatar"
                          />
                        ) : (
                          <div className="profile-follow-user-avatar placeholder">
                            {followUser.name?.charAt(0) || 'U'}
                          </div>
                        )}
                        <div className="profile-follow-user-copy">
                          <span className="profile-follow-user-name">{followUser.name}</span>
                          <span className="profile-follow-user-email">{followUser.email}</span>
                        </div>
                      </div>

                      {!isCurrentUser && isAuthenticated && typeof followUser.isFollowing === 'boolean' && (
                        <button
                          type="button"
                          className={`profile-follow-user-button ${followUser.isFollowing ? 'following' : ''}`}
                          onClick={() => handleToggleFollowUser(followUser.id, !!followUser.isFollowing)}
                          disabled={isSaving}
                        >
                          {isSaving ? t('profileFollowSave') : followUser.isFollowing ? t('postFollowing') : t('postFollow')}
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

function FormField({
  label,
  name,
  type = 'text',
  value,
  onChange,
  error,
  placeholder,
  required,
  half,
}) {
  return (
    <div className={`form-group ${half ? 'half' : ''}`}>
      <label htmlFor={name}>
        {label} {required && '*'}
      </label>
      <input
        type={type}
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={error ? 'error' : ''}
      />
      {error && <span className="error-message">{error}</span>}
    </div>
  )
}

export default Profile

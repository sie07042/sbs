import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

import GNB from '../components/Gnb'
import Footer from '../components/Footer'
import ProfileImageSection from '../components/ProfileImageSection'
import { useAuth } from '../hooks/useAuth'
import { useLanguage } from '../hooks/useLanguage'
import { useProfileForm } from '../hooks/useProfileForm'
import './Profile.css'

function Profile() {
  const navigate = useNavigate()
  const { user, isAuthenticated, accessToken } = useAuth()
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
            ? {
                Authorization: `Bearer ${accessToken}`,
              }
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

  const profileTitle = useMemo(() => (
    formData.name?.trim() || user?.name || t('profileMyProfile')
  ), [formData.name, t, user?.name])

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
          ? {
              Authorization: `Bearer ${accessToken}`,
            }
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

  const handleSubmit = async (event) => {
    event.preventDefault()

    try {
      const success = await submitProfile()

      if (success) {
        alert(t('profileUpdated'))
        navigate('/')
      } else {
        alert(t('profileUpdateFailed'))
      }
    } catch (error) {
      const message = error.response?.data?.message || t('profileUpdateError')
      alert(message)
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
        <div className="profile-card">
          <section className="profile-summary-panel">
            <div className="profile-summary-copy">
              <span className="profile-summary-eyebrow">{t('profileStudio')}</span>
              <h1>{profileTitle}</h1>
              <p>{t('profileDescription')}</p>
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

          <form onSubmit={handleSubmit} className="profile-form">
            <ProfileImageSection
              previewImage={previewImage}
              previewBackground={previewBackground}
              onImageSelect={handleImageSelect}
            />

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

            <div className="button-group">
              <button
                type="button"
                className="cancel-button"
                onClick={() => navigate(-1)}
                disabled={isLoading}
              >
                {t('profileCancel')}
              </button>
              <button
                type="submit"
                className="submit-button"
                disabled={isLoading}
              >
                {isLoading ? t('profileSaving') : t('profileSave')}
              </button>
            </div>
          </form>
        </div>
      </div>

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

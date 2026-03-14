import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

import GNB from '../components/Gnb'
import Footer from '../components/Footer'
import ProfileImageSection from '../components/ProfileImageSection'
import { useAuth } from '../hooks/useAuth'
import { useProfileForm } from '../hooks/useProfileForm'
import { FORM_CONFIG } from '../config'
import './Profile.css'

function Profile() {
  const navigate = useNavigate()
  const { user, isAuthenticated, accessToken } = useAuth()
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
    formData.name?.trim() || user?.name || 'My Profile'
  ), [formData.name, user?.name])

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
      alert(error.response?.data?.message || 'Failed to load follow list.')
    } finally {
      setIsFollowListLoading(false)
    }
  }

  const handleToggleFollowUser = async (targetUserId, currentlyFollowing) => {
    if (!accessToken) {
      alert('Login is required to update follow status.')
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
      alert(error.response?.data?.message || 'Failed to update follow status.')
    } finally {
      setFollowLoadingIds((prev) => prev.filter((id) => id !== targetUserId))
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    try {
      const success = await submitProfile()

      if (success) {
        alert('Profile updated.')
        navigate('/')
      } else {
        alert('Failed to update profile.')
      }
    } catch (error) {
      const message = error.response?.data?.message || 'An error occurred while updating your profile.'
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
            <h1>Edit Profile</h1>
            <div className="profile-loading">
              <p>Loading your profile...</p>
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
              <span className="profile-summary-eyebrow">Profile Studio</span>
              <h1>{profileTitle}</h1>
              <p>Update your profile and keep an eye on your community from one place.</p>
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
                  <span>Followers</span>
                </button>
                <button
                  type="button"
                  className="profile-summary-stat"
                  onClick={() => fetchFollowUsers('followings')}
                >
                  <strong>{followCounts.followingCount || 0}</strong>
                  <span>Following</span>
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
              label="Nickname"
              name="name"
              value={formData.name}
              onChange={handleChange}
              error={errors.name}
              placeholder="Enter your nickname"
              required
            />

            <div className="form-row">
              <FormField
                label="Last name"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                error={errors.lastName}
                placeholder="Last name"
                half
              />
              <FormField
                label="First name"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                error={errors.firstName}
                placeholder="First name"
                half
              />
            </div>

            <FormField
              label="Phone"
              name="phoneNumber"
              type="tel"
              value={formData.phoneNumber}
              onChange={handleChange}
              error={errors.phoneNumber}
              placeholder="010-1234-5678"
            />

            <div className="form-group">
              <label htmlFor="country">Country</label>
              <select
                id="country"
                name="country"
                value={formData.country}
                onChange={handleChange}
              >
                {FORM_CONFIG.countries.map((country) => (
                  <option key={country.value} value={country.value}>
                    {country.label}
                  </option>
                ))}
              </select>
            </div>

            <FormField
              label="Address 1"
              name="address1"
              value={formData.address1}
              onChange={handleChange}
              placeholder="Primary address"
            />
            <FormField
              label="Address 2"
              name="address2"
              value={formData.address2}
              onChange={handleChange}
              placeholder="Apartment, suite, unit"
            />

            <FormField
              label="Birth date"
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
                Cancel
              </button>
              <button
                type="submit"
                className="submit-button"
                disabled={isLoading}
              >
                {isLoading ? 'Saving...' : 'Save profile'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {followModalType && (
        <div className="profile-follow-modal-overlay" onClick={() => setFollowModalType(null)}>
          <div className="profile-follow-modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="profile-follow-modal-header">
              <h3>{followModalType === 'followers' ? 'Followers' : 'Following'}</h3>
              <button
                type="button"
                className="profile-follow-modal-close"
                onClick={() => setFollowModalType(null)}
              >
                Close
              </button>
            </div>

            <div className="profile-follow-modal-body">
              {isFollowListLoading ? (
                <div className="profile-follow-empty">Loading...</div>
              ) : followUsers.length === 0 ? (
                <div className="profile-follow-empty">No users found.</div>
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
                          {isSaving ? 'Saving...' : followUser.isFollowing ? 'Following' : 'Follow'}
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

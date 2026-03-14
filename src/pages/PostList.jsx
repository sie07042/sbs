import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'

import GNB from '../components/Gnb'
import Footer from '../components/Footer'
import PostCard from '../components/PostCard'
import { API_CONFIG } from '../config'
import { useAuth } from '../hooks/useAuth'
import { usePosts } from '../hooks/usePosts'
import './PostList.css'

function PostList() {
  const { user, isAuthenticated, accessToken } = useAuth()
  const [activeTab, setActiveTab] = useState('all')
  const [likeLoadingIds, setLikeLoadingIds] = useState([])
  const [searchInput, setSearchInput] = useState('')
  const [hashtagInput, setHashtagInput] = useState('')
  const [sortBy, setSortBy] = useState('latest')
  const [selectedHashtag, setSelectedHashtag] = useState('')
  const [hashtagPosts, setHashtagPosts] = useState([])
  const [hashtagSuggestions, setHashtagSuggestions] = useState([])
  const [trendingHashtags, setTrendingHashtags] = useState([])
  const [isHashtagLoading, setIsHashtagLoading] = useState(false)
  const [isSuggestionLoading, setIsSuggestionLoading] = useState(false)
  const [hashtagError, setHashtagError] = useState('')
  const [followStateByAuthor, setFollowStateByAuthor] = useState({})
  const [followLoadingIds, setFollowLoadingIds] = useState([])
  const deferredSearch = useDeferredValue(searchInput)
  const deferredHashtagInput = useDeferredValue(hashtagInput)

  const { posts, isLoading, error, fetchPosts, updatePost } = usePosts(accessToken, {
    myPostsOnly: activeTab === 'mine',
  })

  useEffect(() => {
    const fetchTrendingHashtags = async () => {
      try {
        const response = await axios.get('/api/hashtags/trending/top?limit=8', {
          withCredentials: true,
        })
        setTrendingHashtags(response.data?.data || [])
      } catch (err) {
        console.error('Failed to fetch trending hashtags:', err)
      }
    }

    fetchTrendingHashtags()
  }, [])

  useEffect(() => {
    const keyword = deferredHashtagInput.replace(/^#/, '').trim()

    if (!keyword) {
      setHashtagSuggestions([])
      return
    }

    const fetchHashtagSuggestions = async () => {
      try {
        setIsSuggestionLoading(true)
        const response = await axios.get(
          `/api/hashtags/search?keyword=${encodeURIComponent(keyword)}&size=6`,
          { withCredentials: true }
        )
        setHashtagSuggestions(response.data?.data?.content || [])
      } catch (err) {
        console.error('Failed to fetch hashtag suggestions:', err)
        setHashtagSuggestions([])
      } finally {
        setIsSuggestionLoading(false)
      }
    }

    fetchHashtagSuggestions()
  }, [deferredHashtagInput])

  const fetchHashtagPosts = async (hashtagName) => {
    const normalizedHashtag = hashtagName.replace(/^#/, '').trim()

    if (!normalizedHashtag) {
      setSelectedHashtag('')
      setHashtagPosts([])
      setHashtagError('')
      return
    }

    try {
      setIsHashtagLoading(true)
      setHashtagError('')
      const response = await axios.get(
        `/api/hashtags/${encodeURIComponent(normalizedHashtag)}/posts?page=0&size=20`,
        { withCredentials: true }
      )

      setSelectedHashtag(normalizedHashtag)
      setHashtagPosts(response.data?.data?.content || [])
    } catch (err) {
      console.error('Failed to fetch hashtag posts:', err)
      setHashtagError(err.response?.data?.message || 'Failed to load hashtag posts.')
      setHashtagPosts([])
    } finally {
      setIsHashtagLoading(false)
    }
  }

  const clearHashtagFilter = () => {
    setSelectedHashtag('')
    setHashtagPosts([])
    setHashtagInput('')
    setHashtagSuggestions([])
    setHashtagError('')
  }

  const basePosts = selectedHashtag ? hashtagPosts : posts
  const normalizedQuery = deferredSearch.trim().toLowerCase()

  const visiblePosts = useMemo(() => {
    const searchedPosts = normalizedQuery
      ? basePosts.filter((post) => {
          const authorName = post.author?.name || post.userName || ''
          const content = post.content || ''
          const tags = Array.isArray(post.hashtags)
            ? post.hashtags.map((tag) => tag.name || tag).join(' ')
            : ''

          return `${authorName} ${content} ${tags}`.toLowerCase().includes(normalizedQuery)
        })
      : basePosts

    const sortedPosts = [...searchedPosts]

    sortedPosts.sort((a, b) => {
      if (sortBy === 'popular') {
        const popularityA = (a.likeCount || 0) * 3 + (a.commentCount || 0) * 2 + (a.viewCount || 0)
        const popularityB = (b.likeCount || 0) * 3 + (b.commentCount || 0) * 2 + (b.viewCount || 0)

        if (popularityB !== popularityA) {
          return popularityB - popularityA
        }
      }

      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    })

    return sortedPosts
  }, [basePosts, normalizedQuery, sortBy])

  const handleToggleLike = async (postId, currentlyLiked) => {
    if (!isAuthenticated || !accessToken) {
      alert('Login is required to like this post.')
      return
    }

    if (likeLoadingIds.includes(postId)) {
      return
    }

    setLikeLoadingIds((prev) => [...prev, postId])

    try {
      const url = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.posts}/${postId}/like`
      const response = await axios({
        url,
        method: currentlyLiked ? 'delete' : 'post',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        withCredentials: true,
      })

      const likeData = response.data?.data

      updatePost(postId, (post) => ({
        ...post,
        liked: typeof likeData?.liked === 'boolean' ? likeData.liked : !currentlyLiked,
        likeCount: typeof likeData?.likeCount === 'number'
          ? likeData.likeCount
          : Math.max(0, (post.likeCount || 0) + (currentlyLiked ? -1 : 1)),
      }))

      if (selectedHashtag) {
        setHashtagPosts((prev) => prev.map((post) => (
          post.id === postId
            ? {
                ...post,
                liked: typeof likeData?.liked === 'boolean' ? likeData.liked : !currentlyLiked,
                likeCount: typeof likeData?.likeCount === 'number'
                  ? likeData.likeCount
                  : Math.max(0, (post.likeCount || 0) + (currentlyLiked ? -1 : 1)),
              }
            : post
        )))
      }
    } catch (err) {
      console.error('Like toggle failed:', err)
      alert('Failed to update like.')
    } finally {
      setLikeLoadingIds((prev) => prev.filter((id) => id !== postId))
    }
  }

  const isPostLoading = isLoading || isHashtagLoading

  useEffect(() => {
    if (!isAuthenticated || !accessToken) return

    const uniqueAuthorIds = [...new Set(
      visiblePosts
        .map((post) => post.author?.id || post.userId)
        .filter((authorId) => authorId && String(authorId) !== String(user?.id))
    )]

    const missingAuthorIds = uniqueAuthorIds.filter((authorId) => !(authorId in followStateByAuthor))

    if (missingAuthorIds.length === 0) {
      return
    }

    const fetchFollowStateForAuthors = async () => {
      try {
        const responses = await Promise.all(
          missingAuthorIds.map((authorId) =>
            axios.get(`/api/users/${authorId}/follow/check`, {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
              withCredentials: true,
            })
          )
        )

        setFollowStateByAuthor((prev) => {
          const next = { ...prev }

          missingAuthorIds.forEach((authorId, index) => {
            next[authorId] = !!responses[index].data?.data
          })

          return next
        })
      } catch (err) {
        console.error('Failed to fetch follow state for post authors:', err)
      }
    }

    fetchFollowStateForAuthors()
  }, [accessToken, followStateByAuthor, isAuthenticated, user?.id, visiblePosts])

  const handleToggleFollow = async (authorId, currentlyFollowing) => {
    if (!isAuthenticated || !accessToken) {
      alert('Login is required to follow users.')
      return
    }

    if (followLoadingIds.includes(authorId)) {
      return
    }

    setFollowLoadingIds((prev) => [...prev, authorId])

    try {
      const response = await axios({
        url: `/api/users/${authorId}/follow`,
        method: currentlyFollowing ? 'delete' : 'post',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        withCredentials: true,
      })

      const nextFollowing = !!response.data?.data?.following
      setFollowStateByAuthor((prev) => ({
        ...prev,
        [authorId]: nextFollowing,
      }))
    } catch (err) {
      console.error('Failed to update follow from post card:', err)
      alert(err.response?.data?.message || 'Failed to update follow.')
    } finally {
      setFollowLoadingIds((prev) => prev.filter((id) => id !== authorId))
    }
  }

  return (
    <>
      <GNB />
      <div className="post-list-container">
        <div className="post-list-hero">
          <div className="post-list-hero-copy">
            <span className="post-list-eyebrow">Community Feed</span>
            <h1>Find people and topics in one feed</h1>
            <p>
              Search content, explore hashtags, and switch between latest and popular sorting in
              one place.
            </p>
          </div>

          <div className="post-list-hero-actions">
            <label className="post-search-shell" htmlFor="post-search">
              <span className="post-search-icon">Search posts</span>
              <input
                id="post-search"
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search author, content, or hashtag"
                className="post-search-input"
              />
            </label>

            <form
              className="post-search-shell post-search-shell-hashtag"
              onSubmit={(event) => {
                event.preventDefault()
                fetchHashtagPosts(hashtagInput)
              }}
            >
              <span className="post-search-icon">Search hashtags</span>
              <div className="post-hashtag-form">
                <input
                  type="search"
                  value={hashtagInput}
                  onChange={(event) => setHashtagInput(event.target.value)}
                  placeholder="#travel"
                  className="post-search-input"
                />
                <button type="submit" className="post-inline-button">
                  Find
                </button>
              </div>
            </form>

            {isAuthenticated && (
              <Link to="/posts/create" className="post-create-button">
                + Create Post
              </Link>
            )}
          </div>
        </div>

        <div className="post-discovery-bar">
          <div className="post-tag-strip">
            <span className="post-tag-strip-label">Trending</span>
            {trendingHashtags.map((hashtag) => (
              <button
                key={hashtag.id || hashtag.name}
                type="button"
                className={`post-tag-chip ${selectedHashtag === hashtag.name ? 'active' : ''}`}
                onClick={() => fetchHashtagPosts(hashtag.name)}
              >
                #{hashtag.name}
              </button>
            ))}
            {selectedHashtag && (
              <button type="button" className="post-tag-reset" onClick={clearHashtagFilter}>
                View All
              </button>
            )}
          </div>

          <div className="post-list-toolbar">
            <div className="post-list-meta">
              <span className="post-list-count">{visiblePosts.length}</span>
              <span className="post-list-count-label">
                {selectedHashtag ? `posts for #${selectedHashtag}` : 'posts in feed'}
              </span>
            </div>

            <div className="post-list-controls">
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
                className="post-sort-select"
              >
                <option value="latest">Latest</option>
                <option value="popular">Popular</option>
              </select>

              {isAuthenticated && (
                <div className="post-tabs">
                  <button
                    className={`post-tab ${activeTab === 'all' ? 'active' : ''}`}
                    onClick={() => {
                      setActiveTab('all')
                      if (!selectedHashtag) {
                        fetchPosts()
                      }
                    }}
                  >
                    All Posts
                  </button>
                  <button
                    className={`post-tab ${activeTab === 'mine' ? 'active' : ''}`}
                    onClick={() => {
                      setActiveTab('mine')
                      if (selectedHashtag) {
                        clearHashtagFilter()
                      }
                    }}
                    disabled={!!selectedHashtag}
                  >
                    My Posts
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {!!hashtagSuggestions.length && (
          <div className="post-suggestion-panel">
            {hashtagSuggestions.map((hashtag) => (
              <button
                key={hashtag.id || hashtag.name}
                type="button"
                className="post-suggestion-chip"
                onClick={() => {
                  setHashtagInput(`#${hashtag.name}`)
                  fetchHashtagPosts(hashtag.name)
                }}
              >
                #{hashtag.name}
              </button>
            ))}
            {isSuggestionLoading && <span className="post-suggestion-status">Searching...</span>}
          </div>
        )}

        {hashtagError && <div className="post-list-error-inline">{hashtagError}</div>}

        <div className="post-list">
          {isPostLoading ? (
            <div className="post-list-loading">
              <p>{selectedHashtag ? 'Loading hashtag posts...' : 'Loading posts...'}</p>
            </div>
          ) : error ? (
            <div className="post-list-error">
              <p>{error}</p>
              <button onClick={fetchPosts} className="retry-button" type="button">
                Retry
              </button>
            </div>
          ) : visiblePosts.length === 0 ? (
            <div className="post-list-empty">
              <p>
                {selectedHashtag
                  ? `No posts found for #${selectedHashtag}.`
                  : normalizedQuery
                    ? 'No search results found.'
                    : activeTab === 'mine'
                      ? 'No posts created yet.'
                      : 'No posts available.'}
              </p>
              {selectedHashtag ? (
                <button type="button" className="post-clear-search" onClick={clearHashtagFilter}>
                  Clear Hashtag
                </button>
              ) : normalizedQuery ? (
                <button
                  type="button"
                  className="post-clear-search"
                  onClick={() => setSearchInput('')}
                >
                  Clear Search
                </button>
              ) : (
                isAuthenticated && (
                  <Link to="/posts/create" className="post-create-link">
                    Create your first post
                  </Link>
                )
              )}
            </div>
          ) : (
            visiblePosts.map((post) => (
              // Follow state is cached per author for card-level actions.
              <PostCard
                key={post.id}
                post={post}
                isAuthenticated={isAuthenticated}
                currentUserId={user?.id}
                isLiking={likeLoadingIds.includes(post.id)}
                isFollowingAuthor={!!followStateByAuthor[post.author?.id || post.userId]}
                isFollowLoading={followLoadingIds.includes(post.author?.id || post.userId)}
                onToggleLike={handleToggleLike}
                onToggleFollow={handleToggleFollow}
              />
            ))
          )}
        </div>
      </div>
      <Footer />
    </>
  )
}

export default PostList

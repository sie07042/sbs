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
  const [bookmarkStateByPost, setBookmarkStateByPost] = useState({})
  const [bookmarkLoadingIds, setBookmarkLoadingIds] = useState([])
  const deferredSearch = useDeferredValue(searchInput)
  const deferredHashtagInput = useDeferredValue(hashtagInput)
  const getPostId = (post) => post?.id || post?.postId

  const { posts, isLoading, error, fetchPosts, updatePost } = usePosts(accessToken, {
    myPostsOnly: activeTab === 'mine',
  })

  useEffect(() => {
    const fetchTrendingHashtags = async () => {
      try {
        const response = await axios.get('/api/hashtags/trending/top?limit=8', {
          headers: accessToken
            ? {
                Authorization: `Bearer ${accessToken}`,
              }
            : undefined,
          withCredentials: true,
        })
        setTrendingHashtags(response.data?.data || [])
      } catch (err) {
        if (err.response?.status !== 401) {
          console.error('Failed to fetch trending hashtags:', err)
        }
      }
    }

    fetchTrendingHashtags()
  }, [accessToken])

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

  useEffect(() => {
    if (!isAuthenticated || !accessToken || visiblePosts.length === 0) {
      return
    }

    const missingPostIds = visiblePosts
      .map((post) => getPostId(post))
      .filter((postId) => postId && !(postId in bookmarkStateByPost))

    if (missingPostIds.length === 0) {
      return
    }

    const fetchBookmarkStateForPosts = async () => {
      try {
        const responses = await Promise.all(
          missingPostIds.map((postId) =>
            axios.get(`/api/posts/${postId}/bookmark/check`, {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
              withCredentials: true,
            })
          )
        )

        setBookmarkStateByPost((prev) => {
          const next = { ...prev }

          missingPostIds.forEach((postId, index) => {
            next[postId] = !!responses[index].data?.data
          })

          return next
        })
      } catch (err) {
        console.error('Failed to fetch bookmark state for posts:', err)
      }
    }

    fetchBookmarkStateForPosts()
  }, [accessToken, bookmarkStateByPost, isAuthenticated, visiblePosts])

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
          getPostId(post) === postId
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

  const handleToggleBookmark = async (postId, currentlyBookmarked) => {
    if (!isAuthenticated || !accessToken) {
      alert('Login is required to save posts.')
      return
    }

    if (bookmarkLoadingIds.includes(postId)) {
      return
    }

    setBookmarkLoadingIds((prev) => [...prev, postId])

    try {
      const response = await axios({
        url: `/api/posts/${postId}/bookmark`,
        method: currentlyBookmarked ? 'delete' : 'post',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        withCredentials: true,
      })

      const nextBookmarked = typeof response.data?.data?.bookmarked === 'boolean'
        ? response.data.data.bookmarked
        : !currentlyBookmarked

      setBookmarkStateByPost((prev) => ({
        ...prev,
        [postId]: nextBookmarked,
      }))
    } catch (err) {
      console.error('Failed to update bookmark from post card:', err)
      alert(err.response?.data?.message || 'Failed to update bookmark.')
    } finally {
      setBookmarkLoadingIds((prev) => prev.filter((id) => id !== postId))
    }
  }

  const isPostLoading = isLoading || isHashtagLoading
  const topAuthors = visiblePosts.slice(0, 4).map((post) => ({
    authorId: post.author?.id || post.userId,
    name: post.author?.name || post.userName || 'Unknown',
    handle: `@${(post.author?.name || post.userName || 'user').replace(/\s+/g, '').toLowerCase()}`,
  }))

  return (
    <>
      <GNB />
      <div className="post-feed-page">
        <div className="post-feed-shell">
          <aside className="post-feed-sidebar post-feed-sidebar-left">
            <section className="post-panel post-panel-intro">
              <span className="post-panel-label">커뮤니티 레이더</span>
              <h1>한 타임라인에서 사람, 게시글, 주제를 한 번에 찾아보세요.</h1>
              <p>
                작성자나 내용으로 검색하고, 인기 해시태그를 바로 탐색하고, 피드를 떠나지
                않고 최신순과 인기순을 오갈 수 있어요.
              </p>
              {isAuthenticated && (
                <Link to="/posts/create" className="post-compose-button">
                  글쓰기
                </Link>
              )}
            </section>

            <section className="post-panel post-panel-stats">
              <div className="post-panel-stat">
                <strong>{visiblePosts.length}</strong>
                <span>{selectedHashtag ? `#${selectedHashtag} 게시글 수` : '피드에 보이는 게시글'}</span>
              </div>
              <div className="post-panel-stat">
                <strong>{trendingHashtags.length}</strong>
                <span>지금 뜨는 해시태그</span>
              </div>
              <div className="post-panel-stat">
                <strong>{sortBy === 'popular' ? '인기' : '최신'}</strong>
                <span>현재 정렬 방식</span>
              </div>
            </section>

            <section className="post-panel post-panel-trending">
              <div className="post-panel-heading">
                <h2>트렌딩</h2>
                {selectedHashtag && (
                  <button type="button" className="post-panel-link" onClick={clearHashtagFilter}>
                    초기화
                  </button>
                )}
              </div>
              <div className="post-tag-cloud">
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
              </div>
            </section>
          </aside>

          <main className="post-feed-main">
            <div className="post-feed-main-header">
              <div className="post-feed-main-title">
                <span className="post-feed-main-kicker">타임라인</span>
                <h2>{activeTab === 'mine' ? '내 게시글' : '전체 게시글'}</h2>
              </div>

              <div className="post-feed-controls">
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value)}
                  className="post-sort-select"
                >
                  <option value="latest">최신순</option>
                  <option value="popular">인기순</option>
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
                      전체 글
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
                      내 글
                    </button>
                  </div>
                )}
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
                {isSuggestionLoading && (
                  <span className="post-suggestion-status">해시태그를 찾는 중...</span>
                )}
              </div>
            )}

            {hashtagError && <div className="post-list-error-inline">{hashtagError}</div>}

            <div className="post-list">
              {isPostLoading ? (
                <div className="post-list-loading">
                  <p>{selectedHashtag ? '해시태그 게시글을 불러오는 중...' : '게시글을 불러오는 중...'}</p>
                </div>
              ) : error ? (
                <div className="post-list-error">
                  <p>{error}</p>
                  <button onClick={fetchPosts} className="retry-button" type="button">
                    다시 시도
                  </button>
                </div>
              ) : visiblePosts.length === 0 ? (
                <div className="post-list-empty">
                  <p>
                    {selectedHashtag
                      ? `#${selectedHashtag} 게시글이 아직 없어요.`
                      : normalizedQuery
                        ? '검색 결과가 없어요.'
                        : activeTab === 'mine'
                          ? '아직 작성한 게시글이 없어요.'
                          : '표시할 게시글이 없어요.'}
                  </p>
                  {selectedHashtag ? (
                    <button type="button" className="post-clear-search" onClick={clearHashtagFilter}>
                      해시태그 해제
                    </button>
                  ) : normalizedQuery ? (
                    <button
                      type="button"
                      className="post-clear-search"
                      onClick={() => setSearchInput('')}
                    >
                      검색 지우기
                    </button>
                  ) : (
                    isAuthenticated && (
                      <Link to="/posts/create" className="post-create-link">
                        첫 게시글 쓰기
                      </Link>
                    )
                  )}
                </div>
              ) : (
                visiblePosts.map((post) => {
                  const postId = getPostId(post)

                  if (!postId) {
                    return null
                  }

                  return (
                    <PostCard
                      key={postId}
                      post={post}
                      isAuthenticated={isAuthenticated}
                      currentUserId={user?.id}
                      isLiking={likeLoadingIds.includes(postId)}
                      isBookmarked={!!bookmarkStateByPost[postId]}
                      isBookmarkLoading={bookmarkLoadingIds.includes(postId)}
                      isFollowingAuthor={!!followStateByAuthor[post.author?.id || post.userId]}
                      isFollowLoading={followLoadingIds.includes(post.author?.id || post.userId)}
                      onToggleLike={handleToggleLike}
                      onToggleBookmark={handleToggleBookmark}
                      onToggleFollow={handleToggleFollow}
                    />
                  )
                })
              )}
            </div>
          </main>

          <aside className="post-feed-sidebar post-feed-sidebar-right">
            <section className="post-panel post-panel-search">
              <div className="post-panel-heading">
                <h2>검색</h2>
              </div>
              <label className="post-search-shell" htmlFor="post-search">
                <span className="post-search-label">게시글 검색</span>
                <input
                  id="post-search"
                  type="search"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="작성자, 내용, 해시태그"
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
                <span className="post-search-label">해시태그 검색</span>
                <div className="post-hashtag-form">
                  <input
                    type="search"
                    value={hashtagInput}
                    onChange={(event) => setHashtagInput(event.target.value)}
                    placeholder="#travel"
                    className="post-search-input"
                  />
                  <button type="submit" className="post-inline-button">
                    찾기
                  </button>
                </div>
              </form>
            </section>

            <section className="post-panel post-panel-recommend">
              <div className="post-panel-heading">
                <h2>눈여겨볼 사람들</h2>
              </div>

              {topAuthors.length === 0 ? (
                <p className="post-right-empty">피드를 불러오면 작성자가 여기에 보여요.</p>
              ) : (
                <div className="post-recommend-list">
                  {topAuthors.map((author) => {
                    const isFollowing = !!followStateByAuthor[author.authorId]
                    const isSaving = followLoadingIds.includes(author.authorId)

                    return (
                      <div key={author.authorId} className="post-recommend-row">
                        <div className="post-recommend-copy">
                          <strong>{author.name}</strong>
                          <span>{author.handle}</span>
                        </div>
                        {author.authorId && String(author.authorId) !== String(user?.id) && isAuthenticated && (
                          <button
                            type="button"
                            className={`post-recommend-button ${isFollowing ? 'following' : ''}`}
                            onClick={() => handleToggleFollow(author.authorId, isFollowing)}
                            disabled={isSaving}
                          >
                            {isSaving ? '처리 중...' : isFollowing ? '팔로잉' : '팔로우'}
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          </aside>
        </div>
      </div>
      <Footer />
    </>
  )
}

export default PostList

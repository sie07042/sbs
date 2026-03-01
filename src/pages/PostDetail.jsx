import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

import GNB from '../components/Gnb';
import Footer from '../components/Footer';
import { useAuth } from '../hooks/useAuth';
import { API_CONFIG } from '../config';
import './PostDetail.css';

function PostDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, accessToken, isAuthenticated } = useAuth();

  const [post, setPost] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLikeLoading, setIsLikeLoading] = useState(false);

  const fetchPost = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const url = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.posts}/${id}`;
      const headers = {};

      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      const response = await axios.get(url, {
        headers,
        withCredentials: true,
      });

      setPost(response.data?.data || response.data);
    } catch (err) {
      console.error('Post detail fetch failed:', err);

      if (err.response?.status === 404) {
        setError('Post not found.');
      } else {
        setError('Failed to load the post.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [id, accessToken]);

  useEffect(() => {
    fetchPost();
  }, [fetchPost]);

  const handleDelete = async () => {
    if (!window.confirm('Delete this post?')) {
      return;
    }

    try {
      const url = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.posts}/${id}`;

      await axios.delete(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        withCredentials: true,
      });

      alert('Post deleted.');
      navigate('/posts');
    } catch (err) {
      console.error('Post delete failed:', err);
      alert('Failed to delete the post.');
    }
  };

  const handleToggleLike = async () => {
    if (!post || isLikeLoading) {
      return;
    }

    if (!isAuthenticated || !accessToken) {
      alert('Login is required to like this post.');
      return;
    }

    setIsLikeLoading(true);

    try {
      const url = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.posts}/${id}/like`;
      const response = await axios({
        url,
        method: post.liked ? 'delete' : 'post',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        withCredentials: true,
      });

      const likeData = response.data?.data;

      setPost(prev => ({
        ...prev,
        liked: typeof likeData?.liked === 'boolean' ? likeData.liked : !prev.liked,
        likeCount: typeof likeData?.likeCount === 'number'
          ? likeData.likeCount
          : Math.max(0, (prev.likeCount || 0) + (prev.liked ? -1 : 1)),
      }));
    } catch (err) {
      console.error('Like toggle failed:', err);
      alert('Failed to update like.');
    } finally {
      setIsLikeLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';

    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${year}.${month}.${day} ${hours}:${minutes}`;
  };

  const authorName = post?.author?.name || post?.userName || 'Unknown';
  const authorImage = post?.author?.profileImage || post?.userProfileImage || null;

  const isOwner = user && post && (
    user.id === post.userId ||
    user.id === post.author?.id ||
    user.email === post.author?.email
  );

  return (
    <>
      <GNB />
      <div className="post-detail-container">
        {isLoading ? (
          <div className="post-detail-loading">
            <p>Loading post...</p>
          </div>
        ) : error ? (
          <div className="post-detail-error">
            <p>{error}</p>
            <button onClick={() => navigate('/posts')} className="back-button" type="button">
              Back to list
            </button>
          </div>
        ) : post ? (
          <div className="post-detail-card">
            <div className="post-detail-header">
              <div className="post-detail-author">
                {authorImage ? (
                  <img src={authorImage} alt={authorName} className="post-detail-avatar" />
                ) : (
                  <div className="post-detail-avatar-placeholder">
                    {authorName.charAt(0)}
                  </div>
                )}

                <div className="post-detail-author-info">
                  <span className="post-detail-author-name">{authorName}</span>
                  <span className="post-detail-date">{formatDate(post.createdAt)}</span>
                </div>
              </div>

              {isOwner && (
                <div className="post-detail-actions">
                  <button onClick={handleDelete} className="delete-button" type="button">
                    Delete
                  </button>
                </div>
              )}
            </div>

            <div className="post-detail-content">
              <p>{post.content}</p>
            </div>

            {post.images && post.images.length > 0 && (
              <div className="post-detail-images">
                {post.images.map((image, index) => (
                  <div key={image.id || index} className="post-detail-image-item">
                    <img
                      src={image.imageUrl || image.url}
                      alt={`Post image ${index + 1}`}
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="post-detail-stats">
              <button
                type="button"
                className={`post-detail-like-button ${post.liked ? 'liked' : ''}`}
                onClick={handleToggleLike}
                disabled={isLikeLoading}
                aria-pressed={!!post.liked}
              >
                {`Like ${post.likeCount || 0}`}
              </button>
              <span className="post-detail-stat">{`Comments ${post.commentCount || 0}`}</span>
              <span className="post-detail-stat">{`Views ${post.viewCount || 0}`}</span>
            </div>

            {post.visibility && post.visibility !== 'PUBLIC' && (
              <div className="post-detail-visibility">
                {post.visibility === 'PRIVATE' ? 'Private' : 'Followers only'}
              </div>
            )}

            <div className="post-detail-footer">
              <button onClick={() => navigate('/posts')} className="back-button" type="button">
                Back to list
              </button>
            </div>
          </div>
        ) : null}
      </div>
      <Footer />
    </>
  );
}

export default PostDetail;

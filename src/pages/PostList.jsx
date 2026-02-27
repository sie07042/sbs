import { useState } from 'react';
import { Link } from 'react-router-dom';

import GNB from '../components/Gnb';
import Footer from '../components/Footer';
import PostCard from '../components/PostCard';
import { useAuth } from '../hooks/useAuth';
import { usePosts } from '../hooks/usePosts';
import './PostList.css';

/**
 * PostList 컴포넌트
 *
 * 게시글 피드 페이지입니다.
 * - 전체 공개 게시글 목록 조회
 * - 내 게시글 탭 전환
 * - 로그인한 사용자만 게시글 작성 가능
 */
function PostList() {
  const { isAuthenticated, accessToken } = useAuth();

  // 탭 상태: 'all' (전체 피드) 또는 'mine' (내 게시글)
  const [activeTab, setActiveTab] = useState('all');

  // 게시글 목록 조회 (탭에 따라 다른 API 호출)
  const { posts, isLoading, error, fetchPosts } = usePosts(accessToken, {
    myPostsOnly: activeTab === 'mine'
  });

  // 탭 변경 핸들러
  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  return (
    <>
      <GNB />
      <div className="post-list-container">
        {/* 헤더: 제목 + 작성 버튼 */}
        <div className="post-list-header">
          <h1>게시글</h1>
          {isAuthenticated && (
            <Link to="/posts/create" className="post-create-button">
              + 새 글 작성
            </Link>
          )}
        </div>

        {/* 탭 메뉴 */}
        {isAuthenticated && (
          <div className="post-tabs">
            <button
              className={`post-tab ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => handleTabChange('all')}
            >
              전체 피드
            </button>
            <button
              className={`post-tab ${activeTab === 'mine' ? 'active' : ''}`}
              onClick={() => handleTabChange('mine')}
            >
              내 게시글
            </button>
          </div>
        )}

        {/* 게시글 목록 */}
        <div className="post-list">
          {isLoading ? (
            <div className="post-list-loading">
              <p>게시글을 불러오는 중...</p>
            </div>
          ) : error ? (
            <div className="post-list-error">
              <p>{error}</p>
              <button onClick={fetchPosts} className="retry-button">다시 시도</button>
            </div>
          ) : posts.length === 0 ? (
            <div className="post-list-empty">
              <p>{activeTab === 'mine' ? '작성한 게시글이 없습니다.' : '게시글이 없습니다.'}</p>
              {isAuthenticated && (
                <Link to="/posts/create" className="post-create-link">
                  첫 게시글을 작성해보세요!
                </Link>
              )}
            </div>
          ) : (
            posts.map(post => (
              <PostCard key={post.id} post={post} />
            ))
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}

export default PostList;

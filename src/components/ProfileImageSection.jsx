import { useRef } from 'react';

/**
 * ProfileImageSection 컴포넌트
 *
 * 프로필 이미지와 배경 이미지를 선택하고 미리보기를 표시하는 섹션입니다.
 *
 * @param {Object} props
 * @param {string} props.previewImage - 프로필 이미지 미리보기 URL
 * @param {string} props.previewBackground - 배경 이미지 미리보기 URL
 * @param {Function} props.onImageSelect - 이미지 선택 핸들러 (file, type) => void
 */
function ProfileImageSection({ previewImage, previewBackground, onImageSelect }) {
  // 숨겨진 파일 input을 참조하기 위한 ref
  const profileInputRef = useRef(null);
  const backgroundInputRef = useRef(null);

  /**
   * 파일 선택 다이얼로그 열기
   */
  const openProfileDialog = () => profileInputRef.current?.click();
  const openBackgroundDialog = () => backgroundInputRef.current?.click();

  /**
   * 파일 변경 핸들러
   */
  const handleFileChange = (e, type) => {
    const file = e.target.files?.[0];
    if (file) {
      onImageSelect(file, type);
    }
  };

  return (
    <>
      {/* 배경 + 프로필 이미지 통합 섹션 */}
      <div className="profile-header-section">
        {/* 배경 이미지 영역 */}
        <div
          className="profile-background-wrapper"
          onClick={openBackgroundDialog}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && openBackgroundDialog()}
          style={{
            backgroundImage: previewBackground ? `url(${previewBackground})` : 'none'
          }}
        >
          {/* 배경 이미지 플레이스홀더 */}
          {!previewBackground && (
            <div className="background-placeholder">
              <span className="background-placeholder-icon">🖼️</span>
              <span className="background-placeholder-text">배경 이미지 선택</span>
            </div>
          )}
          {/* 호버 오버레이 */}
          <div className="profile-background-overlay">
            <span>📷 배경 변경</span>
          </div>
        </div>

        {/* 숨겨진 배경 이미지 파일 입력 */}
        <input
          type="file"
          ref={backgroundInputRef}
          onChange={(e) => handleFileChange(e, 'background')}
          accept="image/*"
          style={{ display: 'none' }}
        />

        {/* 프로필 이미지 (배경 위에 겹침) */}
        <div className="profile-image-container">
          <div
            className="profile-image-wrapper"
            onClick={openProfileDialog}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && openProfileDialog()}
          >
            {previewImage ? (
              <img
                src={previewImage}
                alt="프로필 이미지"
                className="profile-image"
              />
            ) : (
              <div className="profile-image-placeholder">
                <span className="placeholder-icon">📷</span>
                <span className="placeholder-text">이미지 선택</span>
              </div>
            )}
            {/* 호버 오버레이 */}
            <div className="profile-image-overlay">
              <span>변경</span>
            </div>
          </div>

          {/* 숨겨진 프로필 이미지 파일 입력 */}
          <input
            type="file"
            ref={profileInputRef}
            onChange={(e) => handleFileChange(e, 'profile')}
            accept="image/*"
            style={{ display: 'none' }}
          />
        </div>
      </div>

      <p className="image-hint">
        프로필 이미지와 배경 이미지를 클릭하여 변경하세요
      </p>
    </>
  );
}

export default ProfileImageSection;

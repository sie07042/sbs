# React 프로필 수정 및 이미지 업로드 구현 가이드

## 목차
1. [개요](#1-개요)
2. [시스템 아키텍처](#2-시스템-아키텍처)
3. [백엔드 API 설계](#3-백엔드-api-설계)
4. [프론트엔드 구현](#4-프론트엔드-구현)
5. [이미지 업로드 구현](#5-이미지-업로드-구현)
6. [전체 흐름 정리](#6-전체-흐름-정리)
7. [실습 과제](#7-실습-과제)

---

## 1. 개요

### 1.1 학습 목표
- React에서 폼 데이터 관리 방법 이해
- 파일 업로드 (이미지) 구현 방법 학습
- REST API를 통한 CRUD 작업 이해
- useEffect를 활용한 데이터 로딩 패턴 학습

### 1.2 사용 기술
| 구분 | 기술 |
|------|------|
| 프론트엔드 | React, axios, React Router |
| 백엔드 | Spring Boot, JPA |
| 인증 | JWT (JSON Web Token) |
| 파일 업로드 | multipart/form-data |

---

## 2. 시스템 아키텍처

### 2.1 전체 구조

```
┌─────────────────────────────────────────────────────────────────┐
│                        브라우저 (React)                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │ 프로필 조회  │  │ 이미지 선택  │  │      프로필 저장         │ │
│  └──────┬──────┘  └──────┬──────┘  └────────────┬────────────┘ │
└─────────┼────────────────┼──────────────────────┼───────────────┘
          │                │                      │
          ▼                ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Nginx (프록시)                              │
│         /api/* → 백엔드 서버로 프록시                            │
└─────────────────────────────────────────────────────────────────┘
          │                │                      │
          ▼                ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Spring Boot (백엔드)                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │GET /profile │  │POST /upload │  │    PUT /profile         │ │
│  │  프로필조회  │  │ 이미지업로드 │  │     프로필수정          │ │
│  └──────┬──────┘  └──────┬──────┘  └────────────┬────────────┘ │
└─────────┼────────────────┼──────────────────────┼───────────────┘
          │                │                      │
          ▼                ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                        MySQL (DB)                                │
│         user 테이블 + user_profile 테이블                        │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 데이터 흐름

```
[프로필 수정 시나리오]

1. 페이지 진입
   └─→ GET /api/user/profile
       └─→ 기존 데이터로 폼 초기화

2. 이미지 선택 (선택사항)
   └─→ FileReader로 미리보기 표시
       └─→ 아직 서버 전송 안 함!

3. 저장 버튼 클릭
   └─→ 이미지가 새로 선택되었다면?
       └─→ POST /api/upload/image (이미지 먼저 업로드)
           └─→ 반환된 URL 저장
   └─→ PUT /api/user/profile (프로필 데이터 + 이미지 URL)
       └─→ 완료!
```

---

## 3. 백엔드 API 설계

### 3.1 API 목록

| Method | Endpoint | 설명 | 요청 타입 |
|--------|----------|------|-----------|
| GET | /api/user/profile | 프로필 조회 | - |
| PUT | /api/user/profile | 프로필 수정 | application/json |
| POST | /api/upload/image | 이미지 업로드 | multipart/form-data |

### 3.2 프로필 조회 API

**요청**
```bash
curl -X GET http://localhost:9080/api/user/profile \
  -H "Authorization: Bearer {JWT_TOKEN}"
```

**응답**
```json
{
  "success": true,
  "message": "프로필 조회 성공",
  "data": {
    "userId": 57,
    "email": "user@example.com",
    "name": "김은범",
    "profileImage": "http://localhost:9080/uploads/profile-abc.jpg",
    "provider": "KAKAO",
    "profileId": 1,
    "lastName": "김",
    "firstName": "은범",
    "phoneNumber": "010-1234-5678",
    "country": 1,
    "address1": "서울시 강남구",
    "address2": "역삼동 123",
    "birth": "1990-01-01T00:00:00",
    "bgImage": "http://localhost:9080/uploads/bg-xyz.jpg",
    "createdAt": "2026-01-16T10:00:00",
    "updatedAt": "2026-01-16T21:43:12"
  }
}
```

### 3.3 프로필 수정 API

**요청**
```bash
curl -X PUT http://localhost:9080/api/user/profile \
  -H "Authorization: Bearer {JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "김은범",
    "profileImage": "http://localhost:9080/uploads/profile-new.jpg",
    "lastName": "김",
    "firstName": "은범",
    "phoneNumber": "010-1234-5678",
    "country": 1,
    "address1": "서울시 강남구",
    "address2": "역삼동 456",
    "birth": "1990-01-01T00:00:00",
    "bgImage": "http://localhost:9080/uploads/bg-new.jpg"
  }'
```

**백엔드 DTO (UserProfileUpdateRequest)**
```java
public class UserProfileUpdateRequest {
    // User 테이블
    private String name;           // 닉네임
    private String profileImage;   // 프로필 이미지 URL

    // UserProfile 테이블
    private String lastName;       // 성
    private String firstName;      // 이름
    private String phoneNumber;    // 전화번호
    private Long country;          // 국가 코드
    private String address1;       // 주소1
    private String address2;       // 주소2
    private LocalDateTime birth;   // 생년월일
    private String bgImage;        // 배경 이미지 URL
}
```

### 3.4 이미지 업로드 API

**요청**
```bash
curl -X POST http://localhost:9080/api/upload/image \
  -H "Authorization: Bearer {JWT_TOKEN}" \
  -F "file=@/path/to/image.jpg"
```

**응답**
```json
{
  "message": "이미지가 성공적으로 업로드되었습니다.",
  "data": {
    "imageUrl": "http://localhost:9080/uploads/abc-123.jpg",
    "fileName": "abc-123.jpg",
    "originalFileName": "my-photo.jpg",
    "fileSize": 245678,
    "contentType": "image/jpeg"
  }
}
```

---

## 4. 프론트엔드 구현

### 4.1 컴포넌트 구조

```
src/pages/Profile.jsx
├── 상태 관리 (useState)
│   ├── formData: 폼 데이터
│   ├── previewImage: 프로필 이미지 미리보기
│   ├── previewBackground: 배경 이미지 미리보기
│   ├── selectedFile: 선택된 프로필 이미지 파일
│   ├── selectedBackgroundFile: 선택된 배경 이미지 파일
│   ├── isLoading: 저장 중 상태
│   └── isLoadingProfile: 프로필 로딩 상태
│
├── 데이터 로딩 (useEffect)
│   └── 컴포넌트 마운트 시 GET /api/user/profile 호출
│
├── 이벤트 핸들러
│   ├── handleImageChange: 프로필 이미지 선택
│   ├── handleBackgroundChange: 배경 이미지 선택
│   ├── handleChange: 폼 필드 변경
│   └── handleSubmit: 폼 제출
│
└── 렌더링
    ├── 로딩 중: 로딩 표시
    └── 로딩 완료: 폼 표시
```

### 4.2 상태 관리 (useState)

```javascript
// 폼 데이터 상태
const [formData, setFormData] = useState({
  name: '',           // 닉네임
  lastName: '',       // 성
  firstName: '',      // 이름
  phoneNumber: '',    // 전화번호
  country: '1',       // 국가 코드 (기본값: 한국)
  address1: '',       // 주소1
  address2: '',       // 주소2
  birth: ''           // 생년월일
});

// 이미지 미리보기 URL (화면 표시용)
const [previewImage, setPreviewImage] = useState(null);
const [previewBackground, setPreviewBackground] = useState(null);

// 선택된 파일 (서버 업로드용)
const [selectedFile, setSelectedFile] = useState(null);
const [selectedBackgroundFile, setSelectedBackgroundFile] = useState(null);

// 로딩 상태
const [isLoading, setIsLoading] = useState(false);
const [isLoadingProfile, setIsLoadingProfile] = useState(true);
```

### 4.3 데이터 로딩 (useEffect)

```javascript
/**
 * 컴포넌트 마운트 시 프로필 데이터 로드
 *
 * 실행 시점: 컴포넌트가 화면에 처음 렌더링될 때
 * 의존성 배열: [accessToken] - 토큰이 변경되면 재실행
 */
useEffect(() => {
  const loadProfile = async () => {
    // 토큰이 없으면 로드하지 않음
    if (!accessToken) {
      setIsLoadingProfile(false);
      return;
    }

    try {
      // 프로필 조회 API 호출
      const response = await axios.get('/api/user/profile', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      // 응답 데이터로 상태 초기화
      if (response.data && response.data.data) {
        const profileData = response.data.data;

        // 이미지 URL 설정
        if (profileData.profileImage) {
          setPreviewImage(profileData.profileImage);
        }
        if (profileData.bgImage) {
          setPreviewBackground(profileData.bgImage);
        }

        // 폼 데이터 설정
        setFormData({
          name: profileData.name || '',
          lastName: profileData.lastName || '',
          firstName: profileData.firstName || '',
          phoneNumber: profileData.phoneNumber || '',
          country: profileData.country?.toString() || '1',
          address1: profileData.address1 || '',
          address2: profileData.address2 || '',
          // birth는 "2026-01-01T00:00:00" → "2026-01-01"로 변환
          birth: profileData.birth ? profileData.birth.split('T')[0] : ''
        });
      }
    } catch (error) {
      console.error('프로필 조회 실패:', error);
    } finally {
      setIsLoadingProfile(false);
    }
  };

  loadProfile();
}, [accessToken]);
```

### 4.4 폼 필드 변경 핸들러

```javascript
/**
 * 입력 필드 값 변경 처리
 *
 * @param {Event} e - 입력 이벤트 객체
 *
 * 동작 원리:
 * 1. e.target에서 name(필드명)과 value(값) 추출
 * 2. 스프레드 연산자로 기존 상태 복사
 * 3. 변경된 필드만 새 값으로 덮어씀
 */
const handleChange = (e) => {
  const { name, value } = e.target;

  setFormData(prev => ({
    ...prev,        // 기존 값 유지
    [name]: value   // 변경된 필드만 업데이트
  }));
};
```

**사용 예시 (JSX)**
```jsx
<input
  type="text"
  name="lastName"           // 이 값이 handleChange의 name으로 전달
  value={formData.lastName} // 상태와 연결 (controlled component)
  onChange={handleChange}   // 값 변경 시 호출
  placeholder="성을 입력하세요"
/>
```

---

## 5. 이미지 업로드 구현

### 5.1 핵심 개념: FileReader

**FileReader란?**
- JavaScript Web API에서 제공하는 내장 객체
- 브라우저에서 파일을 비동기적으로 읽을 수 있음
- 별도 설치 불필요 (브라우저 내장)

**주요 메서드**
| 메서드 | 설명 | 용도 |
|--------|------|------|
| `readAsDataURL(file)` | Base64 Data URL로 변환 | 이미지 미리보기 |
| `readAsText(file)` | 텍스트로 읽기 | 텍스트 파일 |
| `readAsArrayBuffer(file)` | 바이너리로 읽기 | 바이너리 처리 |

### 5.2 이미지 선택 및 미리보기

```javascript
/**
 * 이미지 파일 선택 처리
 *
 * 핵심: FileReader를 사용하여 서버 전송 없이 미리보기 생성
 */
const handleImageChange = (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  // 1. 파일 유효성 검사
  if (!file.type.startsWith('image/')) {
    alert('이미지 파일만 업로드할 수 있습니다.');
    return;
  }

  // 2. 파일 크기 제한 (5MB)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    alert('파일 크기는 5MB 이하여야 합니다.');
    return;
  }

  // 3. 파일 저장 (서버 전송용)
  setSelectedFile(file);

  // 4. FileReader로 미리보기 생성
  const reader = new FileReader();

  // 파일 읽기 완료 시 콜백
  reader.onloadend = () => {
    // reader.result에 Base64 Data URL이 담김
    // 예: "data:image/png;base64,iVBORw0KGgo..."
    setPreviewImage(reader.result);
  };

  // 파일을 Data URL로 읽기 시작
  reader.readAsDataURL(file);
};
```

**미리보기 동작 흐름**
```
[사용자가 파일 선택]
         ↓
[handleImageChange 호출]
         ↓
[파일 유효성 검사]
         ↓
[FileReader.readAsDataURL(file)]
         ↓
[브라우저가 파일을 비동기로 읽음]
         ↓
[읽기 완료 → onloadend 콜백]
         ↓
[reader.result에 Base64 문자열]
         ↓
[setPreviewImage(reader.result)]
         ↓
[<img src={previewImage} />로 미리보기 표시]
```

### 5.3 이미지 업로드 함수

```javascript
/**
 * 이미지를 서버에 업로드하고 URL을 반환
 *
 * @param {File} file - 업로드할 파일
 * @param {string} type - 이미지 타입 (로깅용)
 * @returns {Promise<string|null>} - 업로드된 이미지 URL
 */
const uploadImage = async (file, type) => {
  if (!file) return null;

  // 1. FormData 객체 생성 (multipart/form-data 전송용)
  const uploadFormData = new FormData();
  uploadFormData.append('file', file);  // 'file'은 백엔드에서 받는 필드명

  try {
    // 2. 이미지 업로드 API 호출
    const response = await axios.post('/api/upload/image', uploadFormData, {
      headers: {
        // Content-Type은 axios가 자동 설정 (boundary 포함)
        'Authorization': `Bearer ${accessToken}`
      }
    });

    // 3. 응답에서 이미지 URL 추출
    if (response.data?.data?.imageUrl) {
      return response.data.data.imageUrl;
    }

    return null;
  } catch (error) {
    console.error(`${type} 이미지 업로드 실패:`, error);
    return null;
  }
};
```

### 5.4 폼 제출 (저장 버튼 클릭)

```javascript
/**
 * 프로필 수정 폼 제출
 *
 * 핵심: 이미지를 먼저 업로드하고, 반환된 URL을 프로필 데이터에 포함
 */
const handleSubmit = async (e) => {
  e.preventDefault();  // 폼 기본 동작 방지

  // 유효성 검사
  if (!validateForm()) return;

  setIsLoading(true);

  try {
    // 1. 이미지 URL 초기화 (기존 URL 유지)
    let profileImageUrl = previewImage;
    let bgImageUrl = previewBackground;

    // 2. 새 파일이 선택된 경우에만 업로드
    if (selectedFile) {
      const uploadedUrl = await uploadImage(selectedFile, 'profile');
      if (uploadedUrl) {
        profileImageUrl = uploadedUrl;
      }
    }

    if (selectedBackgroundFile) {
      const uploadedUrl = await uploadImage(selectedBackgroundFile, 'background');
      if (uploadedUrl) {
        bgImageUrl = uploadedUrl;
      }
    }

    // 3. 프로필 수정 요청 데이터 구성
    const requestData = {
      name: formData.name,
      profileImage: profileImageUrl || null,
      lastName: formData.lastName || null,
      firstName: formData.firstName || null,
      phoneNumber: formData.phoneNumber || null,
      country: parseInt(formData.country, 10),
      address1: formData.address1 || null,
      address2: formData.address2 || null,
      birth: formData.birth ? `${formData.birth}T00:00:00` : null,
      bgImage: bgImageUrl || null
    };

    // 4. 프로필 수정 API 호출
    const response = await axios.put('/api/user/profile', requestData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (response.data?.success) {
      alert('프로필이 수정되었습니다.');
      navigate('/');
    }
  } catch (error) {
    console.error('프로필 수정 에러:', error);
    alert('프로필 수정에 실패했습니다.');
  } finally {
    setIsLoading(false);
  }
};
```

### 5.5 이미지 URL 유지 로직

**문제 상황**
```javascript
// ❌ 잘못된 코드: 새 파일을 선택하지 않으면 기존 이미지가 삭제됨
let profileImageUrl = null;
if (selectedFile) {
  profileImageUrl = await uploadImage(selectedFile, 'profile');
}
// selectedFile이 없으면 profileImageUrl = null → 기존 이미지 삭제!
```

**해결 방법**
```javascript
// ✅ 올바른 코드: 기존 URL로 초기화하여 유지
let profileImageUrl = previewImage;  // 기존 이미지 URL
if (selectedFile) {
  const uploadedUrl = await uploadImage(selectedFile, 'profile');
  if (uploadedUrl) {
    profileImageUrl = uploadedUrl;  // 새 URL로 교체
  }
}
// selectedFile이 없으면 기존 profileImageUrl 유지!
```

---

## 6. 전체 흐름 정리

### 6.1 프로필 페이지 진입 시

```
1. Profile 컴포넌트 마운트
         ↓
2. isLoadingProfile = true
   → "프로필 정보를 불러오는 중..." 표시
         ↓
3. useEffect 실행
   → GET /api/user/profile 호출
         ↓
4. 응답 데이터로 상태 초기화
   - setPreviewImage(profileImage)
   - setPreviewBackground(bgImage)
   - setFormData({...})
         ↓
5. isLoadingProfile = false
   → 폼 렌더링
```

### 6.2 프로필 저장 시

```
1. 사용자가 저장 버튼 클릭
         ↓
2. handleSubmit 실행
         ↓
3. 유효성 검사 (validateForm)
         ↓
4. 이미지 업로드 (새로 선택한 경우만)
   ├─ 프로필 이미지: POST /api/upload/image → URL 반환
   └─ 배경 이미지: POST /api/upload/image → URL 반환
         ↓
5. 프로필 수정 요청
   PUT /api/user/profile
   {
     name, profileImage, lastName, firstName,
     phoneNumber, country, address1, address2,
     birth, bgImage
   }
         ↓
6. 성공 시 홈으로 이동
```

### 6.3 데이터 흐름 다이어그램

```
┌─────────────────────────────────────────────────────────────────┐
│                    사용자 인터페이스                              │
│                                                                 │
│  ┌──────────────────┐      ┌──────────────────┐                │
│  │   배경 이미지      │      │   프로필 이미지    │                │
│  │   [클릭하여 변경]  │      │   [클릭하여 변경]  │                │
│  └────────┬─────────┘      └────────┬─────────┘                │
│           │                         │                          │
│           ▼                         ▼                          │
│  ┌──────────────────────────────────────────────┐              │
│  │              FileReader (미리보기)             │              │
│  │                                              │              │
│  │  file → readAsDataURL → Base64 → <img src>  │              │
│  └──────────────────────────────────────────────┘              │
│                                                                 │
│  ┌──────────────────────────────────────────────┐              │
│  │              폼 입력 필드들                    │              │
│  │  닉네임, 성, 이름, 전화번호, 주소, 생년월일     │              │
│  └──────────────────────────────────────────────┘              │
│                                                                 │
│                    [저장 버튼]                                   │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                       handleSubmit                              │
│                                                                 │
│  1. 새 이미지가 있으면 업로드                                     │
│     POST /api/upload/image (multipart/form-data)               │
│     → 이미지 URL 반환                                           │
│                                                                 │
│  2. 프로필 수정 요청                                             │
│     PUT /api/user/profile (application/json)                   │
│     { name, profileImage, bgImage, ... }                       │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                     백엔드 서버                                   │
│                                                                 │
│  POST /api/upload/image                                        │
│  → 파일 저장 → URL 반환                                         │
│                                                                 │
│  PUT /api/user/profile                                         │
│  → User 테이블 업데이트 (name, profileImage)                     │
│  → UserProfile 테이블 업데이트 (나머지 필드)                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. 실습 과제

### 과제 1: 프로필 조회 API 연동
1. `useEffect`를 사용하여 컴포넌트 마운트 시 프로필 데이터를 불러오세요.
2. 불러온 데이터를 폼에 초기값으로 설정하세요.

### 과제 2: 이미지 미리보기 구현
1. `FileReader`를 사용하여 이미지 선택 시 미리보기를 표시하세요.
2. 파일 유효성 검사(타입, 크기)를 추가하세요.

### 과제 3: 이미지 업로드 구현
1. `FormData`를 사용하여 이미지를 서버에 업로드하세요.
2. 업로드된 이미지 URL을 프로필 수정 요청에 포함하세요.

### 과제 4: 기존 이미지 유지 로직
1. 새 이미지를 선택하지 않았을 때 기존 이미지 URL을 유지하도록 구현하세요.

### 참고 코드
- [Profile.jsx](../src/pages/Profile.jsx) - 프로필 수정 페이지
- [Profile.css](../src/pages/Profile.css) - 스타일

---

## 부록: 주요 용어 정리

| 용어 | 설명 |
|------|------|
| **useState** | React 훅. 컴포넌트의 상태를 관리 |
| **useEffect** | React 훅. 컴포넌트 생명주기에 따른 부수 효과 처리 |
| **FileReader** | 브라우저 내장 API. 파일을 비동기로 읽음 |
| **FormData** | 폼 데이터를 multipart/form-data로 전송할 때 사용 |
| **Base64** | 바이너리 데이터를 텍스트로 인코딩하는 방식 |
| **Data URL** | `data:image/png;base64,...` 형식의 인라인 데이터 |
| **multipart/form-data** | 파일 업로드에 사용되는 HTTP Content-Type |
| **Controlled Component** | React에서 폼 값을 상태로 관리하는 패턴 |
| **JWT** | JSON Web Token. 인증에 사용되는 토큰 형식 |

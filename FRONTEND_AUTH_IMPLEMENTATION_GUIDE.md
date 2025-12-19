# 프론트엔드 인증 시스템 구축 가이드

React + JWT 기반 인증 시스템 구현 순서

---

## 📚 목차

1. [프로젝트 초기 설정](#1-프로젝트-초기-설정)
2. [인증 Context 구조 설계](#2-인증-context-구조-설계)
3. [AuthContext 생성](#3-authcontext-생성)
4. [AuthProvider 구현](#4-authprovider-구현)
5. [useAuth 커스텀 훅 생성](#5-useauth-커스텀-훅-생성)
6. [App.jsx에 AuthProvider 적용](#6-appjsx에-authprovider-적용)
7. [회원가입 페이지 구현](#7-회원가입-페이지-구현)
8. [일반 로그인 페이지 구현](#8-일반-로그인-페이지-구현)
9. [카카오 로그인 구현](#9-카카오-로그인-구현)
10. [OAuth 콜백 페이지 구현](#10-oauth-콜백-페이지-구현)
11. [로그아웃 기능 구현](#11-로그아웃-기능-구현)
12. [GNB(네비게이션 바) 구현](#12-gnb네비게이션-바-구현)
13. [테스트 및 검증](#13-테스트-및-검증)

---

## 1. 프로젝트 초기 설정

### 1-1. 필요한 패키지 설치

```bash
# React Router 설치
npm install react-router-dom

# Axios 설치 (HTTP 클라이언트)
npm install axios
```

### 1-2. 프로젝트 폴더 구조 생성

```
src/
├── contexts/          # Context API 관련 파일
│   ├── AuthContext.jsx
│   └── AuthProvider.jsx
├── hooks/            # 커스텀 훅
│   └── useAuth.js
├── pages/            # 페이지 컴포넌트
│   ├── Login.jsx
│   ├── Register.jsx
│   ├── OAuthCallback.jsx
│   └── Home.jsx
├── components/       # 재사용 컴포넌트
│   └── Gnb.jsx
├── App.jsx
└── main.jsx
```

### 1-3. Vite Proxy 설정 (vite.config.js)

**목적:** CORS 문제 해결 및 개발 편의성 향상

```javascript
// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:9080',  // 백엔드 서버 주소
        changeOrigin: true,
        secure: false
      }
    }
  }
})
```

**설명:**
- 프론트엔드에서 `/api`로 시작하는 요청은 자동으로 `http://localhost:9080`으로 전달됨
- CORS 문제 없이 개발 가능

---

## 2. 인증 Context 구조 설계

### 2-1. 인증 시스템 아키텍처

```text
┌─────────────────────────────────────────────────────────────┐
│                      AuthProvider                            │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  State:                                                │  │
│  │  - user: 현재 로그인한 사용자 정보                      │  │
│  │  - accessToken: JWT Access Token (메모리)              │  │
│  │  - isLoading: 초기 로딩 상태                           │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Functions:                                            │  │
│  │  - login(userData, token): 로그인 처리                 │  │
│  │  - logout(): 로그아웃 처리                             │  │
│  │  - refreshAccessToken(): 토큰 갱신                     │  │
│  │  - updateToken(newToken): 토큰 업데이트               │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
│  Context Value 제공:                                          │
│  { user, accessToken, isLoading, login, logout,              │
│    refreshAccessToken, updateToken, isAuthenticated }        │
└─────────────────────────────────────────────────────────────┘
                              ↓
                    모든 하위 컴포넌트가 접근 가능
                              ↓
        ┌─────────────┬─────────────┬─────────────┐
        │   Login     │     GNB     │  Protected  │
        │    Page     │             │    Pages    │
        └─────────────┴─────────────┴─────────────┘
```

### 2-2. 토큰 관리 전략

| 토큰 종류 | 저장 위치 | 유효기간 | 접근 방법 | 보안 특성 |
|----------|----------|---------|----------|----------|
| **Access Token** | React State (메모리) | 1시간 | AuthContext | 페이지 새로고침 시 사라짐 |
| **Refresh Token** | HTTP-only 쿠키 | 7일 | 브라우저 자동 관리 | JavaScript 접근 불가 (XSS 방어) |
| **사용자 정보** | React State + localStorage | - | AuthContext | UX 개선용 |

**보안 원칙:**
1. ✅ Access Token은 **절대** localStorage에 저장하지 않음
2. ✅ Refresh Token은 HTTP-only 쿠키로만 관리
3. ✅ 페이지 새로고침 시 `/api/refresh`로 토큰 재발급

---

## 3. AuthContext 생성

**파일:** `src/contexts/AuthContext.jsx`

### 3-1. Context 파일 생성

```jsx
import { createContext } from 'react';

/**
 * AuthContext
 *
 * 인증 관련 데이터와 함수를 전역으로 공유하기 위한 Context입니다.
 *
 * 제공하는 값:
 * - user: 현재 로그인한 사용자 정보 (null이면 비로그인)
 * - accessToken: JWT Access Token
 * - isLoading: 인증 상태 확인 중인지 여부
 * - login(userData, token): 로그인 함수
 * - logout(): 로그아웃 함수
 * - refreshAccessToken(): 토큰 갱신 함수
 * - updateToken(newToken): 토큰 업데이트 함수
 * - isAuthenticated: 로그인 여부 (boolean)
 */
const AuthContext = createContext(null);

export default AuthContext;
```

**핵심 포인트:**
- `createContext(null)`: 초기값은 null (Provider가 값을 제공)
- 타입 안정성을 위해 JSDoc 주석 추가
- 다른 파일에서 import하여 사용

---

## 4. AuthProvider 구현

**파일:** `src/contexts/AuthProvider.jsx`

### 4-1. 기본 구조 생성

```jsx
import { useState, useEffect } from 'react';
import axios from 'axios';
import AuthContext from './AuthContext';

export function AuthProvider({ children }) {
  // State 선언
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Context에 제공할 값
  const value = {
    user,
    accessToken,
    isLoading,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
```

### 4-2. login 함수 구현

```jsx
/**
 * login 함수
 *
 * 로그인 성공 시 호출되는 함수입니다.
 *
 * @param {Object} userData - 서버로부터 받은 사용자 정보
 * @param {string} token - Access Token
 */
const login = (userData, token) => {
  // 1. React State에 저장 (메모리)
  setUser(userData);
  setAccessToken(token);

  // 2. localStorage에는 사용자 정보만 저장 (UX 개선용)
  // Access Token은 보안을 위해 localStorage에 저장하지 않음!
  localStorage.setItem('user', JSON.stringify(userData));
};
```

**왜 이렇게 저장하나요?**
- **React State**: 현재 세션에서 사용 (API 요청 시 Authorization 헤더에 사용)
- **localStorage**: 페이지 새로고침 시 사용자 이름을 바로 표시하기 위함
- **Access Token은 localStorage에 저장 안 함**: XSS 공격 방어

### 4-3. logout 함수 구현

```jsx
/**
 * logout 함수
 *
 * 로그아웃 시 호출되는 함수입니다.
 * 서버에 로그아웃 요청을 보내고 저장된 모든 인증 정보를 삭제합니다.
 */
const logout = async () => {
  try {
    // 1. 백엔드에 로그아웃 요청
    // HTTP-only 쿠키의 refreshToken을 삭제하기 위해 서버 호출 필요
    await axios.post('/api/logout', {}, {
      withCredentials: true  // 🔒 쿠키 전송 필수
    });

    console.log('서버 로그아웃 성공');
  } catch (error) {
    // 서버 로그아웃 실패 시에도 클라이언트 상태는 정리
    console.error('서버 로그아웃 실패:', error);
    console.log('클라이언트 상태만 정리합니다.');
  } finally {
    // 2. 클라이언트 상태 정리 (서버 성공/실패 관계없이 실행)
    setUser(null);
    setAccessToken(null);
    localStorage.removeItem('user');

    console.log('클라이언트 로그아웃 완료');
  }
};
```

**핵심 포인트:**
- `withCredentials: true`: HTTP-only 쿠키 전송 필수
- `try/catch/finally` 패턴: 서버 에러가 있어도 클라이언트 상태는 정리
- HTTP-only 쿠키는 서버만 삭제 가능

### 4-4. refreshAccessToken 함수 구현

```jsx
/**
 * refreshAccessToken 함수
 *
 * HTTP-only 쿠키에 저장된 Refresh Token을 사용하여
 * 새로운 Access Token을 발급받는 함수입니다.
 *
 * @returns {Promise<string>} - 새로운 accessToken
 */
const refreshAccessToken = async () => {
  try {
    console.log('=== /api/refresh 호출 시작 ===');
    console.log('현재 쿠키:', document.cookie);

    // /api/refresh 엔드포인트 호출
    const response = await axios.post('/api/refresh', {}, {
      withCredentials: true,  // 🔒 HTTP-only 쿠키 전송 필수
      headers: { 'Content-Type': 'application/json' }
    });

    console.log('=== /api/refresh 응답 성공 ===');
    console.log('응답 데이터:', response.data);

    if (response.data.success) {
      const newAccessToken = response.data.data.accessToken;
      const userData = response.data.data.user;

      // 상태 업데이트
      setUser(userData);
      setAccessToken(newAccessToken);
      localStorage.setItem('user', JSON.stringify(userData));

      console.log('Access Token 갱신 성공');
      return newAccessToken;
    } else {
      throw new Error(response.data.message || '토큰 갱신에 실패했습니다.');
    }
  } catch (error) {
    console.error('=== /api/refresh 요청 실패 ===');
    console.error('에러:', error);

    // Refresh Token도 만료된 경우 로그아웃 처리
    setUser(null);
    setAccessToken(null);
    localStorage.removeItem('user');

    throw error;
  }
};
```

### 4-5. 페이지 로드 시 인증 복원 (useEffect)

```jsx
useEffect(() => {
  const checkAuth = async () => {
    // 1. 이미 로그인된 상태라면 API 호출 생략
    if (user && accessToken) {
      console.log('이미 로그인된 상태 - /refresh API 호출 생략');
      setIsLoading(false);
      return;
    }

    // 2. localStorage에서 사용자 정보 확인
    const savedUser = localStorage.getItem('user');

    if (!savedUser) {
      // 로그인 이력이 없으면 API 호출 불필요
      console.log('로그인 이력 없음 - /refresh API 호출 생략');
      setIsLoading(false);
      return;
    }

    // 3. 사용자 정보가 있으면 토큰 갱신 시도
    try {
      console.log('=== /api/refresh 호출 (페이지 새로고침) ===');
      console.log('localStorage의 user:', savedUser);

      const response = await axios.post('/api/refresh', {}, {
        withCredentials: true
      });

      if (response.data.success) {
        // 토큰 갱신 성공: 사용자 정보와 새 accessToken 저장
        const token = response.data.data.accessToken;

        // 백엔드가 user 정보를 반환하는 경우와 안 하는 경우 모두 처리
        let userData = response.data.data.user;

        // 백엔드가 user 정보를 반환하지 않으면 localStorage에서 가져옴
        if (!userData) {
          console.log('백엔드가 user 정보를 반환하지 않음 - localStorage에서 복원');
          userData = JSON.parse(savedUser);
        }

        setUser(userData);
        setAccessToken(token);

        // localStorage에는 사용자 정보만 저장
        localStorage.setItem('user', JSON.stringify(userData));
        console.log('토큰 갱신 성공 - 상태 업데이트 완료');
      } else {
        console.log('토큰 갱신 실패:', response.data.message);
        localStorage.removeItem('user');
      }
    } catch (error) {
      console.error('=== /api/refresh 요청 실패 ===');
      console.error('에러:', error);
      localStorage.removeItem('user');
    } finally {
      setIsLoading(false);
    }
  };

  checkAuth();
}, []); // 빈 배열: 컴포넌트 마운트 시 한 번만 실행
```

**이 코드의 역할:**
1. **페이지 새로고침 시 자동 로그인**: Refresh Token이 유효하면 자동으로 Access Token 발급
2. **최적화**: 이미 로그인된 상태면 API 호출 안 함
3. **백엔드 호환성**: 백엔드가 user 정보를 반환하지 않아도 localStorage에서 복원
4. **에러 처리**: Refresh Token이 만료되면 로그아웃 상태 유지

### 4-6. updateToken 함수 구현

```jsx
/**
 * updateToken 함수
 *
 * Access Token만 업데이트하는 함수입니다.
 *
 * @param {string} newToken - 새로운 Access Token
 */
const updateToken = (newToken) => {
  setAccessToken(newToken);
};
```

### 4-7. 최종 value 객체 및 return

```jsx
// Context에 제공할 값
const value = {
  user,                // 현재 로그인한 사용자 정보
  accessToken,         // 현재 Access Token
  isLoading,           // 로딩 상태
  login,               // 로그인 함수
  logout,              // 로그아웃 함수
  updateToken,         // 토큰 갱신 함수
  refreshAccessToken,  // Refresh Token으로 Access Token 갱신
  isAuthenticated: !!user  // 로그인 여부
};

return (
  <AuthContext.Provider value={value}>
    {children}
  </AuthContext.Provider>
);
```

---

## 5. useAuth 커스텀 훅 생성

**파일:** `src/hooks/useAuth.js`

```javascript
import { useContext } from 'react';
import AuthContext from '../contexts/AuthContext';

/**
 * useAuth 커스텀 훅
 *
 * AuthContext의 값을 쉽게 사용하기 위한 훅입니다.
 *
 * @returns {Object} AuthContext의 값
 * @throws {Error} Provider 외부에서 사용 시 에러
 *
 * @example
 * function MyComponent() {
 *   const { user, login, logout } = useAuth();
 *   // ...
 * }
 */
export function useAuth() {
  const context = useContext(AuthContext);

  // Context가 없으면 에러 발생
  if (!context) {
    throw new Error('useAuth는 AuthProvider 내부에서만 사용할 수 있습니다.');
  }

  return context;
}
```

**사용 예시:**
```jsx
// 다른 컴포넌트에서
import { useAuth } from '../hooks/useAuth';

function MyComponent() {
  const { user, isAuthenticated, logout } = useAuth();

  if (!isAuthenticated) {
    return <div>로그인이 필요합니다.</div>;
  }

  return <div>안녕하세요, {user.name}님!</div>;
}
```

---

## 6. App.jsx에 AuthProvider 적용

**파일:** `src/App.jsx`

```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthProvider';
import Gnb from './components/Gnb';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import OAuthCallback from './pages/OAuthCallback';

function App() {
  return (
    // 🔑 중요: AuthProvider로 전체 앱을 감싸야 함
    <AuthProvider>
      <BrowserRouter>
        {/* GNB는 모든 페이지에서 보여짐 */}
        <Gnb />

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/oauth/callback" element={<OAuthCallback />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
```

**핵심 포인트:**
- `<AuthProvider>`가 가장 바깥쪽에 위치
- `<BrowserRouter>` 안에 있는 모든 컴포넌트가 `useAuth()` 사용 가능
- GNB는 Routes 밖에 위치하여 모든 페이지에서 표시됨

---

## 7. 회원가입 페이지 구현

**파일:** `src/pages/Register.jsx`

### 7-1. 기본 구조 생성

```jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Register.css';

function Register() {
  const navigate = useNavigate();

  // 폼 데이터 상태
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    passwordConfirm: '',
    name: ''
  });

  // 에러 메시지 상태
  const [error, setError] = useState('');

  // 로딩 상태
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div className="register-container">
      <div className="register-card">
        <h2>회원가입</h2>
        {/* 폼 구현 */}
      </div>
    </div>
  );
}

export default Register;
```

### 7-2. 입력 핸들러 구현

```jsx
/**
 * handleChange 함수
 *
 * 입력 필드의 값이 변경될 때 호출됩니다.
 *
 * @param {Event} e - 이벤트 객체
 */
const handleChange = (e) => {
  const { name, value } = e.target;

  // formData 상태 업데이트
  setFormData(prev => ({
    ...prev,
    [name]: value
  }));
};
```

### 7-3. 폼 제출 핸들러 구현

```jsx
/**
 * handleSubmit 함수
 *
 * 회원가입 폼 제출 시 호출됩니다.
 *
 * @param {Event} e - 폼 제출 이벤트
 */
const handleSubmit = async (e) => {
  e.preventDefault();  // 기본 폼 제출 동작 방지
  setError('');  // 이전 에러 메시지 초기화

  // 1. 클라이언트 측 유효성 검사
  if (formData.password !== formData.passwordConfirm) {
    setError('비밀번호가 일치하지 않습니다.');
    return;
  }

  if (formData.password.length < 8) {
    setError('비밀번호는 8자 이상이어야 합니다.');
    return;
  }

  // 2. 로딩 시작
  setIsLoading(true);

  try {
    // 3. 백엔드에 회원가입 요청
    const response = await axios.post('/api/register', {
      email: formData.email,
      password: formData.password,
      name: formData.name
    });

    // 4. 성공 처리
    if (response.data.success) {
      alert('회원가입이 완료되었습니다! 로그인해주세요.');
      navigate('/login');  // 로그인 페이지로 이동
    } else {
      setError(response.data.message || '회원가입에 실패했습니다.');
    }
  } catch (error) {
    // 5. 에러 처리
    console.error('회원가입 에러:', error);

    if (error.response?.data?.message) {
      setError(error.response.data.message);
    } else {
      setError('회원가입 중 오류가 발생했습니다.');
    }
  } finally {
    // 6. 로딩 종료
    setIsLoading(false);
  }
};
```

### 7-4. JSX 렌더링

```jsx
return (
  <div className="register-container">
    <div className="register-card">
      <h2>회원가입</h2>

      {/* 에러 메시지 표시 */}
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* 이메일 입력 */}
        <div className="form-group">
          <label htmlFor="email">이메일</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            placeholder="example@email.com"
          />
        </div>

        {/* 이름 입력 */}
        <div className="form-group">
          <label htmlFor="name">이름</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            placeholder="홍길동"
          />
        </div>

        {/* 비밀번호 입력 */}
        <div className="form-group">
          <label htmlFor="password">비밀번호</label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            placeholder="8자 이상"
            minLength={8}
          />
        </div>

        {/* 비밀번호 확인 */}
        <div className="form-group">
          <label htmlFor="passwordConfirm">비밀번호 확인</label>
          <input
            type="password"
            id="passwordConfirm"
            name="passwordConfirm"
            value={formData.passwordConfirm}
            onChange={handleChange}
            required
            placeholder="비밀번호 재입력"
          />
        </div>

        {/* 제출 버튼 */}
        <button
          type="submit"
          className="submit-button"
          disabled={isLoading}
        >
          {isLoading ? '처리 중...' : '회원가입'}
        </button>
      </form>

      {/* 로그인 페이지 링크 */}
      <div className="link-container">
        <p>
          이미 계정이 있으신가요?{' '}
          <a href="/login">로그인</a>
        </p>
      </div>
    </div>
  </div>
);
```

---

## 8. 일반 로그인 페이지 구현

**파일:** `src/pages/Login.jsx`

### 8-1. 기본 구조 생성

```jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import axios from 'axios';
import './Login.css';

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();  // 🔑 useAuth 훅 사용

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div className="login-container">
      {/* 폼 구현 */}
    </div>
  );
}

export default Login;
```

### 8-2. 이메일 로그인 핸들러 구현

```jsx
/**
 * handleEmailLogin 함수
 *
 * 이메일/비밀번호로 로그인합니다.
 *
 * @param {Event} e - 폼 제출 이벤트
 */
const handleEmailLogin = async (e) => {
  e.preventDefault();
  setError('');
  setIsLoading(true);

  try {
    // 1. 백엔드에 로그인 요청
    const response = await axios.post('/api/loginEx', {
      email: formData.email,
      password: formData.password
    }, {
      withCredentials: true  // 🔒 쿠키 수신 필수
    });

    console.log('로그인 응답:', response.data);

    // 2. 성공 처리
    if (response.data.success) {
      const { accessToken, user } = response.data.data;

      // 3. AuthContext에 로그인 정보 저장
      login(user, accessToken);

      // 4. 성공 메시지 및 페이지 이동
      alert('로그인 성공!');
      navigate('/');
    } else {
      setError(response.data.message || '로그인에 실패했습니다.');
    }
  } catch (error) {
    console.error('로그인 에러:', error);

    if (error.response?.data?.message) {
      setError(error.response.data.message);
    } else {
      setError('로그인 중 오류가 발생했습니다.');
    }
  } finally {
    setIsLoading(false);
  }
};
```

### 8-3. 카카오 로그인 핸들러 구현

```jsx
/**
 * handleKakaoLogin 함수
 *
 * 카카오 소셜 로그인을 시작합니다.
 * 전체 페이지를 백엔드의 카카오 로그인 엔드포인트로 리다이렉트합니다.
 */
const handleKakaoLogin = () => {
  // 백엔드의 카카오 로그인 시작 엔드포인트로 전체 페이지 리다이렉트
  // - 현재 React 앱은 언마운트됨
  // - 백엔드가 카카오 인증 서버로 다시 리다이렉트
  // - 인증 완료 후 /oauth/callback으로 돌아옴
  window.location.href = '/api/auth/kakao/login';
};
```

**왜 `window.location.href`를 사용하나요?**
- OAuth는 전체 페이지 리다이렉트가 필요
- `navigate()` 사용 불가 (SPA 내부 라우팅이므로)
- 카카오 인증 페이지로 이동 후 다시 돌아와야 함

### 8-4. JSX 렌더링

```jsx
return (
  <div className="login-container">
    <div className="login-card">
      <h2>로그인</h2>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {/* 이메일 로그인 폼 */}
      <form onSubmit={handleEmailLogin}>
        <div className="form-group">
          <label htmlFor="email">이메일</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              email: e.target.value
            }))}
            required
            placeholder="example@email.com"
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">비밀번호</label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              password: e.target.value
            }))}
            required
            placeholder="비밀번호"
          />
        </div>

        <button
          type="submit"
          className="submit-button"
          disabled={isLoading}
        >
          {isLoading ? '로그인 중...' : '로그인'}
        </button>
      </form>

      {/* 구분선 */}
      <div className="divider">
        <span>또는</span>
      </div>

      {/* 카카오 로그인 버튼 */}
      <button
        type="button"
        className="kakao-login-button"
        onClick={handleKakaoLogin}
      >
        <svg className="kakao-icon" width="18" height="18" viewBox="0 0 18 18">
          <path d="M9 0C4.029 0 0 3.285 0 7.333c0 2.55 1.65 4.794 4.14 6.075l-1.05 3.87c-.09.33.24.6.54.45l4.56-3.03c.27.03.54.045.81.045 4.971 0 9-3.285 9-7.333C18 3.285 13.971 0 9 0z" fill="currentColor"/>
        </svg>
        카카오 로그인
      </button>

      {/* 회원가입 링크 */}
      <div className="link-container">
        <p>
          계정이 없으신가요?{' '}
          <a href="/register">회원가입</a>
        </p>
      </div>
    </div>
  </div>
);
```

---

## 9. 카카오 로그인 구현

### 9-1. 카카오 로그인 플로우 이해

```text
[1단계] 사용자가 "카카오 로그인" 버튼 클릭
         ↓
    window.location.href = '/api/auth/kakao/login'
         ↓
[2단계] 백엔드가 카카오 인증 서버로 리다이렉트
         ↓
    https://kauth.kakao.com/oauth/authorize?client_id=...
         ↓
[3단계] 사용자가 카카오 계정으로 로그인 및 동의
         ↓
[4단계] 카카오가 백엔드 콜백 URL로 리다이렉트
         ↓
    GET /api/auth/kakao/callback?code=...
         ↓
[5단계] 백엔드가 JWT 토큰 생성 후 세션에 저장
         ↓
    백엔드가 프론트엔드로 리다이렉트
         ↓
    http://localhost:5173/oauth/callback?status=success
         ↓
[6단계] OAuthCallback 컴포넌트가 토큰 교환 API 호출
         ↓
    POST /api/auth/kakao/exchange-token
         ↓
[7단계] 백엔드가 세션에서 토큰을 꺼내서 응답
         - Refresh Token → HTTP-only 쿠키
         - Access Token → JSON 응답
         ↓
[8단계] 프론트엔드가 login(user, accessToken) 호출
         ↓
[9단계] 홈 페이지로 이동 (로그인 완료!)
```

### 9-2. Login.jsx의 카카오 버튼 (재확인)

```jsx
// 이미 8-3에서 구현했음
const handleKakaoLogin = () => {
  window.location.href = '/api/auth/kakao/login';
};
```

---

## 10. OAuth 콜백 페이지 구현

**파일:** `src/pages/OAuthCallback.jsx`

### 10-1. 기본 구조 생성

```jsx
import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import axios from 'axios';
import './OAuthCallback.css';

function OAuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // 🔒 중복 실행 방지 플래그
  const hasExecutedRef = useRef(false);

  return (
    <div className="oauth-callback-container">
      {/* 로딩 UI */}
    </div>
  );
}

export default OAuthCallback;
```

### 10-2. useEffect로 콜백 처리

```jsx
useEffect(() => {
  // 🔒 중복 실행 방지
  if (hasExecutedRef.current) {
    console.log('이미 토큰 교환을 실행했으므로 중복 실행 방지');
    return;
  }
  hasExecutedRef.current = true;

  const handleCallback = async () => {
    try {
      // 1. URL 파라미터 확인
      const status = searchParams.get('status');
      const errorMessage = searchParams.get('error');

      console.log('=== 카카오 OAuth 콜백 처리 시작 ===');
      console.log('status:', status);
      console.log('errorMessage:', errorMessage);

      // 2. 에러 처리
      if (errorMessage) {
        console.error('카카오 로그인 실패:', decodeURIComponent(errorMessage));
        setError(decodeURIComponent(errorMessage));
        setIsLoading(false);
        setTimeout(() => navigate('/login'), 3000);
        return;
      }

      // 3. 성공 처리 - 토큰 교환 요청
      if (status === 'success') {
        try {
          console.log('카카오 로그인 성공 - 토큰 교환 API 호출 시작');

          // 백엔드에 토큰 교환 요청
          const response = await axios.post('/api/auth/kakao/exchange-token', {}, {
            withCredentials: true  // 🔒 세션 쿠키 전송 필수
          });

          console.log('토큰 교환 응답:', response.data);

          if (response.data.success) {
            const { accessToken, user } = response.data.data;

            console.log('로그인 성공 - 사용자:', user.email);

            // AuthContext에 로그인 정보 저장
            login(user, accessToken);

            alert('카카오 로그인 성공!');

            // 홈 페이지로 이동 (replace: true로 히스토리 제거)
            navigate('/', { replace: true });
          } else {
            throw new Error(response.data.message || '토큰 교환 실패');
          }
        } catch (error) {
          console.error('토큰 교환 실패:', error);
          setError('로그인 처리 중 오류가 발생했습니다.');
          setIsLoading(false);
          setTimeout(() => navigate('/login'), 3000);
        }
      } else {
        console.error('알 수 없는 콜백 상태:', status);
        setError('알 수 없는 오류가 발생했습니다.');
        setIsLoading(false);
        setTimeout(() => navigate('/login'), 3000);
      }
    } catch (err) {
      console.error('OAuth 콜백 처리 에러:', err);
      setError('로그인 처리 중 오류가 발생했습니다.');
      setIsLoading(false);
      setTimeout(() => navigate('/login'), 3000);
    }
  };

  handleCallback();
}, [searchParams, navigate, login]);
```

**핵심 포인트:**
- `useRef`로 중복 실행 방지 (React StrictMode 대응)
- `withCredentials: true`로 세션 쿠키 전송
- `navigate('/', { replace: true })`로 히스토리 제거
- 에러 발생 시 3초 후 로그인 페이지로 자동 이동

### 10-3. JSX 렌더링

```jsx
return (
  <div className="oauth-callback-container">
    <div className="oauth-callback-card">
      {isLoading ? (
        // 로딩 중일 때
        <>
          <div className="spinner"></div>
          <h2>로그인 처리 중...</h2>
          <p>잠시만 기다려주세요.</p>
        </>
      ) : (
        // 에러가 있을 때
        <>
          <div className="error-icon">⚠️</div>
          <h2>로그인 실패</h2>
          <p>{error}</p>
          <p className="redirect-message">로그인 페이지로 이동합니다...</p>
        </>
      )}
    </div>
  </div>
);
```

### 10-4. CSS 스타일링

**파일:** `src/pages/OAuthCallback.css`

```css
.oauth-callback-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #f5f5f5;
}

.oauth-callback-card {
  background: white;
  padding: 40px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  text-align: center;
  max-width: 400px;
}

/* 스피너 애니메이션 */
.spinner {
  width: 50px;
  height: 50px;
  margin: 0 auto 20px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-icon {
  font-size: 48px;
  margin-bottom: 20px;
}

.redirect-message {
  margin-top: 20px;
  color: #666;
  font-size: 14px;
}
```

---

## 11. 로그아웃 기능 구현

### 11-1. AuthProvider의 logout 함수 (재확인)

```jsx
// 이미 4-3에서 구현했음
const logout = async () => {
  try {
    await axios.post('/api/logout', {}, {
      withCredentials: true
    });
    console.log('서버 로그아웃 성공');
  } catch (error) {
    console.error('서버 로그아웃 실패:', error);
  } finally {
    setUser(null);
    setAccessToken(null);
    localStorage.removeItem('user');
    console.log('클라이언트 로그아웃 완료');
  }
};
```

### 11-2. 로그아웃 버튼 추가 (GNB에서 구현)

다음 섹션에서 설명합니다.

---

## 12. GNB(네비게이션 바) 구현

**파일:** `src/components/Gnb.jsx`

### 12-1. 기본 구조 생성

```jsx
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import './Gnb.css';

function Gnb() {
  const navigate = useNavigate();
  // AuthContext에서 인증 정보 가져오기
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  return (
    <nav className="gnb">
      {/* GNB 내용 */}
    </nav>
  );
}

export default Gnb;
```

**핵심 포인트:**
- `isLoading` 상태를 추가로 가져와 로딩 중 UI를 표시합니다.

### 12-2. 로그아웃 핸들러 구현

```jsx
/**
 * handleLogout 함수
 *
 * 로그아웃 버튼 클릭 시 호출됩니다.
 */
const handleLogout = async () => {
  if (window.confirm('로그아웃 하시겠습니까?')) {
    try {
      // AuthContext의 logout 함수 호출
      await logout();

      alert('로그아웃되었습니다.');
      navigate('/');
    } catch (error) {
      console.error('로그아웃 처리 중 에러:', error);
      navigate('/');
    }
  }
};
```

### 12-3. JSX 렌더링 (3단계 조건부 렌더링)

```jsx
return (
  <nav className="gnb">
    <div className="gnb-container">
      {/* 왼쪽 영역: 네비게이션 링크 */}
      <div className="gnb-left">
        <Link to="/" className="logo">
          MyApp
        </Link>

        <div className="nav-links">
          <Link to="/">홈</Link>
          <Link to="/about">소개</Link>
        </div>
      </div>

      {/* 오른쪽 영역: 로그인 상태에 따라 다른 UI 표시 */}
      <div className="gnb-right">
        {isLoading ? (
          // 1. 로딩 중: 인증 상태 확인 중
          <span className="gnb-loading">로딩 중...</span>
        ) : isAuthenticated ? (
          // 2. 로그인된 상태: 사용자 이름과 로그아웃 버튼 표시
          <div className="user-menu">
            <span className="user-name">{user?.name}님</span>
            <button
              onClick={handleLogout}
              className="logout-button"
            >
              로그아웃
            </button>
          </div>
        ) : (
          // 3. 로그인되지 않은 상태: 로그인/회원가입 버튼 표시
          <div className="auth-buttons">
            <Link to="/login" className="login-link">
              로그인
            </Link>
            <Link to="/register" className="register-link">
              회원가입
            </Link>
          </div>
        )}
      </div>
    </div>
  </nav>
);
```

**핵심 포인트:**
- **3단계 조건부 렌더링**: `isLoading` → `isAuthenticated` → 미인증 순서로 체크
- **로딩 상태**: 페이지 새로고침 시 인증 확인 중에 "로딩 중..." 표시
- **로그인 상태**: 사용자 이름 + 로그아웃 버튼 (user?.name으로 안전하게 접근)
- **로그아웃 상태**: 로그인 + 회원가입 링크

### 12-4. CSS 스타일링

**파일:** `src/components/Gnb.css`

```css
.gnb {
  background-color: #fff;
  border-bottom: 1px solid #e0e0e0;
  position: sticky;
  top: 0;
  z-index: 100;
}

.gnb-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 60px;
}

.gnb-left {
  display: flex;
  align-items: center;
  gap: 30px;
}

.logo {
  font-size: 20px;
  font-weight: bold;
  color: #333;
  text-decoration: none;
}

.nav-links {
  display: flex;
  gap: 20px;
}

.nav-links a {
  color: #666;
  text-decoration: none;
  transition: color 0.2s;
}

.nav-links a:hover {
  color: #333;
}

.gnb-right {
  display: flex;
  align-items: center;
  gap: 15px;
}

.user-menu {
  display: flex;
  align-items: center;
  gap: 15px;
}

.user-name {
  color: #333;
  font-weight: 500;
}

.logout-button {
  padding: 8px 16px;
  background-color: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.logout-button:hover {
  background-color: #e0e0e0;
}

.auth-buttons {
  display: flex;
  gap: 10px;
}

.login-link,
.register-link {
  padding: 8px 16px;
  text-decoration: none;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.login-link {
  color: #333;
  background-color: #f5f5f5;
}

.login-link:hover {
  background-color: #e0e0e0;
}

.register-link {
  color: #fff;
  background-color: #3498db;
}

.register-link:hover {
  background-color: #2980b9;
}
```

---

## 13. 테스트 및 검증

### 13-1. 회원가입 테스트

**절차:**
1. 브라우저에서 `http://localhost:5173/register` 접속
2. 이메일, 이름, 비밀번호 입력
3. "회원가입" 버튼 클릭
4. 성공 시 로그인 페이지로 이동

**확인 사항:**
- ✅ 비밀번호 불일치 시 에러 메시지 표시
- ✅ 이미 존재하는 이메일 시 에러 메시지 표시
- ✅ 성공 시 로그인 페이지로 리다이렉트

### 13-2. 일반 로그인 테스트

**절차:**
1. `http://localhost:5173/login` 접속
2. 회원가입한 이메일/비밀번호 입력
3. "로그인" 버튼 클릭

**확인 사항:**
- ✅ GNB에 사용자 이름 표시
- ✅ 로그아웃 버튼 표시
- ✅ 브라우저 개발자 도구 > Application > Cookies에 `refreshToken` 쿠키 존재
- ✅ localStorage에 사용자 정보 저장됨

### 13-3. 카카오 로그인 테스트

**절차:**
1. `http://localhost:5173/login` 접속
2. "카카오 로그인" 버튼 클릭
3. 카카오 계정으로 로그인
4. 동의 후 자동으로 홈 페이지로 이동

**확인 사항:**
- ✅ 카카오 인증 페이지로 리다이렉트
- ✅ 인증 후 `/oauth/callback?status=success`로 이동
- ✅ 로딩 화면 표시
- ✅ 자동으로 홈 페이지로 이동
- ✅ GNB에 카카오 계정 이름 표시

**브라우저 콘솔 로그 확인:**
```
=== 카카오 OAuth 콜백 처리 시작 ===
status: success
카카오 로그인 성공 - 토큰 교환 API 호출 시작
토큰 교환 응답: {success: true, ...}
로그인 성공 - 사용자: user@kakao.com
```

### 13-4. 페이지 새로고침 테스트

**절차:**
1. 로그인 상태에서 F5로 페이지 새로고침
2. GNB 확인

**확인 사항:**
- ✅ 로그인 상태 유지
- ✅ 사용자 이름 계속 표시
- ✅ 콘솔에 `/api/refresh` 호출 로그

**브라우저 콘솔 로그:**
```
=== /api/refresh 호출 (페이지 새로고침) ===
localStorage의 user: {"id":1,"email":"user@example.com",...}
=== /api/refresh 응답 성공 ===
백엔드가 user 정보를 반환하지 않음 - localStorage에서 복원
토큰 갱신 성공 - 상태 업데이트 완료
```

**참고:**
- 백엔드가 user 정보를 반환하면 그대로 사용
- 백엔드가 user 정보를 반환하지 않으면 localStorage에서 복원
- 두 경우 모두 정상적으로 로그인 상태 유지

### 13-5. 로그아웃 테스트

**절차:**
1. 로그인 상태에서 "로그아웃" 버튼 클릭
2. 확인 다이얼로그에서 "확인" 클릭

**확인 사항:**
- ✅ GNB에 "로그인", "회원가입" 버튼 표시
- ✅ 사용자 이름 사라짐
- ✅ 브라우저 쿠키에서 `refreshToken` 삭제됨
- ✅ localStorage에서 사용자 정보 삭제됨

**브라우저 콘솔 로그:**
```
서버 로그아웃 성공
클라이언트 로그아웃 완료
```

### 13-6. 네트워크 탭 확인

**확인 사항:**

**로그인 요청 (`/api/loginEx`):**
```
Request Headers:
  Content-Type: application/json

Request Body:
  { "email": "user@example.com", "password": "..." }

Response Headers:
  Set-Cookie: refreshToken=...; Path=/; HttpOnly; Max-Age=604800

Response Body:
  {
    "success": true,
    "message": "로그인 성공",
    "data": {
      "accessToken": "eyJhbGci...",
      "user": { "id": 1, "email": "...", "name": "..." }
    }
  }
```

**토큰 갱신 요청 (`/api/refresh`):**
```
Request Headers:
  Cookie: refreshToken=...

Response Body:
  {
    "success": true,
    "message": "토큰 갱신 성공",
    "data": {
      "accessToken": "eyJhbGci...",
      "user": { ... }
    }
  }
```

---

## 📚 부록

### A. 자주 발생하는 에러와 해결 방법

#### 에러 1: "useAuth must be used within AuthProvider"

**원인:** AuthProvider 외부에서 useAuth() 호출

**해결:**
```jsx
// ❌ 잘못된 방식
function App() {
  const { user } = useAuth();  // AuthProvider 밖에서 호출
  return <AuthProvider>...</AuthProvider>;
}

// ✅ 올바른 방식
function App() {
  return (
    <AuthProvider>
      <MyComponent />  {/* 여기서 useAuth() 사용 가능 */}
    </AuthProvider>
  );
}
```

#### 에러 2: "Refresh Token은 필수입니다" (400 에러)

**원인:** `withCredentials: true` 누락

**해결:**
```javascript
// ❌ 잘못된 방식
await axios.post('/api/refresh', {});

// ✅ 올바른 방식
await axios.post('/api/refresh', {}, {
  withCredentials: true
});
```

#### 에러 3: CORS 에러

**원인:** 백엔드 CORS 설정 누락

**해결:** 백엔드 개발자에게 요청
```yaml
# application-dev.yaml
app:
  cors:
    allowed-origins:
      - http://localhost:5173
    allow-credentials: true
```

#### 에러 4: 카카오 로그인 후 무한 리다이렉트

**원인:** `navigate('/', { replace: true })` 누락

**해결:**
```javascript
// ❌ 잘못된 방식
navigate('/');

// ✅ 올바른 방식
navigate('/', { replace: true });
```

#### 에러 5: 페이지 새로고침 시 로그인이 풀림 (UI가 업데이트되지 않음)

**증상:**
- 콘솔 로그에는 `/api/refresh` 성공 메시지가 나옴
- GNB에 사용자 이름이 표시되지 않고 로그인 버튼이 나타남
- `user: undefined` 로그 확인

**원인:** AuthProvider에서 `if (isLoading) return null;`로 인해 로딩 중 렌더링이 차단됨

**해결:**
```jsx
// ❌ 잘못된 방식
const AuthProvider = ({ children }) => {
  // ...
  if (isLoading) {
    return null;  // 로딩 중 아무것도 렌더링 안 함
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// ✅ 올바른 방식
const AuthProvider = ({ children }) => {
  // ...
  // isLoading 체크를 제거하고 각 컴포넌트에서 처리
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// GNB에서 isLoading 처리
function Gnb() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  return (
    <div className="gnb-right">
      {isLoading ? (
        <span>로딩 중...</span>
      ) : isAuthenticated ? (
        <span>{user?.name}님</span>
      ) : (
        <Link to="/login">로그인</Link>
      )}
    </div>
  );
}
```

#### 에러 6: 백엔드가 user 정보를 반환하지 않아 새로고침 시 로그인 풀림

**증상:**
- 콘솔 로그: "새로 설정할 userData: undefined"
- `/api/refresh`는 성공하지만 user 데이터가 없음

**원인:** 백엔드 `/api/refresh` 엔드포인트가 `accessToken`만 반환하고 `user` 객체를 반환하지 않음

**해결:**
```jsx
// AuthProvider.jsx의 useEffect 내부
if (response.data.success) {
  const token = response.data.data.accessToken;
  let userData = response.data.data.user;

  // 백엔드가 user 정보를 반환하지 않으면 localStorage에서 가져옴
  if (!userData) {
    console.log('백엔드가 user 정보를 반환하지 않음 - localStorage에서 복원');
    userData = JSON.parse(savedUser);
  }

  setUser(userData);
  setAccessToken(token);
  localStorage.setItem('user', JSON.stringify(userData));
}
```

### B. 코드 작성 순서 요약

```text
1. Vite Proxy 설정 (vite.config.js)
2. AuthContext 생성
3. AuthProvider 구현
   3-1. State 선언
   3-2. login 함수
   3-3. logout 함수
   3-4. refreshAccessToken 함수
   3-5. useEffect (페이지 로드 시 인증 복원)
4. useAuth 커스텀 훅
5. App.jsx에 AuthProvider 적용
6. Register.jsx (회원가입)
7. Login.jsx (일반 로그인 + 카카오 로그인 버튼)
8. OAuthCallback.jsx (카카오 콜백 처리)
9. Gnb.jsx (로그아웃 버튼)
10. 테스트 및 검증
```

### C. 핵심 개념 정리

**1. Context API**
- 전역 상태 관리
- Provider로 값 제공
- useContext로 값 읽기

**2. JWT 인증**
- Access Token: 단기 (1시간)
- Refresh Token: 장기 (7일)
- 토큰 갱신 메커니즘

**3. HTTP-only 쿠키**
- JavaScript 접근 불가
- XSS 공격 방어
- 브라우저 자동 관리

**4. withCredentials**
- CORS 환경에서 쿠키 전송
- 요청/응답 모두 필요

**5. OAuth 2.0**
- Authorization Code 방식
- 전체 페이지 리다이렉트
- 세션 기반 토큰 교환

---

## 🎯 마무리

이 가이드를 따라 구현하면:

✅ **회원가입**: 이메일/비밀번호로 계정 생성
✅ **일반 로그인**: 이메일/비밀번호로 로그인
✅ **카카오 로그인**: 소셜 로그인 구현
✅ **로그아웃**: 서버/클라이언트 상태 정리
✅ **자동 로그인**: 페이지 새로고침 시 로그인 유지
✅ **보안**: XSS 방어, HTTP-only 쿠키 사용

**다음 단계로 고려할 사항:**
- Axios Interceptor로 토큰 자동 갱신
- Protected Routes (비로그인 시 접근 차단)
- 비밀번호 찾기/변경 기능
- 프로필 페이지
- 관리자 페이지 (권한 분리)

---

**문서 작성일:** 2025-12-20
**최종 수정일:** 2025-12-20
**버전:** 1.1 (트러블슈팅 반영)
**작성자:** Claude Code

**변경 이력:**
- v1.0 (2025-12-20): 초기 작성
- v1.1 (2025-12-20): 실제 구현 중 발생한 문제 해결 사항 반영
  - AuthProvider에서 `if (isLoading) return null` 제거
  - GNB에 3단계 조건부 렌더링 추가 (isLoading 처리)
  - 백엔드가 user 정보를 반환하지 않을 때 localStorage 복원 로직 추가
  - 에러 5, 6 추가 (페이지 새로고침 시 UI 업데이트 문제)

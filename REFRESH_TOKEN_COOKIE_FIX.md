# refreshToken 쿠키 문제 해결 가이드

## 문제 상황
- 카카오 로그인 성공 직후에는 정상 작동
- 페이지 새로고침 시 `/api/refresh` 호출이 400 에러 발생
- 에러 메시지: "Refresh Token은 필수입니다" (추정)
- 브라우저에는 refreshToken 쿠키가 존재함

## 원인 분석

백엔드에서 refreshToken 쿠키를 설정할 때 **Path**, **Domain**, **SameSite** 속성이 잘못 설정되어 `/api/refresh` 요청 시 쿠키가 전송되지 않는 문제입니다.

## 백엔드 수정 방법 (Spring Boot)

### ❌ 잘못된 쿠키 설정 (문제 발생)

```java
// KakaoAuthController.java - exchangeToken 메서드

@PostMapping("/exchange-token")
public ResponseEntity<?> exchangeToken(HttpSession session, HttpServletResponse response) {
    // ... 토큰 가져오기 ...

    // ❌ 문제: Path가 /api/auth로 설정되면 /api/refresh에서 쿠키를 받을 수 없음
    Cookie refreshCookie = new Cookie("refreshToken", refreshToken);
    refreshCookie.setHttpOnly(true);
    refreshCookie.setPath("/api/auth");  // ❌ 잘못됨!
    refreshCookie.setMaxAge(7 * 24 * 60 * 60); // 7일
    response.addCookie(refreshCookie);

    // ... 응답 반환 ...
}
```

### ✅ 올바른 쿠키 설정 (해결)

```java
// KakaoAuthController.java - exchangeToken 메서드

@PostMapping("/exchange-token")
public ResponseEntity<?> exchangeToken(HttpSession session, HttpServletResponse response) {
    // ... 세션에서 토큰 가져오기 ...

    String accessToken = (String) session.getAttribute("accessToken");
    String refreshToken = (String) session.getAttribute("refreshToken");
    User user = (User) session.getAttribute("user");

    // ✅ refreshToken을 HTTP-only 쿠키로 설정
    Cookie refreshCookie = new Cookie("refreshToken", refreshToken);
    refreshCookie.setHttpOnly(true);        // JavaScript 접근 차단
    refreshCookie.setPath("/");             // ✅ 중요! 모든 경로에서 쿠키 전송
    refreshCookie.setMaxAge(7 * 24 * 60 * 60); // 7일
    refreshCookie.setSecure(false);         // 개발 환경: false, 프로덕션: true (HTTPS 필수)
    // refreshCookie.setSameSite("Lax");    // Spring Boot 3.x 이상

    response.addCookie(refreshCookie);

    // 세션 정리 (토큰을 쿠키로 옮겼으므로 세션에서 제거)
    session.removeAttribute("accessToken");
    session.removeAttribute("refreshToken");
    session.removeAttribute("user");

    // Access Token과 사용자 정보는 JSON으로 반환
    Map<String, Object> data = new HashMap<>();
    data.put("accessToken", accessToken);
    data.put("user", user);

    return ResponseEntity.ok(ApiResponse.success("토큰 교환 성공", data));
}
```

### 핵심 수정 사항

1. **`setPath("/")`**: 모든 경로에서 쿠키를 전송하도록 설정
   - `/api/refresh`, `/api/logout` 등 모든 `/api/*` 경로에서 쿠키 접근 가능

2. **`setSecure(false)`**: 개발 환경에서는 false로 설정
   - 프로덕션 환경(HTTPS)에서는 반드시 `true`로 설정

3. **SameSite 속성**: Spring Boot 3.x 이상에서 지원
   - 개발 환경: `Lax` (기본값)
   - CSRF 방어가 필요하면 `Strict` 사용 가능

## 확인 방법

### 1. 브라우저에서 쿠키 확인

카카오 로그인 성공 후 브라우저 개발자 도구 > Application > Cookies > http://localhost:5173

**올바른 쿠키 설정:**
```
Name: refreshToken
Value: eyJhbGciOiJIUzUxMiJ9...
Domain: localhost
Path: /                    ← 중요! "/" 이어야 함
Expires: (7일 후 날짜)
HttpOnly: ✓               ← 체크되어 있어야 함
Secure: (체크 안 됨)      ← 개발 환경
SameSite: Lax
```

**잘못된 쿠키 설정:**
```
Path: /api/auth           ← 잘못됨! /api/refresh에서 쿠키를 받을 수 없음
Path: /api/auth/kakao     ← 잘못됨!
```

### 2. Network 탭에서 쿠키 전송 확인

페이지 새로고침 후 Network 탭에서 `/api/refresh` 요청 확인:

**Request Headers에 쿠키가 포함되어야 함:**
```
Cookie: refreshToken=eyJhbGciOiJIUzUxMiJ9...; JSESSIONID=...
```

**쿠키가 없다면:**
```
Cookie: JSESSIONID=...    ← refreshToken이 없음! (문제!)
```

## 추가 확인 사항

### AuthController.java - refresh 메서드도 확인

```java
@PostMapping("/refresh")
public ResponseEntity<?> refresh(
    @CookieValue(value = "refreshToken", required = false) String refreshToken,
    HttpServletResponse response
) {
    // ✅ refreshToken이 null인지 먼저 확인
    if (refreshToken == null || refreshToken.isEmpty()) {
        return ResponseEntity
            .status(HttpStatus.BAD_REQUEST)
            .body(ApiResponse.error("Refresh Token은 필수입니다"));
    }

    try {
        // 토큰 검증 및 새 Access Token 발급
        String newAccessToken = jwtService.refreshAccessToken(refreshToken);
        User user = jwtService.getUserFromToken(refreshToken);

        Map<String, Object> data = new HashMap<>();
        data.put("accessToken", newAccessToken);
        data.put("user", user);

        return ResponseEntity.ok(ApiResponse.success("토큰 갱신 성공", data));
    } catch (Exception e) {
        return ResponseEntity
            .status(HttpStatus.UNAUTHORIZED)
            .body(ApiResponse.error("유효하지 않은 Refresh Token입니다"));
    }
}
```

### CORS 설정 확인 (WebConfig.java)

```java
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
            .allowedOrigins("http://localhost:5173")  // 프론트엔드 URL
            .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
            .allowedHeaders("*")
            .allowCredentials(true)  // ✅ 중요! 쿠키 전송 허용
            .maxAge(3600);
    }
}
```

## 테스트 시나리오

1. **로그아웃** (기존 쿠키 제거)
2. **카카오 로그인** 실행
3. **브라우저 개발자 도구 > Application > Cookies** 확인
   - refreshToken 쿠키의 Path가 `/`인지 확인
4. **페이지 새로고침** (F5)
5. **Network 탭 > refresh 요청** 확인
   - Request Headers에 `Cookie: refreshToken=...` 포함되었는지 확인
6. **콘솔 로그** 확인
   - "토큰 갱신 성공" 메시지가 나와야 함

## 예상 결과

✅ **성공 시:**
- 페이지 새로고침 후에도 로그인 상태 유지
- 콘솔에 "토큰 갱신 성공" 메시지
- GNB에 사용자 이름 표시

❌ **실패 시 (쿠키 Path 문제):**
- refreshToken 쿠키는 존재하지만 Path가 `/api/auth`로 설정됨
- `/api/refresh` 요청에 쿠키가 포함되지 않음
- 400 에러 발생

## 프론트엔드에서 추가로 확인할 사항

프론트엔드 코드는 이미 정상입니다:
- ✅ `withCredentials: true` 설정됨
- ✅ `/api/refresh` 엔드포인트 호출
- ✅ 응답 처리 로직 정상

**문제는 100% 백엔드의 쿠키 설정입니다.**

## 결론

백엔드 개발자에게 다음을 요청하세요:

1. **KakaoAuthController의 exchangeToken 메서드**에서 refreshToken 쿠키 설정 시:
   - `refreshCookie.setPath("/")`로 변경
   - `refreshCookie.setHttpOnly(true)` 확인
   - `refreshCookie.setSecure(false)` (개발 환경)

2. **AuthController의 refresh 메서드**에서:
   - `@CookieValue` 파라미터가 제대로 동작하는지 확인
   - null 체크 로직 추가

3. **CORS 설정**에서:
   - `allowCredentials(true)` 확인

이렇게 수정하면 페이지 새로고침 후에도 로그인 상태가 유지됩니다!

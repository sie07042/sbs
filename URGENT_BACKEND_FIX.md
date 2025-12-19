# 🚨 긴급 백엔드 수정 필요!

## 문제 확인됨

**에러 메시지:** `"Refresh Token은 필수입니다"`

**원인:** 백엔드에서 설정한 refreshToken 쿠키가 `/api/refresh` 요청 시 전송되지 않음

**증거:**
- ✅ 브라우저 Application 탭에는 refreshToken 쿠키 존재
- ✅ Network 탭에서 `/api/refresh` 요청의 Cookie 헤더에 refreshToken 포함되어 전송됨
- ❌ 백엔드가 쿠키를 읽지 못함

## 즉시 확인해야 할 사항

### 1️⃣ 백엔드 콘솔 로그 확인 (가장 중요!)

**KakaoAuthController.java - exchangeToken 메서드**에 다음 로그를 추가하고 확인하세요:

```java
@PostMapping("/exchange-token")
public ResponseEntity<?> exchangeToken(HttpSession session, HttpServletResponse response) {
    String refreshToken = (String) session.getAttribute("refreshToken");
    User user = (User) session.getAttribute("user");

    // ========================================
    // 🔍 디버깅: 쿠키 설정 확인
    // ========================================
    System.out.println("=== exchangeToken: refreshToken 쿠키 설정 ===");
    System.out.println("refreshToken 길이: " + refreshToken.length());

    Cookie refreshCookie = new Cookie("refreshToken", refreshToken);
    refreshCookie.setHttpOnly(true);
    refreshCookie.setPath("/");
    refreshCookie.setMaxAge(7 * 24 * 60 * 60);
    refreshCookie.setSecure(false);  // ⚠️ 개발 환경: 반드시 false
    // refreshCookie.setDomain("localhost");  // ⚠️ 절대 설정하지 마세요!

    response.addCookie(refreshCookie);

    System.out.println("✅ 쿠키 설정 완료:");
    System.out.println("  - Name: refreshToken");
    System.out.println("  - Path: /");
    System.out.println("  - HttpOnly: true");
    System.out.println("  - Secure: false");
    System.out.println("  - MaxAge: " + (7 * 24 * 60 * 60));

    // ... 나머지 코드 ...
}
```

**AuthController.java - refresh 메서드**에 다음 로그를 추가하고 확인하세요:

```java
@PostMapping("/refresh")
public ResponseEntity<?> refresh(
    @CookieValue(value = "refreshToken", required = false) String refreshToken,
    HttpServletRequest request
) {
    System.out.println("=== /refresh 엔드포인트 호출 ===");
    System.out.println("refreshToken 파라미터: " + refreshToken);

    // 🔍 모든 쿠키 출력
    Cookie[] cookies = request.getCookies();
    if (cookies != null) {
        System.out.println("받은 쿠키 목록 (" + cookies.length + "개):");
        for (Cookie cookie : cookies) {
            System.out.println("  - " + cookie.getName() + " = " +
                (cookie.getValue().length() > 20 ?
                    cookie.getValue().substring(0, 20) + "..." :
                    cookie.getValue()));
        }
    } else {
        System.out.println("❌ 쿠키가 전혀 없음!");
    }

    if (refreshToken == null || refreshToken.isEmpty()) {
        System.out.println("❌ refreshToken이 null 또는 empty");
        return ResponseEntity.badRequest()
            .body(ApiResponse.error("Refresh Token은 필수입니다"));
    }

    // ... 토큰 검증 로직 ...
}
```

### 2️⃣ 예상되는 백엔드 로그

**정상 케이스:**
```
=== exchangeToken: refreshToken 쿠키 설정 ===
refreshToken 길이: 234
✅ 쿠키 설정 완료:
  - Name: refreshToken
  - Path: /
  - HttpOnly: true
  - Secure: false
  - MaxAge: 604800

--- 페이지 새로고침 후 ---

=== /refresh 엔드포인트 호출 ===
refreshToken 파라미터: eyJhbGciOiJIUzUxMiJ9...
받은 쿠키 목록 (2개):
  - JSESSIONID = 1A2B3C4D...
  - refreshToken = eyJhbGciOiJIUzUxMiJ9...
```

**문제 케이스 (현재 상황):**
```
=== /refresh 엔드포인트 호출 ===
refreshToken 파라미터: null
받은 쿠키 목록 (1개):
  - JSESSIONID = 1A2B3C4D...
❌ refreshToken이 null 또는 empty
```

## 3️⃣ 가능한 원인과 해결 방법

### 원인 1: Secure 플래그가 true로 설정됨 (가장 가능성 높음!)

**문제:**
```java
Cookie refreshCookie = new Cookie("refreshToken", refreshToken);
refreshCookie.setSecure(true);  // ❌ HTTP에서는 전송 안 됨!
```

**해결:**
```java
Cookie refreshCookie = new Cookie("refreshToken", refreshToken);
refreshCookie.setSecure(false);  // ✅ 개발 환경: false
```

### 원인 2: SameSite 속성이 Strict로 설정됨

**문제 (Spring Boot 3.x):**
```java
Cookie refreshCookie = new Cookie("refreshToken", refreshToken);
// SameSite=Strict로 설정되어 있을 가능성
```

**해결 (Spring Boot 2.x):**
- SameSite 속성 설정 안 함 (기본값 Lax 사용)

**해결 (Spring Boot 3.x):**
```java
Cookie refreshCookie = new Cookie("refreshToken", refreshToken);
refreshCookie.setHttpOnly(true);
refreshCookie.setPath("/");
refreshCookie.setMaxAge(7 * 24 * 60 * 60);
refreshCookie.setSecure(false);
refreshCookie.setAttribute("SameSite", "Lax");  // ✅ Lax로 설정
```

### 원인 3: Domain 속성이 명시적으로 설정됨

**문제:**
```java
Cookie refreshCookie = new Cookie("refreshToken", refreshToken);
refreshCookie.setDomain("localhost");  // ❌ 설정하지 마세요!
```

**해결:**
```java
Cookie refreshCookie = new Cookie("refreshToken", refreshToken);
// Domain 설정 안 함 (브라우저가 자동으로 현재 도메인 사용)
```

### 원인 4: @CookieValue 이름 불일치

**문제:**
```java
@CookieValue(value = "refresh_token") String refreshToken  // ❌ 이름이 다름
```

**해결:**
```java
@CookieValue(value = "refreshToken") String refreshToken  // ✅ 정확한 이름
```

## 4️⃣ 권장하는 완벽한 쿠키 설정

### KakaoAuthController.java - exchangeToken 메서드

```java
@PostMapping("/exchange-token")
public ResponseEntity<?> exchangeToken(HttpSession session, HttpServletResponse response) {
    String accessToken = (String) session.getAttribute("accessToken");
    String refreshToken = (String) session.getAttribute("refreshToken");
    User user = (User) session.getAttribute("user");

    if (refreshToken == null || user == null) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
            .body(ApiResponse.error("로그인 정보가 없습니다"));
    }

    // ========================================
    // ✅ 올바른 쿠키 설정
    // ========================================
    Cookie refreshCookie = new Cookie("refreshToken", refreshToken);

    // 필수 설정
    refreshCookie.setHttpOnly(true);        // JavaScript 접근 차단
    refreshCookie.setPath("/");             // 모든 경로에서 전송
    refreshCookie.setMaxAge(7 * 24 * 60 * 60); // 7일
    refreshCookie.setSecure(false);         // ⚠️ 개발 환경: false, 프로덕션: true

    // Domain은 설정하지 않음 (브라우저가 자동으로 현재 도메인 사용)
    // SameSite는 기본값 Lax 사용 (Spring Boot 2.x)
    // 또는 명시적으로 Lax 설정 (Spring Boot 3.x)

    response.addCookie(refreshCookie);

    // 디버깅 로그
    System.out.println("✅ refreshToken 쿠키 설정 완료");

    // 세션 정리
    session.removeAttribute("accessToken");
    session.removeAttribute("refreshToken");
    session.removeAttribute("user");

    // 응답
    Map<String, Object> data = new HashMap<>();
    data.put("accessToken", accessToken);
    data.put("user", user);

    return ResponseEntity.ok(ApiResponse.success("토큰 교환 성공", data));
}
```

### AuthController.java - refresh 메서드

```java
@PostMapping("/refresh")
public ResponseEntity<?> refresh(
    @CookieValue(value = "refreshToken", required = false) String refreshToken,
    HttpServletRequest request,  // 디버깅용
    HttpServletResponse response
) {
    // 디버깅 로그
    System.out.println("=== /refresh 호출 ===");
    System.out.println("refreshToken: " + (refreshToken != null ? "존재" : "null"));

    // 모든 쿠키 출력 (디버깅)
    Cookie[] cookies = request.getCookies();
    if (cookies != null) {
        for (Cookie cookie : cookies) {
            System.out.println("쿠키: " + cookie.getName());
        }
    }

    // refreshToken 검증
    if (refreshToken == null || refreshToken.isEmpty()) {
        return ResponseEntity.badRequest()
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
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
            .body(ApiResponse.error("유효하지 않은 Refresh Token입니다"));
    }
}
```

## 5️⃣ 테스트 절차

1. **백엔드 재시작**
2. **브라우저에서 모든 쿠키 삭제** (Application > Cookies > 우클릭 > Clear)
3. **카카오 로그인 실행**
4. **백엔드 콘솔 확인**:
   ```
   ✅ refreshToken 쿠키 설정 완료
   ```
5. **브라우저 Application > Cookies 확인**:
   - refreshToken 존재
   - Path: `/`
   - HttpOnly: ✓
   - Secure: (체크 안 됨)
6. **페이지 새로고침 (F5)**
7. **백엔드 콘솔 확인**:
   ```
   === /refresh 호출 ===
   refreshToken: 존재
   쿠키: JSESSIONID
   쿠키: refreshToken
   ```
8. **프론트엔드 콘솔 확인**:
   ```
   === /api/refresh 응답 성공 ===
   토큰 갱신 성공
   ```

## 6️⃣ 여전히 안 되면

### application.properties 또는 application.yml 확인

```yaml
# ❌ 잘못된 설정
server:
  servlet:
    session:
      cookie:
        secure: true  # HTTP에서 쿠키 전송 안 됨!

# ✅ 올바른 설정 (개발 환경)
server:
  servlet:
    session:
      cookie:
        secure: false
        http-only: true
        same-site: lax
```

### WebConfig CORS 설정 확인

```java
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
            .allowedOrigins("http://localhost:5173")
            .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
            .allowedHeaders("*")
            .allowCredentials(true)  // ✅ 필수!
            .maxAge(3600);
    }
}
```

## 다음 단계

백엔드 개발자에게 위의 로그를 추가하고 **백엔드 콘솔 출력을 보내달라고** 요청하세요.

특히 다음 두 부분의 로그가 필수입니다:
1. `exchangeToken` 메서드: "✅ 쿠키 설정 완료" 로그
2. `refresh` 메서드: "받은 쿠키 목록" 로그

이 로그를 보면 정확한 원인을 100% 파악할 수 있습니다!

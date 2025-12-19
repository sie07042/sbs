# 백엔드 디버깅 체크리스트 - refreshToken 쿠키 문제

## 현재 상황

✅ **확인 완료:**
- refreshToken 쿠키가 브라우저에 존재함 (Application > Cookies)
- Path: `/` (정상)
- `/api/refresh` 요청의 Cookie 헤더에 refreshToken이 포함되어 전송됨 (Network 탭 확인)

❌ **문제:**
- 백엔드가 400 Bad Request 응답 반환
- 에러 메시지: (추정) "Refresh Token은 필수입니다" 또는 "유효하지 않은 토큰"

## 백엔드에서 확인해야 할 사항

### 1️⃣ AuthController - refresh 메서드 확인

**파일:** `AuthController.java` 또는 `AuthRestController.java`

```java
@PostMapping("/refresh")
public ResponseEntity<?> refresh(
    @CookieValue(value = "refreshToken", required = false) String refreshToken,
    HttpServletRequest request,  // 디버깅용 추가
    HttpServletResponse response
) {
    // ========================================
    // 🔍 디버깅: 쿠키 수신 확인
    // ========================================
    System.out.println("=== /refresh 엔드포인트 호출됨 ===");
    System.out.println("refreshToken 파라미터: " + refreshToken);

    // 모든 쿠키 출력 (디버깅용)
    Cookie[] cookies = request.getCookies();
    if (cookies != null) {
        System.out.println("받은 쿠키 목록:");
        for (Cookie cookie : cookies) {
            System.out.println("  - " + cookie.getName() + " = " + cookie.getValue());
        }
    } else {
        System.out.println("쿠키가 전혀 없음!");
    }

    // ========================================
    // refreshToken null 체크
    // ========================================
    if (refreshToken == null || refreshToken.isEmpty()) {
        System.out.println("❌ refreshToken이 null 또는 empty");
        return ResponseEntity
            .status(HttpStatus.BAD_REQUEST)
            .body(ApiResponse.error("Refresh Token은 필수입니다"));
    }

    try {
        // 토큰 검증 및 새 Access Token 발급
        System.out.println("토큰 검증 시작...");
        String newAccessToken = jwtService.refreshAccessToken(refreshToken);
        User user = jwtService.getUserFromToken(refreshToken);

        System.out.println("✅ 토큰 검증 성공");

        Map<String, Object> data = new HashMap<>();
        data.put("accessToken", newAccessToken);
        data.put("user", user);

        return ResponseEntity.ok(ApiResponse.success("토큰 갱신 성공", data));
    } catch (Exception e) {
        System.out.println("❌ 토큰 검증 실패: " + e.getMessage());
        e.printStackTrace();

        return ResponseEntity
            .status(HttpStatus.UNAUTHORIZED)
            .body(ApiResponse.error("유효하지 않은 Refresh Token입니다"));
    }
}
```

**확인할 포인트:**
- `@CookieValue`의 쿠키 이름이 정확히 `"refreshToken"`인지 (대소문자 구분!)
- `required = false`로 설정되어 있는지 (null 체크를 직접 하기 위함)
- 모든 쿠키를 출력해보고 refreshToken이 실제로 전달되는지 확인

### 2️⃣ CORS 설정 재확인

**파일:** `WebConfig.java` 또는 `CorsConfig.java`

```java
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
            .allowedOrigins("http://localhost:5173")  // 프론트엔드 URL
            .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
            .allowedHeaders("*")
            .allowCredentials(true)  // ✅ 필수! 쿠키 전송 허용
            .maxAge(3600);
    }
}
```

**또는 application.yaml:**

```yaml
app:
  cors:
    allowed-origins:
      - http://localhost:5173
    allow-credentials: true  # ✅ 필수!
```

### 3️⃣ 쿠키 설정 확인 (exchange-token 메서드)

**파일:** `KakaoAuthController.java` - exchangeToken 메서드

```java
@PostMapping("/exchange-token")
public ResponseEntity<?> exchangeToken(HttpSession session, HttpServletResponse response) {
    // 세션에서 토큰 가져오기
    String accessToken = (String) session.getAttribute("accessToken");
    String refreshToken = (String) session.getAttribute("refreshToken");
    User user = (User) session.getAttribute("user");

    if (refreshToken == null || user == null) {
        return ResponseEntity
            .status(HttpStatus.UNAUTHORIZED)
            .body(ApiResponse.error("로그인 정보가 없습니다. 다시 로그인해주세요."));
    }

    // ========================================
    // 🔍 디버깅: 쿠키 설정 로그
    // ========================================
    System.out.println("=== refreshToken 쿠키 설정 시작 ===");
    System.out.println("refreshToken 값: " + refreshToken.substring(0, 20) + "...");

    // refreshToken을 HTTP-only 쿠키로 설정
    Cookie refreshCookie = new Cookie("refreshToken", refreshToken);
    refreshCookie.setHttpOnly(true);        // JavaScript 접근 차단
    refreshCookie.setPath("/");             // ✅ 중요! 모든 경로에서 쿠키 전송
    refreshCookie.setMaxAge(7 * 24 * 60 * 60); // 7일
    refreshCookie.setSecure(false);         // 개발 환경: false
    // refreshCookie.setSameSite("Lax");    // Spring Boot 3.x

    response.addCookie(refreshCookie);
    System.out.println("✅ refreshToken 쿠키 설정 완료");

    // 세션 정리
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

### 4️⃣ JWT 서비스 확인

**파일:** `JwtService.java` 또는 `TokenService.java`

```java
public String refreshAccessToken(String refreshToken) throws Exception {
    System.out.println("=== refreshAccessToken 메서드 호출 ===");
    System.out.println("입력된 refreshToken: " + refreshToken.substring(0, 20) + "...");

    try {
        // 토큰 검증
        Claims claims = Jwts.parserBuilder()
            .setSigningKey(getSigningKey())
            .build()
            .parseClaimsJws(refreshToken)
            .getBody();

        System.out.println("✅ 토큰 검증 성공");
        System.out.println("사용자 ID: " + claims.get("userId"));

        // 새 Access Token 생성
        String newAccessToken = generateAccessToken(claims.get("userId").toString());

        System.out.println("✅ 새 Access Token 생성 완료");
        return newAccessToken;
    } catch (ExpiredJwtException e) {
        System.out.println("❌ 토큰 만료: " + e.getMessage());
        throw new Exception("Refresh Token이 만료되었습니다");
    } catch (Exception e) {
        System.out.println("❌ 토큰 검증 실패: " + e.getMessage());
        e.printStackTrace();
        throw new Exception("유효하지 않은 Refresh Token입니다");
    }
}
```

## 백엔드 로그 확인 방법

백엔드 콘솔 (터미널)에서 다음과 같은 로그를 확인하세요:

### 정상 케이스:
```
=== /refresh 엔드포인트 호출됨 ===
refreshToken 파라미터: eyJhbGciOiJIUzUxMiJ9...
받은 쿠키 목록:
  - JSESSIONID = 1A2B3C4D...
  - refreshToken = eyJhbGciOiJIUzUxMiJ9...
토큰 검증 시작...
=== refreshAccessToken 메서드 호출 ===
입력된 refreshToken: eyJhbGciOiJIUzUxMiJ9...
✅ 토큰 검증 성공
사용자 ID: 1
✅ 새 Access Token 생성 완료
✅ 토큰 검증 성공
```

### 문제 케이스 1: 쿠키를 받지 못함
```
=== /refresh 엔드포인트 호출됨 ===
refreshToken 파라미터: null
받은 쿠키 목록:
  - JSESSIONID = 1A2B3C4D...
❌ refreshToken이 null 또는 empty
```
→ **원인:** `@CookieValue`의 이름이 틀렸거나, 쿠키가 전달되지 않음

### 문제 케이스 2: 쿠키는 받았지만 토큰 검증 실패
```
=== /refresh 엔드포인트 호출됨 ===
refreshToken 파라미터: eyJhbGciOiJIUzUxMiJ9...
받은 쿠키 목록:
  - JSESSIONID = 1A2B3C4D...
  - refreshToken = eyJhbGciOiJIUzUxMiJ9...
토큰 검증 시작...
=== refreshAccessToken 메서드 호출 ===
입력된 refreshToken: eyJhbGciOiJIUzUxMiJ9...
❌ 토큰 검증 실패: JWT signature does not match locally computed signature
```
→ **원인:** JWT 서명 키가 다르거나, 토큰이 손상됨

### 문제 케이스 3: 토큰 만료
```
=== /refresh 엔드포인트 호출됨 ===
refreshToken 파라미터: eyJhbGciOiJIUzUxMiJ9...
받은 쿠키 목록:
  - JSESSIONID = 1A2B3C4D...
  - refreshToken = eyJhbGciOiJIUzUxMiJ9...
토큰 검증 시작...
=== refreshAccessToken 메서드 호출 ===
❌ 토큰 만료: JWT expired at 2025-12-19T10:00:00Z
```
→ **원인:** refreshToken이 만료됨 (7일 지남)

## 프론트엔드에서 추가로 확인할 사항

브라우저 콘솔에서 다음 로그를 확인하세요:

```
=== /api/refresh 호출 (페이지 새로고침) ===
localStorage의 user: {"id":1,"email":"icesnake72@gmail.com",...}
현재 브라우저 쿠키: (비어있거나 JSESSIONID만 있음)
=== /api/refresh 요청 실패 ===
에러 상태 코드: 400
에러 응답 데이터: {success: false, message: "Refresh Token은 필수입니다", data: null}
```

**에러 응답 데이터**의 `message` 필드가 가장 중요합니다!

## 해결 방법

### 시나리오 1: 백엔드가 쿠키를 받지 못하는 경우

**원인:** `@CookieValue`의 쿠키 이름이 틀림

**해결:**
```java
// ❌ 잘못된 경우
@CookieValue(value = "refresh_token", required = false) String refreshToken

// ✅ 올바른 경우
@CookieValue(value = "refreshToken", required = false) String refreshToken
```

### 시나리오 2: 쿠키는 받았지만 null로 처리되는 경우

**원인:** 쿠키 파싱 문제 또는 CORS 설정 문제

**해결:**
1. CORS 설정에 `allowCredentials(true)` 확인
2. `@CookieValue`의 `required = false` 설정 확인
3. 수동으로 쿠키 읽기 시도:
```java
@PostMapping("/refresh")
public ResponseEntity<?> refresh(HttpServletRequest request) {
    Cookie[] cookies = request.getCookies();
    String refreshToken = null;

    if (cookies != null) {
        for (Cookie cookie : cookies) {
            if ("refreshToken".equals(cookie.getName())) {
                refreshToken = cookie.getValue();
                break;
            }
        }
    }

    if (refreshToken == null) {
        return ResponseEntity.badRequest()
            .body(ApiResponse.error("Refresh Token is required"));
    }

    // ... 토큰 검증 로직 ...
}
```

### 시나리오 3: 토큰 검증 실패

**원인:** JWT 서명 키가 다름

**해결:** exchange-token과 refresh에서 같은 서명 키를 사용하는지 확인

```java
// application.yml
jwt:
  secret: your-secret-key-here  # ✅ 같은 키 사용
  access-token-expiration: 3600000   # 1시간
  refresh-token-expiration: 604800000 # 7일
```

## 다음 단계

1. **백엔드 콘솔 로그 확인** - 가장 중요!
2. **프론트엔드 에러 응답 데이터 확인**
3. 위의 체크리스트에 따라 백엔드 코드 수정
4. 수정 후 다시 테스트

백엔드 로그와 프론트엔드 에러 응답을 공유해주시면 더 정확한 해결책을 제시할 수 있습니다!

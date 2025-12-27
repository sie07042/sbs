# Docker 로컬 테스트 환경 구축 가이드

## 📋 개요

이 가이드는 React 프론트엔드를 Docker 컨테이너로 빌드하고 로컬에서 테스트하는 방법을 설명합니다.

### 아키텍처

```text
[사용자] ──> http://localhost:80 ──> [Nginx (Docker)] ──> /api/* ──> [백엔드:9080]
                                              │
                                              └──> React 정적 파일
```

### 주요 특징

- **멀티 스테이지 빌드**: Node.js 빌드 → Nginx 프로덕션 이미지
- **Nginx 프록시**: `/api/*` 요청을 백엔드로 자동 전달
- **80 포트**: 프로덕션과 동일한 환경에서 테스트
- **Bridge 네트워크**: 기존 백엔드 컨테이너와 통신

## 🗂️ 생성된 파일 목록

```
sbs/
├── Dockerfile                # 프론트엔드 Docker 이미지 빌드 파일
├── docker-compose.yml        # Docker Compose 설정
├── nginx.conf                # Nginx 웹 서버 설정
├── .dockerignore            # Docker 빌드 시 제외 파일
└── .env.production          # 프로덕션 환경 변수
```

## 🚀 빠른 시작

### 1단계: 전제 조건 확인

다음 서비스가 실행 중이어야 합니다:

```bash
# MySQL 컨테이너 확인
docker ps | grep mysql-8

# 백엔드 서버 확인 (9080 포트)
curl http://localhost:9080/actuator/health
# 또는
docker ps | grep backend
```

### 2단계: Docker 이미지 빌드 및 실행

```bash
# 방법 1: Docker Compose 사용 (권장)
docker-compose up -d --build

# 방법 2: Docker 명령어 직접 사용
docker build -t sbs-frontend .
docker run -d \
  --name sbs-frontend \
  --network bridge \
  -p 80:80 \
  --link mysql-8 \
  sbs-frontend
```

### 3단계: 접속 테스트

브라우저에서 다음 URL로 접속:

```
http://localhost
```

또는 cURL로 테스트:

```bash
# 프론트엔드 접속 테스트
curl http://localhost

# API 프록시 테스트
curl http://localhost/api/health
```

## 📝 상세 설명

### Dockerfile 구조

```dockerfile
# Stage 1: Build (빌드 단계)
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production (프로덕션 단계)
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**왜 멀티 스테이지 빌드를 사용하나요?**

- **이미지 크기 최적화**: 최종 이미지에 Node.js가 포함되지 않음
- **보안**: 빌드 도구나 소스 코드가 프로덕션 이미지에 포함되지 않음
- **속도**: Nginx는 Node.js보다 정적 파일 서빙 성능이 우수

### Nginx 설정 핵심 포인트

#### 1. API 프록시

```nginx
location /api/ {
    proxy_pass http://host.docker.internal:9080;
    # ...
}
```

- `/api/`로 시작하는 요청을 백엔드로 전달
- `host.docker.internal`: Docker 컨테이너에서 호스트 머신 접근 (Mac/Windows)
- Linux에서는 `172.17.0.1`로 변경 필요

#### 2. React SPA 라우팅

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

- 모든 경로를 `index.html`로 fallback
- React Router가 클라이언트 사이드에서 라우팅 처리

#### 3. 정적 파일 캐싱

```nginx
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

- JavaScript, CSS, 이미지 등은 1년간 브라우저 캐싱
- Vite의 해시 기반 파일명 덕분에 안전

## 🔧 환경별 설정

### Mac / Windows 환경

`nginx.conf` 기본 설정 사용 (변경 불필요):

```nginx
proxy_pass http://host.docker.internal:9080;
```

### Linux 환경

`nginx.conf` 수정 필요:

```nginx
# AS-IS
proxy_pass http://host.docker.internal:9080;

# TO-BE (Linux)
proxy_pass http://172.17.0.1:9080;
```

또는 백엔드도 Docker 컨테이너인 경우:

```nginx
proxy_pass http://backend:9080;
```

그리고 `docker-compose.yml`에 네트워크 추가:

```yaml
services:
  frontend:
    # ...
    networks:
      - app-network

networks:
  app-network:
    external: true  # 백엔드와 공유하는 네트워크
```

## 🛠️ 유용한 명령어

### Docker Compose 관련

```bash
# 컨테이너 빌드 및 실행
docker-compose up -d --build

# 로그 확인
docker-compose logs -f

# 컨테이너 중지
docker-compose stop

# 컨테이너 삭제
docker-compose down

# 이미지까지 삭제
docker-compose down --rmi all
```

### Docker 직접 제어

```bash
# 컨테이너 상태 확인
docker ps

# 컨테이너 로그 확인
docker logs sbs-frontend

# 컨테이너 내부 접속 (디버깅)
docker exec -it sbs-frontend sh

# Nginx 설정 테스트 (컨테이너 내부)
docker exec sbs-frontend nginx -t

# Nginx 재시작 (설정 변경 후)
docker exec sbs-frontend nginx -s reload

# 컨테이너 중지
docker stop sbs-frontend

# 컨테이너 삭제
docker rm sbs-frontend

# 이미지 삭제
docker rmi sbs-frontend
```

### 디버깅 명령어

```bash
# Nginx 설정 파일 확인
docker exec sbs-frontend cat /etc/nginx/conf.d/default.conf

# 빌드된 파일 목록 확인
docker exec sbs-frontend ls -la /usr/share/nginx/html

# Nginx 에러 로그 확인
docker exec sbs-frontend cat /var/log/nginx/error.log

# Nginx 액세스 로그 확인
docker exec sbs-frontend cat /var/log/nginx/access.log

# 컨테이너 네트워크 정보 확인
docker inspect sbs-frontend | grep -A 20 NetworkSettings
```

## 🐛 트러블슈팅

### 문제 1: "Cannot connect to backend" (API 요청 실패)

**증상:**

```text
Console: Failed to load resource: net::ERR_CONNECTION_REFUSED
Network Tab: http://localhost/api/... 502 Bad Gateway
```

**원인:** 백엔드 서버가 실행 중이지 않거나 포트가 다름

**해결:**

```bash
# 백엔드 상태 확인
curl http://localhost:9080/actuator/health

# 백엔드가 Docker 컨테이너인 경우
docker ps | grep backend

# nginx.conf의 proxy_pass 확인
docker exec sbs-frontend cat /etc/nginx/conf.d/default.conf | grep proxy_pass
```

### 문제 2: "404 Not Found" (페이지 새로고침 시)

**증상:**

- `/login`으로 직접 접속 시 404 에러
- 홈에서 네비게이션은 정상 작동

**원인:** Nginx 설정에 `try_files` fallback 누락

**해결:**

`nginx.conf` 확인:

```nginx
location / {
    try_files $uri $uri/ /index.html;  # 이 줄이 있어야 함
}
```

### 문제 3: "CORS Error" (API 요청 실패)

**증상:**

```text
Access to XMLHttpRequest has been blocked by CORS policy
```

**원인:** 백엔드 CORS 설정에 `http://localhost` 추가 필요

**해결:**

백엔드의 `application-dev.yml` 또는 `WebConfig.java` 수정:

```yaml
# application-dev.yml
app:
  cors:
    allowed-origins:
      - http://localhost         # 추가!
      - http://localhost:80      # 추가!
      - http://localhost:5173
```

또는 Java 설정:

```java
@Override
public void addCorsMappings(CorsRegistry registry) {
    registry.addMapping("/api/**")
        .allowedOrigins(
            "http://localhost",
            "http://localhost:80",
            "http://localhost:5173"
        )
        .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
        .allowedHeaders("*")
        .allowCredentials(true);
}
```

### 문제 4: "Bridge network not found"

**증상:**

```text
Error: network bridge not found
```

**원인:** Docker의 기본 bridge 네트워크 설정 문제

**해결:**

```bash
# Docker 네트워크 확인
docker network ls

# bridge 네트워크가 없으면 생성
docker network create bridge

# 또는 docker-compose.yml 수정하여 사용자 정의 네트워크 사용
```

### 문제 5: "Cannot link to mysql-8"

**증상:**

```text
Error: could not find container for mysql-8
```

**원인:** mysql-8 컨테이너가 실행 중이지 않거나 이름이 다름

**해결:**

```bash
# 실행 중인 컨테이너 확인
docker ps -a | grep mysql

# mysql-8 컨테이너 시작
docker start mysql-8

# 또는 docker-compose.yml에서 external_links 제거
# (MySQL 연결이 프론트엔드에서 필요 없는 경우)
```

### 문제 6: "Port 80 already in use"

**증상:**

```text
Error: bind: address already in use
```

**원인:** 80 포트를 다른 프로세스가 사용 중

**해결:**

```bash
# 80 포트를 사용하는 프로세스 확인 (Mac/Linux)
sudo lsof -i :80

# 프로세스 종료 또는 다른 포트 사용
# docker-compose.yml 수정:
ports:
  - "8080:80"  # 호스트 포트를 8080으로 변경

# 접속: http://localhost:8080
```

## 📊 헬스 체크

### Docker 헬스 체크

`docker-compose.yml`에 헬스 체크가 포함되어 있습니다:

```yaml
healthcheck:
  test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost/"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

헬스 상태 확인:

```bash
docker ps
# STATUS 컬럼에 "healthy" 또는 "unhealthy" 표시됨

# 상세 정보 확인
docker inspect sbs-frontend | grep -A 10 Health
```

### 수동 헬스 체크

```bash
# 프론트엔드 응답 확인
curl -I http://localhost

# API 프록시 확인
curl http://localhost/api/health

# 특정 페이지 확인
curl http://localhost/login
```

## 🚢 배포 준비

로컬 테스트가 완료되면 다음 단계로 진행할 수 있습니다:

### 1. 이미지 레지스트리에 푸시

```bash
# Docker Hub에 푸시
docker tag sbs-frontend your-username/sbs-frontend:latest
docker push your-username/sbs-frontend:latest

# AWS ECR에 푸시
aws ecr get-login-password --region ap-northeast-2 | \
  docker login --username AWS --password-stdin 123456789.dkr.ecr.ap-northeast-2.amazonaws.com
docker tag sbs-frontend 123456789.dkr.ecr.ap-northeast-2.amazonaws.com/sbs-frontend:latest
docker push 123456789.dkr.ecr.ap-northeast-2.amazonaws.com/sbs-frontend:latest
```

### 2. 프로덕션 환경 설정 변경

`nginx.conf` 수정:

```nginx
# 백엔드 URL을 실제 프로덕션 URL로 변경
proxy_pass http://backend.example.com:9080;

# 또는 내부 서비스 이름 사용 (Kubernetes, ECS 등)
proxy_pass http://backend-service:9080;
```

### 3. HTTPS 설정 (프로덕션 필수)

`nginx.conf`에 SSL 설정 추가 또는 로드 밸런서(ALB, Nginx Proxy) 사용

### 4. 환경 변수 관리

민감한 정보는 `.env.production` 대신 다음 방법 사용:

- Kubernetes Secrets
- AWS Systems Manager Parameter Store
- HashiCorp Vault
- Docker Secrets

## 📝 체크리스트

로컬 테스트 완료 전 확인 사항:

- [ ] Docker 이미지 빌드 성공
- [ ] 컨테이너 실행 성공 (80 포트)
- [ ] 프론트엔드 페이지 로딩 확인
- [ ] API 요청 정상 작동 (로그인, 회원가입 등)
- [ ] 카카오 로그인 플로우 테스트
- [ ] 페이지 새로고침 시 404 에러 없음
- [ ] React Router 네비게이션 정상 작동
- [ ] 정적 파일(이미지, CSS, JS) 로딩 확인
- [ ] 브라우저 콘솔에 에러 없음
- [ ] Nginx 로그 확인 (`docker logs sbs-frontend`)

## 🔗 추가 자료

- [Docker 공식 문서](https://docs.docker.com/)
- [Nginx 공식 문서](https://nginx.org/en/docs/)
- [Docker Compose 문서](https://docs.docker.com/compose/)
- [Vite 프로덕션 빌드 가이드](https://vitejs.dev/guide/build.html)

---

**문서 작성일:** 2025-12-28
**버전:** 1.0
**작성자:** Claude Code

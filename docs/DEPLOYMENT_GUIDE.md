# 프론트엔드 배포 가이드

> React 프론트엔드를 AWS Lightsail에 Docker + GitHub Actions로 자동 배포하는 가이드

## 목차

1. [아키텍처 개요](#아키텍처-개요)
2. [사전 준비](#사전-준비)
3. [배포 파일 구조](#배포-파일-구조)
4. [GitHub Secrets 설정](#github-secrets-설정)
5. [첫 배포 실행](#첫-배포-실행)
6. [배포 프로세스](#배포-프로세스)
7. [트러블슈팅](#트러블슈팅)
8. [유용한 명령어](#유용한-명령어)

---

## 아키텍처 개요

### 배포 흐름

```
┌─────────────────────────────────────────────────────────────────────┐
│                        GitHub Actions CI/CD                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. main 브랜치에 push                                               │
│           ↓                                                          │
│  2. GitHub Actions 트리거                                            │
│           ↓                                                          │
│  3. Docker 이미지 빌드 (Dockerfile.prod)                             │
│           ↓                                                          │
│  4. GHCR(GitHub Container Registry)에 이미지 푸시                    │
│           ↓                                                          │
│  5. SSH로 Lightsail 서버 접속                                        │
│           ↓                                                          │
│  6. 새 이미지 pull 및 컨테이너 재시작                                │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 프로덕션 네트워크 구조

```
┌─────────────────────────────────────────────────────────────────────┐
│                    prod-network (Docker 네트워크)                    │
│                                                                      │
│   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐           │
│   │  prod-mysql  │   │ prod-backend │   │prod-frontend │           │
│   │    :3306     │◄──│    :9080     │◄──│    :80       │           │
│   │   (MySQL)    │   │ (Spring Boot)│   │   (Nginx)    │           │
│   └──────────────┘   └──────────────┘   └──────────────┘           │
│                                                ↑                     │
└────────────────────────────────────────────────┼─────────────────────┘
                                                 │
                                            포트 매핑
                                            (80:80)
                                                 │
┌────────────────────────────────────────────────▼─────────────────────┐
│                     AWS Lightsail 서버                               │
│                     IP: 16.184.53.118                                │
│                                                                      │
│   브라우저 → http://16.184.53.118                                    │
│           → /api/* → Nginx → prod-backend:9080                      │
│           → /auth/* → Nginx → prod-backend:9080                     │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 사전 준비

### 1. AWS Lightsail 서버 준비

- Lightsail 인스턴스 생성 (Amazon Linux 2 또는 Ubuntu 권장)
- 고정 IP 할당
- 방화벽에서 포트 80, 443 열기
- Docker 및 Docker Compose 설치

```bash
# Amazon Linux 2에서 Docker 설치
sudo yum update -y
sudo amazon-linux-extras install docker -y
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER

# Docker Compose 설치
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 2. 백엔드 먼저 배포

프론트엔드는 `prod-network`를 사용하므로, 백엔드가 먼저 배포되어 네트워크가 생성되어 있어야 합니다.

```bash
# 백엔드 서버에서
cd ~/backend
docker compose -f docker-compose.prod.yml up -d
```

### 3. SSH 키 준비

Lightsail 인스턴스의 SSH 개인 키가 필요합니다.
- Lightsail 콘솔 → 계정 → SSH 키 → 기본 키 다운로드

---

## 배포 파일 구조

```
sbs/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions 워크플로우
├── Dockerfile.prod             # 프로덕션용 Docker 빌드 파일
├── nginx.prod.conf             # 프로덕션용 Nginx 설정
├── docker-compose.prod.yml     # 프로덕션용 Docker Compose (로컬 참조용)
└── docs/
    └── DEPLOYMENT_GUIDE.md     # 이 문서
```

### 파일별 역할

| 파일 | 역할 |
|------|------|
| `deploy.yml` | GitHub Actions 워크플로우 정의. main 브랜치 push 시 자동 배포 |
| `Dockerfile.prod` | 멀티 스테이지 빌드로 React 앱 빌드 후 Nginx로 서빙 |
| `nginx.prod.conf` | Nginx 설정. SPA 라우팅 + API 프록시 + 캐싱 + 보안 헤더 |
| `docker-compose.prod.yml` | 프로덕션 컨테이너 정의 (실제로는 deploy.yml에서 동적 생성) |

---

## GitHub Secrets 설정

GitHub 저장소 → Settings → Secrets and variables → Actions에서 설정:

### 필수 Secrets

| Secret 이름 | 설명 | 예시 |
|------------|------|------|
| `LIGHTSAIL_HOST` | Lightsail 서버 IP 주소 | `16.184.53.118` |
| `LIGHTSAIL_USERNAME` | SSH 접속 사용자명 | `ec2-user` 또는 `ubuntu` |
| `LIGHTSAIL_SSH_KEY` | SSH 개인 키 전체 내용 | `-----BEGIN RSA PRIVATE KEY-----...` |
| `GHCR_TOKEN` | GitHub Personal Access Token | `ghp_xxxxxxxxxxxx` |

### GHCR_TOKEN 생성 방법

1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. "Generate new token (classic)" 클릭
3. Note: `GHCR_TOKEN`
4. Select scopes: `read:packages` 체크
5. "Generate token" 클릭
6. 생성된 토큰 복사하여 Secrets에 추가

### SSH 키 설정 주의사항

SSH 키는 **전체 내용**을 복사해야 합니다:

```
-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA...
...중간 내용...
-----END RSA PRIVATE KEY-----
```

줄바꿈이 포함되어야 합니다!

---

## 첫 배포 실행

### 1. 코드 push로 자동 배포

```bash
git add .
git commit -m "배포 설정 추가"
git push origin main
```

### 2. GitHub Actions 확인

- GitHub 저장소 → Actions 탭
- "Deploy Frontend to Lightsail" 워크플로우 확인
- 녹색 체크: 성공 / 빨간색 X: 실패

### 3. 수동 배포 (필요시)

GitHub Actions 탭에서 "Run workflow" 버튼 클릭

---

## 배포 프로세스

### 자동 배포 (권장)

```bash
# 로컬에서 코드 수정 후
git add .
git commit -m "기능 추가"
git push origin main
# → GitHub Actions가 자동으로 배포 실행
```

### 수동 배포 (Lightsail 서버에서)

```bash
# 서버 접속
ssh -i ~/.ssh/lightsail-key.pem ec2-user@16.184.53.118

# 프론트엔드 디렉토리로 이동
cd ~/frontend

# 최신 이미지 pull
docker compose -f docker-compose.prod.yml pull

# 컨테이너 재시작
docker compose -f docker-compose.prod.yml up -d --force-recreate
```

### 롤백 방법

```bash
# 특정 버전으로 롤백 (커밋 SHA 사용)
docker pull ghcr.io/icesnake72/sbs:abc1234
docker compose -f docker-compose.prod.yml up -d --force-recreate
```

---

## 트러블슈팅

### Q1. "Permission denied" SSH 오류

**원인**: SSH 키가 올바르지 않음

**해결**:
- LIGHTSAIL_SSH_KEY에 개인 키 전체가 복사되었는지 확인
- 줄바꿈이 제대로 포함되었는지 확인
- 키 파일 권한 확인: `chmod 600 key.pem`

### Q2. "network prod-network not found" 오류

**원인**: 백엔드가 배포되지 않아 네트워크가 없음

**해결**:
```bash
# 백엔드 먼저 배포
cd ~/backend
docker compose -f docker-compose.prod.yml up -d
```

또는 수동으로 네트워크 생성:
```bash
docker network create prod-network
```

### Q3. GHCR 이미지 pull 실패 (denied 오류)

**원인**: 인증 실패 또는 패키지가 private

**해결 방법 1**: GHCR_TOKEN 설정
1. GitHub Personal Access Token 생성 (read:packages 권한)
2. GitHub Secrets에 GHCR_TOKEN 추가

**해결 방법 2**: 패키지를 public으로 변경
1. GitHub 저장소 → Packages 클릭
2. 패키지 선택 → Package settings
3. Danger Zone → Change package visibility → Public

### Q4. 502 Bad Gateway

**원인**: 백엔드가 실행 중이 아님

**해결**:
```bash
# 백엔드 상태 확인
docker ps | grep prod-backend

# 백엔드가 없으면 시작
cd ~/backend
docker compose -f docker-compose.prod.yml up -d
```

### Q5. 카카오 로그인 실패

**원인**: CORS 또는 쿠키 설정 문제

**확인 사항**:
1. 카카오 개발자 콘솔에서 Redirect URI 설정 확인
2. 백엔드 CORS 설정 확인
3. Nginx의 /auth 프록시 설정 확인

### Q6. 정적 파일 404 오류

**원인**: Nginx 설정 문제 또는 빌드 실패

**해결**:
```bash
# 컨테이너 내부 확인
docker exec -it prod-frontend sh
ls -la /usr/share/nginx/html

# Nginx 설정 확인
cat /etc/nginx/conf.d/default.conf
```

---

## 유용한 명령어

### 컨테이너 관리

```bash
# 실행 중인 컨테이너 확인
docker ps

# 컨테이너 로그 확인
docker logs prod-frontend
docker logs -f prod-frontend  # 실시간 로그

# 컨테이너 재시작
docker restart prod-frontend

# 컨테이너 중지 및 삭제
docker compose -f docker-compose.prod.yml down
```

### 이미지 관리

```bash
# 이미지 목록
docker images

# 사용하지 않는 이미지 정리
docker image prune -f

# 특정 이미지 삭제
docker rmi ghcr.io/icesnake72/sbs:latest
```

### 네트워크 확인

```bash
# 네트워크 목록
docker network ls

# 네트워크 상세 정보 (연결된 컨테이너 확인)
docker network inspect prod-network
```

### 디버깅

```bash
# 컨테이너 내부 접속
docker exec -it prod-frontend sh

# Nginx 설정 테스트
docker exec prod-frontend nginx -t

# Nginx 재로드
docker exec prod-frontend nginx -s reload

# 헬스 체크
curl -I http://localhost/
curl http://localhost/api/health
```

### 디스크 정리

```bash
# Docker 전체 정리 (주의: 사용하지 않는 모든 리소스 삭제)
docker system prune -a

# 로그 파일 크기 확인
du -sh /var/lib/docker/containers/*/*-json.log
```

---

## 환경별 설정 요약

| 환경 | Dockerfile | Nginx 설정 | Docker Compose | 백엔드 주소 |
|------|-----------|-----------|----------------|------------|
| 개발 | `Dockerfile` | `nginx.conf` | `docker-compose.yml` | `myauth-backend-dev:9080` |
| 프로덕션 | `Dockerfile.prod` | `nginx.prod.conf` | `docker-compose.prod.yml` | `prod-backend:9080` |

---

## 참고 링크

- [Docker 공식 문서](https://docs.docker.com/)
- [Nginx 공식 문서](https://nginx.org/en/docs/)
- [GitHub Actions 공식 문서](https://docs.github.com/en/actions)
- [GitHub Container Registry 가이드](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
- [AWS Lightsail 문서](https://docs.aws.amazon.com/lightsail/)

---

## 변경 이력

| 날짜 | 내용 |
|------|------|
| 2026-01-03 | 최초 작성 |

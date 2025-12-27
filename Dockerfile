# ==========================================
# 멀티 스테이지 빌드: React 프론트엔드 Docker 이미지
# ==========================================
# Stage 1: Build (개발 의존성 포함하여 빌드)
# Stage 2: Production (Nginx로 정적 파일 서빙)

# ==========================================
# Stage 1: Build Stage
# ==========================================
FROM node:20-alpine AS builder

# 작업 디렉토리 설정
WORKDIR /app

# package.json과 package-lock.json 복사 (캐시 활용)
# 의존성이 변경되지 않으면 이 레이어는 캐시됨
COPY package*.json ./

# 의존성 설치
# --frozen-lockfile: package-lock.json을 정확히 따름 (CI/CD 환경)
RUN npm ci

# 소스 코드 복사
COPY . .

# 프로덕션 빌드
# vite build 명령으로 dist/ 폴더에 최적화된 정적 파일 생성
RUN npm run build

# ==========================================
# Stage 2: Production Stage (Nginx)
# ==========================================
FROM nginx:alpine

# 빌드된 정적 파일을 Nginx의 기본 웹 루트로 복사
# builder 스테이지의 /app/dist → Nginx의 /usr/share/nginx/html
COPY --from=builder /app/dist /usr/share/nginx/html

# Nginx 설정 파일 복사
# API 프록시 설정과 SPA 라우팅을 위한 설정 포함
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 80 포트 노출
EXPOSE 80

# Nginx 실행 (포그라운드 모드)
# daemon off는 Docker 컨테이너가 종료되지 않도록 함
CMD ["nginx", "-g", "daemon off;"]

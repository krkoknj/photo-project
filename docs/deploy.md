# 배포 가이드

구성: **Vercel**(Next.js) + **Supabase**(DB·인증) + **Cloudflare R2**(사진) + **Resend**(메일) + 작가별 **토스페이먼츠**

계정은 모두 직접 만들어야 한다. 순서대로 진행하면서 나온 값을 마지막에 Vercel 환경 변수로 넣는다.

## 1. Supabase 클라우드

1. supabase.com에서 프로젝트를 만든다. 리전은 Northeast Asia (Seoul)로 한다.
2. 로컬 저장소를 연결하고 스키마를 올린다.
   ```bash
   npx supabase login
   npx supabase link --project-ref <프로젝트 ref>
   npx supabase db push
   ```
   `seed.sql`(테스트 계정, 로컬 버킷)은 운영에 적용되지 않는다.
3. **Authentication > URL Configuration**
   - Site URL: `https://<도메인>`
   - Redirect URLs: `https://<도메인>/auth/confirm`
4. **Authentication > Providers > Email**: "Confirm email"을 켠다. 로컬에서는 꺼져 있다.
5. **Authentication > SMTP**: Resend SMTP를 연결한다(3단계 참고). 기본 발송은 시간당 몇 통으로 제한된다.
6. **Project Settings > API**: 아래 두 값을 적어둔다.
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - Publishable key → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - Secret key → `SUPABASE_SECRET_KEY` (서버 전용, 절대 공개 금지)

## 2. Cloudflare R2

1. R2 버킷을 만든다(예: `selectgallery-photos`). 공개 접근은 끈다.
2. **CORS 정책**: 브라우저 직접 업로드와 전체 ZIP 다운로드에 필요하다.
   ```json
   [
     {
       "AllowedOrigins": ["https://<도메인>"],
       "AllowedMethods": ["PUT", "GET"],
       "AllowedHeaders": ["content-type"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```
3. **수명 주기 규칙**: 접두사 `trash/`인 객체를 7일 뒤 삭제한다. 앱은 영구 삭제하지 않고 `trash/`로 옮기기만 한다.
4. **R2 API 토큰**: 이 버킷에 Object Read & Write 권한으로 만든다.
   - `S3_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com`
   - `S3_REGION=auto`
   - `S3_BUCKET=<버킷 이름>`
   - `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`

## 3. Resend (알림 메일)

1. resend.com에서 보내는 도메인을 추가하고 DNS(SPF·DKIM) 레코드를 등록해 인증한다.
2. API 키를 만든다 → `RESEND_API_KEY`
3. `EMAIL_FROM=noreply@<인증한 도메인>`
4. 같은 도메인으로 Supabase 인증 메일 SMTP도 설정한다. 호스트는 `smtp.resend.com`, 포트는 465, 사용자는 `resend`, 비밀번호는 API 키다.

## 4. Vercel

1. GitHub 저장소를 연결해 프로젝트를 만든다. 리전은 Seoul(icn1)을 권장한다.
2. **Environment Variables** (Production):

   | 이름 | 값 |
   |---|---|
   | `NEXT_PUBLIC_SITE_URL` | `https://<도메인>` |
   | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` | 1단계 |
   | `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | 2단계 |
   | `RESEND_API_KEY`, `EMAIL_FROM` | 3단계 |
   | `GALLERY_ACCESS_SECRET` | 새 랜덤 값 (아래 명령) |
   | `PAYMENT_SECRET_KEY` | 새 랜덤 32바이트. **잃어버리면 작가들이 토스 키를 다시 입력해야 한다** |
   | `CRON_SECRET` | 새 랜덤 값 |

   `MAILPIT_URL`은 넣지 않는다(로컬 전용).

   랜덤 값 만들기:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
   ```
3. 배포하면 `vercel.json`의 cron이 등록된다. 매일 03:00(KST)에 `/api/cron/expire`가 실행된다.

## 5. 배포 후 확인

- [ ] 작가 가입 → 인증 메일 → 로그인
- [ ] 갤러리 생성 → 원본 업로드 → 미리보기에 "PREVIEW" 워터마크 글자가 보이는지 확인 (서버에 글꼴이 없으면 띠만 보임)
- [ ] 휴대폰으로 공유 링크 열기 → 비밀번호 → 셀렉 → 핀 → 제출 → 작가에게 알림 메일
- [ ] 결제 설정에 토스 **테스트 키** 연결 → 추가 결제 → 승인 → 셀렉 확정
- [ ] 보정본 업로드 → 전달 → 고객 알림 메일 → 한 장 저장, 전체 ZIP
- [ ] Vercel 대시보드 > Cron Jobs에서 `/api/cron/expire`를 수동 실행해 200 응답 확인

## 남은 작업 (MVP 이후)

- 공유 비밀번호 요청 제한 (IP 기준, Vercel WAF 또는 Upstash Ratelimit)
- 토스 결제 웹훅
- 대량 업로드 시 이미지 처리를 작업 큐(Inngest 등)로 분리
- 카카오 알림톡
- 보정본 보관 기간 정책 (지금은 만료 후에도 미리보기·보정본은 남긴다)

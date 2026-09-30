# 데이터 모델

- 스택: Next.js 16 (App Router) + Supabase (PostgreSQL 17, Auth) + Cloudflare R2
- 결제: 작가 본인의 토스페이먼츠 키를 연결해서 결제금이 작가에게 바로 가는 구조 (플랫폼은 구독료 수익)
- 마이그레이션: `supabase/migrations/20260930000000_init_schema.sql`

```
photographers ─┬─< galleries ─┬─< photos ─┬─< retouch_pins
               │              │           ├── selections
               │              │           └─< retouched_files
               │              ├─< orders
               │              └─< notifications
               └── payment_settings (1:1)
```

| 테이블 | 역할 | 주요 컬럼 |
|---|---|---|
| photographers | 작가 (auth.users와 1:1, 가입 시 트리거로 자동 생성) | display_name, studio_name, email |
| payment_settings | 작가 PG 키 | toss_client_key, toss_secret_key_encrypted |
| galleries | 촬영 1건 = 갤러리 1개 | share_token, password_hash, base_select_count, extra_price_krw, status, expires_at, trashed_at |
| photos | 원본 + 미리보기 | filename, match_key, original_key, preview_key, thumb_key, processing_status, original_purged_at |
| selections | 고객 셀렉 | photo_id, is_extra |
| retouch_pins | 사진 위 보정 요청 핀 | x, y (0~1 비율), body, author, resolved_at |
| orders | 추가 보정 결제 | toss_order_id, extra_count, unit_price_krw, amount_krw, status, payment_key |
| retouched_files | 보정본 | filename, file_key, photo_id (매칭 실패 시 null), match_status |
| notifications | 알림 발송 기록 | type, recipient, status, sent_at |

## 갤러리 상태

`draft → open → (awaiting_payment) → submitted → delivered → expired`

- `awaiting_payment`: 기본 장수를 초과해 제출했고 추가 결제를 기다리는 상태
- 제출(`submitted`) 이후에는 셀렉이 잠긴다.

## 규칙

- **접근 권한**: 작가는 RLS(`photographer_id = auth.uid()`)로 본인 데이터만 접근한다. 고객은 로그인하지 않으므로 서버에서 `share_token`과 비밀번호를 검증한 뒤 service role로 처리한다.
- **무결성**: selections, retouch_pins, retouched_files는 `(photo_id, gallery_id)` 복합 FK를 걸어서 다른 갤러리의 사진을 참조할 수 없다.
- **파일명 매칭**: `match_key`는 파일명을 소문자로 바꾸고, 확장자와 `-edit`, `_retouched`, ` (1)` 같은 접미사를 제거한 값이다. 갤러리 안에서 unique하다.
- **R2 경로**: `galleries/{galleryId}/{originals|previews|thumbs|retouched}/{id}.{ext}`. 원본은 고객에게 노출하지 않는다.
- **삭제**: 영구 삭제 대신 휴지통 처리한다. 갤러리는 `trashed_at`을 쓰고, 만료된 원본은 R2의 `trash/` 경로로 옮긴 뒤 수명 주기 규칙이 7일 후 삭제한다.
- **금액**: 원화 정수(`*_krw`)로 저장한다. 서버에서 결제 승인 API로 검증한 뒤에만 `paid` 상태가 된다.

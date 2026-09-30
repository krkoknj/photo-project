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
- **고객 접근 조건** (4단계에서 구현): 공유 링크는 `status`가 `draft`나 `expired`가 아니고, `trashed_at`이 null이고, `expires_at`이 지나지 않았을 때만 연다.
- **작가가 바꿀 수 있는 상태**: `draft ↔ open`만 직접 바꿀 수 있다. 나머지 상태는 고객의 제출, 결제, 보정본 전달, 만료 처리에 따라 바뀐다. 제출 이후에는 셀렉 장수와 가격을 서버에서 잠근다.
- **공유 비밀번호**: scrypt로 해시해서 저장한다(`src/lib/password.ts`). 링크 재발급으로 `share_token`을 바꾸면 기존 링크는 무효가 된다.
- **셀렉 장수 규칙** (`src/lib/selection.ts`): 추가 보정 가격이 있으면 기본 장수를 넘겨 고를 수 있고 넘긴 만큼 결제한다. 가격이 0원이면 기본 장수까지만 고를 수 있다. 기본 장수와 가격이 모두 0이면 제한이 없다. 제출할 때 나중에 고른 사진부터 `is_extra`로 표시한다.
- **보정 요청 핀**: 고른 사진에만 남길 수 있다. 제출 전에는 고객이 자기 핀을 지울 수 있다(아직 작가에게 전달되기 전의 초안이라 바로 삭제). 선택을 뺀 사진의 핀은 남아 있지만 작가에게는 보이지 않고, 다시 고르면 되살아난다.
- **셀렉 다시 열기**: 작가는 제출됐거나 결제 대기 중인 셀렉을 `open`으로 되돌릴 수 있다. 결제가 끝난 주문이 있으면 되돌릴 수 없다.
- **추가 보정 결제** (`src/lib/payments.ts`):
  - 금액은 항상 서버가 `셀렉 수 × 장당 가격`으로 다시 계산한다. 토스 승인 전에 세 금액이 모두 같은지 확인한다: 토스가 돌려준 금액, 주문 금액, 지금 셀렉 기준 금액.
  - 주문(`orders`)은 `method`가 `toss`(결제창)나 `manual`(계좌이체 후 작가 확인)이다.
  - 셀렉을 다시 열면 `pending` 주문은 `canceled`가 된다. 결제된(`paid`) 주문이 있으면 셀렉을 다시 열 수 없다.
- **작가 결제 설정** (`payment_settings`): 토스 시크릿 키는 AES-256-GCM으로 암호화해 저장한다(`PAYMENT_SECRET_KEY`). 저장할 때 토스 API로 키가 유효한지 확인한다. 계좌 정보는 고객에게 계좌이체를 안내하는 데 쓴다.
- **보정본 전달** (`retouched_files`):
  - 파일명의 `match_key`로 원본과 자동 연결한다. 실패하면 `unmatched`로 두고 작가가 직접 연결한다.
  - 사진 한 장에는 보정본이 하나만 연결된다(부분 unique 인덱스). 같은 사진에 다시 올리면 이전 파일은 `trash/`로 옮기고 교체한다.
  - 고객에게는 워터마크 없는 미리보기·썸네일을 보여주고, 다운로드는 원래 파일명이 붙은 서명 URL로 한다. 전체 ZIP은 브라우저에서 묶는다(`client-zip`).
  - 작가가 "고객에게 전달"을 누르면 `status = delivered`, `delivered_at`을 기록한다. 전달 후에 올린 보정본도 고객에게 바로 보인다.
- **만료 처리** (`src/lib/expiry.ts`, 매일 03:00 KST cron):
  - 만료 3일 전 고객에게 예고 메일을 한 번 보낸다.
  - 기한이 지나면 `status = expired`로 바꿔 링크를 닫는다.
  - 원본은 `trash/`로 옮기고 `original_purged_at`을 기록한다. 한 번에 300장씩 처리하고, 남으면 다음 실행에서 이어서 처리한다.
  - 미리보기·썸네일·보정본은 남긴다. 작가가 만료일을 미래로 바꾸면 만료 전 상태(전달 완료, 셀렉 완료, 셀렉 진행 중)로 돌아가 링크가 다시 열린다.

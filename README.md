# 셀렉갤러리

사진작가용 셀렉·보정 전달 갤러리. 프로젝트 브리프는 [CLAUDE.md](CLAUDE.md), 설계는 [docs/](docs/)를 참고한다.

## 로컬 실행

필요한 것: Node.js 20.9+, Docker Desktop

```bash
npm install
npx supabase start        # 로컬 Supabase (DB·Auth) 실행
cp .env.example .env.local # PUBLISHABLE_KEY는 `npx supabase status`에서 복사
npm run dev
```

- 앱: http://localhost:3000
- Supabase Studio (DB 관리 화면): http://127.0.0.1:54323
- 메일 확인 (Mailpit): http://127.0.0.1:54324
- 테스트 작가 계정은 `supabase/seed.sql` 참고

## 자주 쓰는 명령

| 명령 | 설명 |
|---|---|
| `npx supabase migration new <이름>` | 새 마이그레이션 파일 생성 |
| `npx supabase db reset` | 로컬 DB 초기화 후 마이그레이션·시드 재적용 |
| `npx supabase gen types typescript --local > src/lib/supabase/database.types.ts` | DB 타입 재생성 |
| `npx supabase stop` | 로컬 Supabase 종료 |

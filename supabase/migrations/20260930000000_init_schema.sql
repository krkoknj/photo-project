-- 초기 스키마: 작가, 갤러리, 사진, 셀렉, 보정 요청(핀), 결제, 보정본, 알림
-- 설계 문서: docs/data-model.md

-- ─────────────────────────────────────────────
-- Enum
-- ─────────────────────────────────────────────
create type public.gallery_status as enum (
  'draft',            -- 작성 중 (고객에게 비공개)
  'open',             -- 고객 셀렉 진행 중
  'awaiting_payment', -- 기본 장수 초과 셀렉 제출, 추가 결제 대기
  'submitted',        -- 셀렉 제출 완료 (잠금)
  'delivered',        -- 보정본 전달 완료
  'expired'           -- 기간 만료, 원본 정리됨
);

create type public.photo_processing_status as enum ('pending', 'processing', 'ready', 'failed');
create type public.pin_author as enum ('client', 'photographer');
create type public.order_status as enum ('pending', 'paid', 'failed', 'canceled');
create type public.retouch_match_status as enum ('matched', 'unmatched');
create type public.notification_type as enum ('selection_submitted', 'retouch_delivered', 'expiry_warning');
create type public.notification_status as enum ('queued', 'sent', 'failed');

-- ─────────────────────────────────────────────
-- 공통: updated_at 자동 갱신
-- ─────────────────────────────────────────────
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─────────────────────────────────────────────
-- 작가
-- ─────────────────────────────────────────────
create table public.photographers (
  id           uuid primary key references auth.users (id) on delete cascade,
  email        text not null,
  display_name text not null default '',
  studio_name  text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger photographers_updated_at
  before update on public.photographers
  for each row execute function public.set_updated_at();

-- 가입 시 photographers 행 자동 생성
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.photographers (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 작가 본인의 PG(토스페이먼츠) 키. 시크릿은 서버에서 암호화해 저장하고
-- 클라이언트에서는 절대 읽지 못하도록 정책을 두지 않는다 (service role 전용).
create table public.payment_settings (
  photographer_id           uuid primary key references public.photographers (id) on delete cascade,
  toss_client_key           text,
  toss_secret_key_encrypted text,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create trigger payment_settings_updated_at
  before update on public.payment_settings
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────
-- 갤러리
-- ─────────────────────────────────────────────
create table public.galleries (
  id                uuid primary key default gen_random_uuid(),
  photographer_id   uuid not null references public.photographers (id) on delete cascade,
  title             text not null,
  client_name       text,
  client_email      text,
  -- 공유 링크용 토큰 (URL-safe, 24자)
  share_token       text not null unique
                    default translate(encode(extensions.gen_random_bytes(18), 'base64'), '+/', '-_'),
  password_hash     text,
  base_select_count integer not null default 0 check (base_select_count >= 0),
  extra_price_krw   integer not null default 0 check (extra_price_krw >= 0),
  status            public.gallery_status not null default 'draft',
  expires_at        timestamptz,
  submitted_at      timestamptz,
  trashed_at        timestamptz, -- 작가가 삭제 시 휴지통 처리 (영구 삭제 X)
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index galleries_photographer_id_idx on public.galleries (photographer_id);
create index galleries_expires_at_idx on public.galleries (expires_at) where status <> 'expired';

create trigger galleries_updated_at
  before update on public.galleries
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────
-- 사진 (원본 + 미리보기)
-- ─────────────────────────────────────────────
create table public.photos (
  id                 uuid primary key default gen_random_uuid(),
  gallery_id         uuid not null references public.galleries (id) on delete cascade,
  filename           text not null,
  -- 보정본 자동 매칭용 정규화 키 (소문자, 확장자·-edit 등 접미사 제거)
  match_key          text not null,
  original_key       text not null,
  preview_key        text,
  thumb_key          text,
  width              integer,
  height             integer,
  size_bytes         bigint,
  processing_status  public.photo_processing_status not null default 'pending',
  sort_order         integer not null default 0,
  original_purged_at timestamptz,
  created_at         timestamptz not null default now(),
  unique (gallery_id, match_key),
  unique (id, gallery_id) -- 하위 테이블이 같은 갤러리의 사진만 참조하도록 복합 FK 대상
);

create index photos_gallery_sort_idx on public.photos (gallery_id, sort_order);

-- ─────────────────────────────────────────────
-- 셀렉
-- ─────────────────────────────────────────────
create table public.selections (
  id         uuid primary key default gen_random_uuid(),
  gallery_id uuid not null references public.galleries (id) on delete cascade,
  photo_id   uuid not null,
  is_extra   boolean not null default false, -- 기본 장수 초과분 (추가 결제 대상)
  created_at timestamptz not null default now(),
  unique (gallery_id, photo_id),
  foreign key (photo_id, gallery_id) references public.photos (id, gallery_id) on delete cascade
);

create index selections_photo_id_idx on public.selections (photo_id);

-- ─────────────────────────────────────────────
-- 보정 요청 핀 댓글 (좌표는 0~1 비율)
-- ─────────────────────────────────────────────
create table public.retouch_pins (
  id          uuid primary key default gen_random_uuid(),
  gallery_id  uuid not null references public.galleries (id) on delete cascade,
  photo_id    uuid not null,
  x           numeric(6, 5) not null check (x between 0 and 1),
  y           numeric(6, 5) not null check (y between 0 and 1),
  body        text not null check (length(body) between 1 and 2000),
  author      public.pin_author not null,
  resolved_at timestamptz,
  created_at  timestamptz not null default now(),
  foreign key (photo_id, gallery_id) references public.photos (id, gallery_id) on delete cascade
);

create index retouch_pins_photo_id_idx on public.retouch_pins (photo_id);
create index retouch_pins_gallery_id_idx on public.retouch_pins (gallery_id);

-- ─────────────────────────────────────────────
-- 추가 보정 결제 (작가 본인 PG로 결제)
-- ─────────────────────────────────────────────
create table public.orders (
  id             uuid primary key default gen_random_uuid(),
  gallery_id     uuid not null references public.galleries (id) on delete cascade,
  toss_order_id  text not null unique,
  extra_count    integer not null check (extra_count > 0),
  unit_price_krw integer not null check (unit_price_krw >= 0),
  amount_krw     integer not null,
  status         public.order_status not null default 'pending',
  payment_key    text,
  paid_at        timestamptz,
  raw            jsonb,
  created_at     timestamptz not null default now(),
  check (amount_krw = extra_count * unit_price_krw)
);

create index orders_gallery_id_idx on public.orders (gallery_id);

-- ─────────────────────────────────────────────
-- 보정본 (파일명 매칭 실패 시 photo_id null)
-- ─────────────────────────────────────────────
create table public.retouched_files (
  id           uuid primary key default gen_random_uuid(),
  gallery_id   uuid not null references public.galleries (id) on delete cascade,
  photo_id     uuid,
  filename     text not null,
  file_key     text not null,
  size_bytes   bigint,
  match_status public.retouch_match_status not null,
  created_at   timestamptz not null default now(),
  foreign key (photo_id, gallery_id) references public.photos (id, gallery_id) on delete set null (photo_id)
);

create index retouched_files_gallery_id_idx on public.retouched_files (gallery_id);
create index retouched_files_photo_id_idx on public.retouched_files (photo_id);

-- ─────────────────────────────────────────────
-- 알림 발송 기록
-- ─────────────────────────────────────────────
create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  gallery_id uuid not null references public.galleries (id) on delete cascade,
  type       public.notification_type not null,
  recipient  text not null,
  status     public.notification_status not null default 'queued',
  error      text,
  sent_at    timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_gallery_id_idx on public.notifications (gallery_id);

-- ─────────────────────────────────────────────
-- RLS
-- 작가: 본인 데이터만 접근 (auth.uid()).
-- 고객: 로그인 없음 → 모든 접근은 서버에서 share_token 검증 후 service role로 처리.
-- ─────────────────────────────────────────────
alter table public.photographers    enable row level security;
alter table public.payment_settings enable row level security;
alter table public.galleries        enable row level security;
alter table public.photos           enable row level security;
alter table public.selections       enable row level security;
alter table public.retouch_pins     enable row level security;
alter table public.orders           enable row level security;
alter table public.retouched_files  enable row level security;
alter table public.notifications    enable row level security;

-- 갤러리 소유 여부
create function public.owns_gallery(gid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.galleries g
    where g.id = gid and g.photographer_id = (select auth.uid())
  );
$$;

revoke execute on function public.owns_gallery(uuid) from public, anon;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create policy "작가 본인 조회" on public.photographers
  for select to authenticated using (id = (select auth.uid()));
create policy "작가 본인 수정" on public.photographers
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- payment_settings: 정책 없음 (service role 전용)

create policy "본인 갤러리" on public.galleries
  for all to authenticated
  using (photographer_id = (select auth.uid()))
  with check (photographer_id = (select auth.uid()));

create policy "본인 갤러리 사진" on public.photos
  for all to authenticated
  using (public.owns_gallery(gallery_id))
  with check (public.owns_gallery(gallery_id));

create policy "본인 갤러리 셀렉 조회" on public.selections
  for select to authenticated using (public.owns_gallery(gallery_id));

create policy "본인 갤러리 핀 조회" on public.retouch_pins
  for select to authenticated using (public.owns_gallery(gallery_id));
create policy "작가 핀 작성" on public.retouch_pins
  for insert to authenticated
  with check (public.owns_gallery(gallery_id) and author = 'photographer');
create policy "핀 해결 처리" on public.retouch_pins
  for update to authenticated
  using (public.owns_gallery(gallery_id))
  with check (public.owns_gallery(gallery_id));

create policy "본인 갤러리 결제 조회" on public.orders
  for select to authenticated using (public.owns_gallery(gallery_id));

create policy "본인 갤러리 보정본" on public.retouched_files
  for all to authenticated
  using (public.owns_gallery(gallery_id))
  with check (public.owns_gallery(gallery_id));

create policy "본인 갤러리 알림 조회" on public.notifications
  for select to authenticated using (public.owns_gallery(gallery_id));

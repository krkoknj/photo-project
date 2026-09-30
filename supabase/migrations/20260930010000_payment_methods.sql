-- 추가 보정 결제 수단: 토스 결제창 또는 계좌이체 후 작가 수동 확인

create type public.payment_method as enum ('toss', 'manual');

alter table public.orders
  add column method public.payment_method not null default 'toss';

-- 계좌이체 안내용 작가 계좌. payment_settings는 RLS 정책이 없어 서버(service role)에서만 읽는다.
alter table public.payment_settings
  add column bank_name    text,
  add column bank_account text,
  add column bank_holder  text;

-- 보정본 전달: 모바일에서 가볍게 보여줄 미리보기·썸네일(워터마크 없음)과 전달 시각

alter table public.retouched_files
  add column preview_key       text,
  add column thumb_key         text,
  add column processing_status public.photo_processing_status not null default 'pending',
  add column width             integer,
  add column height            integer;

-- 사진 한 장에 연결된 보정본은 하나. 다시 올리면 이전 파일은 휴지통(trash/)으로 옮기고 교체한다.
create unique index retouched_files_one_per_photo on public.retouched_files (photo_id) where photo_id is not null;

alter table public.galleries
  add column delivered_at timestamptz;

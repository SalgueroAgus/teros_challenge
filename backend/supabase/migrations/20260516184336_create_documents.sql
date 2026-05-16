create table documents (
    id          uuid primary key default gen_random_uuid(),
    filename    text not null,
    status      text not null default 'processing'
                    check (status in ('processing', 'done', 'error')),
    uploaded_at timestamptz not null default now()
);

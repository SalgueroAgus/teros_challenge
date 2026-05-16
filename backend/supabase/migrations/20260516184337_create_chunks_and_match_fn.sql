create table document_chunks (
    id          uuid primary key default gen_random_uuid(),
    document_id uuid not null references documents(id) on delete cascade,
    chunk_index int  not null,
    content     text not null,
    embedding   extensions.vector(1536),
    created_at  timestamptz not null default now()
);

create index on document_chunks using ivfflat (embedding extensions.vector_cosine_ops)
    with (lists = 100);

create or replace function match_chunks(
    query_embedding    extensions.vector(1536),
    match_threshold    float,
    match_count        int,
    filter_document_id uuid default null
)
returns table (
    chunk_id    uuid,
    document_id uuid,
    content     text,
    similarity  float
)
language sql stable
set search_path = extensions, public
as $$
    select
        dc.id          as chunk_id,
        dc.document_id,
        dc.content,
        1 - (dc.embedding <=> query_embedding) as similarity
    from document_chunks dc
    where
        (filter_document_id is null or dc.document_id = filter_document_id)
        and 1 - (dc.embedding <=> query_embedding) > match_threshold
    order by dc.embedding <=> query_embedding
    limit match_count;
$$;

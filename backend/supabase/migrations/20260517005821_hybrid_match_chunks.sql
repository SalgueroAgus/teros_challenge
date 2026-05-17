-- Replace match_chunks with a hybrid dense + sparse retrieval function.
--
-- Dense:  cosine similarity via pgvector (semantic meaning)
-- Sparse: BM25-style full-text ranking via PostgreSQL ts_rank_cd (exact terms)
-- Merged: Reciprocal Rank Fusion — 1/(60+dense_rank) + 1/(60+sparse_rank)
--
-- The query_text parameter drives the sparse side.
-- When filter_document_id is provided the threshold is relaxed to 0.1
-- (caller still passes the global threshold; scoping logic lives in Python).

create or replace function match_chunks(
    query_embedding    extensions.vector(1536),
    query_text         text,
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
    with dense as (
        select
            dc.id                                          as chunk_id,
            dc.document_id,
            dc.content,
            1 - (dc.embedding <=> query_embedding)        as score,
            row_number() over (
                order by dc.embedding <=> query_embedding
            )                                             as rank
        from document_chunks dc
        where
            (filter_document_id is null or dc.document_id = filter_document_id)
            and 1 - (dc.embedding <=> query_embedding) > match_threshold
    ),
    sparse as (
        select
            dc.id                                         as chunk_id,
            ts_rank_cd(
                to_tsvector('english', dc.content),
                plainto_tsquery('english', query_text)
            )                                             as score,
            row_number() over (
                order by ts_rank_cd(
                    to_tsvector('english', dc.content),
                    plainto_tsquery('english', query_text)
                ) desc
            )                                            as rank
        from document_chunks dc
        where
            filter_document_id is null or dc.document_id = filter_document_id
    ),
    rrf as (
        select
            d.chunk_id,
            d.document_id,
            d.content,
            d.score                                       as dense_score,
            coalesce(s.score, 0)                          as sparse_score,
            (1.0 / (60 + d.rank))
                + (1.0 / (60 + coalesce(s.rank, 1000)))  as rrf_score
        from dense d
        left join sparse s on d.chunk_id = s.chunk_id
    )
    select
        chunk_id,
        document_id,
        content,
        dense_score as similarity
    from rrf
    order by rrf_score desc
    limit match_count;
$$;

-- Add a GIN index on the tsvector of document_chunks.content so the
-- sparse (full-text) path in match_chunks uses an index scan instead of
-- computing to_tsvector() on every row at query time.
create index if not exists document_chunks_content_fts_idx
    on document_chunks
    using gin (to_tsvector('english', content));

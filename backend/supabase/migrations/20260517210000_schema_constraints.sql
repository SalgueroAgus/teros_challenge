-- Enforce that every chunk must have an embedding (no silent null vectors).
alter table document_chunks
    alter column embedding set not null;

-- Enforce filename uniqueness at the DB level. The application already
-- returns 409 on duplicates, but without this constraint two concurrent
-- uploads of the same filename could both pass the app-level check.
alter table documents
    add constraint documents_filename_unique unique (filename);

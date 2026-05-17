-- Replace the status check constraint to reflect the async upload flow.
--
-- Old flow: endpoint inserted 'processing', returned 'done' synchronously.
-- New flow: endpoint inserts 'pending', background task updates to 'done'/'error'.
-- 'processing' is no longer used as an initial state.

alter table documents drop constraint documents_status_check;

-- Migrate any stuck 'processing' rows left from before this change.
update documents set status = 'error' where status = 'processing';

alter table documents
    add constraint documents_status_check
    check (status in ('pending', 'done', 'error'));

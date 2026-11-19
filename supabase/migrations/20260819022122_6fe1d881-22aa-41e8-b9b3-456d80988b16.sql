-- Ensure anonymous visitors cannot read contact details or free-form/private blobs
REVOKE SELECT (phone) ON public.members FROM anon;
REVOKE SELECT (phone, note, data) ON public.elders FROM anon;
REVOKE SELECT (phone, data) ON public.leadership FROM anon;
-- Guests may still update the member directory, but not overwrite contact PII
REVOKE UPDATE (phone, address, birthdate) ON public.members FROM anon;
# Users management proof

## external-request

Build one authenticated users-management page from the observed contracts. The
page lists users, loads the available profiles, and creates one user. The proof
must remain independent from the backend implementation language.

## operator

The page is used by an authenticated back-office operator.

## create-authorization

The create affordance requires the canonical host permission `users.create`. It
is disabled when that permission is absent, and a direct submit attempt must
fail before any network request. This frontend guard reproduces the observed
legacy route/action check for `/settings-security/users` and `create`; it does
not replace authorization by the backend.

## web-proof

The web experience contains one page at `/settings-security/users`. This
increment publishes the contract-bound Angular shell and generated execution
composition only. It does not claim a completed visual page.

## users-page

On entry, request page 1 of the users list and the profile options. A successful
creation sends the five required fields, closes only in the later presentation
increment, and reloads only the users list. A failed creation keeps the current
list and must not trigger invalidation.

## scope-boundary

Visual layout, notifications, form opening and closing, keyboard behavior,
screen-reader behavior, and visual regression remain outside this increment.
They require their own approved contracts and evidence before implementation.

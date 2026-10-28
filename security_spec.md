# Security Specification (`security_spec.md`)

## 1. Data Invariants

1. **Master Gate & Ownership Invariant**:
   - Every `/user_progress/{userId}` document belongs strictly to `request.auth.uid == userId` with a verified email (`request.auth.token.email_verified == true`).
   - Every sub-document in `/user_progress/{userId}/submissions/{submissionId}` and `/user_progress/{userId}/exam_attempts/{attemptId}` requires that the parent `/user_progress/{userId}` document exists and its `userId` matches `request.auth.uid`.
2. **Strict Schema & Anti-Update-Gap**:
   - All creates and updates must pass `isValidUserProgress`, `isValidSubmissionRecord`, or `isValidExamAttempt`.
   - `createdAt` and `userId` are immutable on updates.
   - `updatedAt` and `createdAt` must equal `request.time`.
3. **Bounded Arrays & Strings**:
   - `solvedIds` is bounded to at most 500 items, and if non-empty, `solvedIds[0] is string && solvedIds[0].size() <= 128`.
   - All string fields have explicit `.size()` bounds and ID regex validation (`^[a-zA-Z0-9_\-]+$`).

## 2. The "Dirty Dozen" Payloads

1. **Identity Spoofing on UserProgress**: Authenticated user `uid_A` tries to write `userId: "uid_B"` to `/user_progress/uid_B`. -> `PERMISSION_DENIED`
2. **Unverified Email Write**: Authenticated user with `email_verified: false` tries to create `/user_progress/uid_A`. -> `PERMISSION_DENIED`
3. **Shadow Field Injection on Create**: Payload includes `isAdmin: true` on `/user_progress/uid_A`. Rejected by `hasOnly()`. -> `PERMISSION_DENIED`
4. **Shadow Field Injection on Update**: Update payload modifies `role: "admin"` on `/user_progress/uid_A`. Rejected by `affectedKeys().hasOnly()`. -> `PERMISSION_DENIED`
5. **Immutable Field Mutation**: Update payload modifies `createdAt` or `userId` on `/user_progress/uid_A`. -> `PERMISSION_DENIED`
6. **Client Timestamp Forgery**: Payload sets `createdAt` to a past timestamp instead of `request.time`. -> `PERMISSION_DENIED`
7. **ID Poisoning Attack**: Document ID contains spaces or special characters (`user$123`) or exceeds 128 chars. Rejected by `isValidId()`. -> `PERMISSION_DENIED`
8. **Denial-of-Wallet String Overflow**: `code` in `SubmissionRecord` exceeds 20,000 characters. -> `PERMISSION_DENIED`
9. **Unbounded Array Overflow**: `solvedIds` array exceeds 500 items or contains non-string first item. -> `PERMISSION_DENIED`
10. **Orphaned Subcollection Write**: User attempts to create `/user_progress/uid_A/submissions/sub_1` when `/user_progress/uid_A` does not exist. Rejected by Master Gate `get()`. -> `PERMISSION_DENIED`
11. **Unauthorized List Scraping**: User `uid_B` attempts to `list` `/user_progress/uid_A/submissions`. Rejected by `isOwner(userId)` and `resource.data.userId == request.auth.uid`. -> `PERMISSION_DENIED`
12. **Value Poisoning on Update**: User updates `xp` with a string `"999999"` instead of a valid non-negative number. Rejected by `isValidUserProgress(incoming())`. -> `PERMISSION_DENIED`

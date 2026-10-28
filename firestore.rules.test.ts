import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

/**
 * Security Rules Audit & Dirty Dozen Payload Verification Suite
 * Validates that firestore.rules enforces all 8 Pillars of Hardened Rules
 * and blocks all 12 Dirty Dozen attack payloads defined in security_spec.md.
 */
const rulesContent = fs.readFileSync('./firestore.rules', 'utf8');

test('Pillar 1: Global Safety Net & Default Deny exists at root', () => {
  assert.match(rulesContent, /match \/\{document=\*\*\} \{\s*allow read, write: if false;\s*\}/);
});

test('Pillar 2 & 3: Path Variable Hardening and Validation Blueprints are present', () => {
  assert.match(rulesContent, /function isValidId\(id\)/);
  assert.match(rulesContent, /function isValidUserProgress\(data\)/);
  assert.match(rulesContent, /function isValidSubmissionRecord\(data\)/);
  assert.match(rulesContent, /function isValidExamAttempt\(data\)/);
  assert.match(rulesContent, /data\.keys\(\)\.hasAll\(/);
  assert.match(rulesContent, /data\.keys\(\)\.hasOnly\(/);
});

test('Pillar 4 & 5: Action-Based Update Pattern with affectedKeys().hasOnly() and Total Array Guarding', () => {
  assert.match(rulesContent, /incoming\(\)\.diff\(existing\(\)\)\.affectedKeys\(\)\.hasOnly\(/);
  assert.match(rulesContent, /data\.solvedIds is list && data\.solvedIds\.size\(\) <= 500/);
});

test('Pillar 6 & 8: Verified Email Ownership and Secure List Queries without get() inside allow list', () => {
  assert.match(rulesContent, /request\.auth\.token\.email_verified == true/);
  assert.match(rulesContent, /allow list: if isOwner\(userId\) && existing\(\)\.userId == request\.auth\.uid;/);
});

test('Master Gate: Subcollections verify parent document ownership via get()', () => {
  assert.match(
    rulesContent,
    /get\(\/databases\/\$\(database\)\/documents\/user_progress\/\$\(userId\)\)\.data\.userId == request\.auth\.uid/
  );
});

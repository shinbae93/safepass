# Vault Feature — Product Requirements

## Overview

The vault is the core feature of SafePass. Once logged in, a user can store, view, edit, and delete secret entries (passwords, keys, tokens, etc.). Each entry has a title, a secret value, and optional notes. The vault is protected by the JWT issued at login — no entry data is accessible without a valid session.

---

## User Stories

### Viewing the vault

- As a logged-in user, I can see a list of all my vault entries so that I have an overview of what I have stored.
- As a logged-in user, I can search entries by title so that I can find what I need quickly.
- As a logged-in user, secret values are hidden by default (shown as `••••••••`) so that my passwords are not exposed on screen.
- As a logged-in user, I can reveal the value of any entry with a toggle so that I can read it when I need to.
- As a logged-in user, I can copy the value of any entry to the clipboard with one click so that I can use it without revealing it on screen.

### Adding entries

- As a logged-in user, I can add a new entry with a title, a secret value, and optional notes so that I can grow my vault over time.
- As a logged-in user, I can toggle visibility of the value while typing it in the add form so that I can check for typos.
- After successfully adding an entry, it appears in my vault list immediately.

### Viewing entry details

- As a logged-in user, I can click an entry to open a detail view showing all its fields so that I can see everything stored for that entry.
- The value in the detail view is hidden by default with a show/hide toggle.
- I can copy the value directly from the detail view.
- I can see when the entry was created.

### Editing entries

- As a logged-in user, I can edit the title, value, and notes of any entry so that I can keep my vault up to date.
- The edit form is pre-populated with the current values so that I only need to change what has moved.
- I can toggle visibility of the value field while editing.
- After saving, the updated entry is reflected in the list immediately.
- I can cancel an edit and return to the detail view without saving any changes.

### Deleting entries

- As a logged-in user, I can delete any entry so that I can remove credentials I no longer need.
- Deletion is immediate — there is no multi-step confirmation dialog.
- After deletion, the entry disappears from the list immediately.

### Session & lock

- As a logged-in user, I can lock my vault at any time, which ends my session and returns me to the login screen.
- After locking, no vault data remains in memory.

---

## Acceptance Criteria

### Vault list

| # | Criterion |
|---|-----------|
| V1 | All entries for the authenticated user are loaded and displayed on the vault screen. |
| V2 | Each row shows the entry title and a masked value (`••••••••`). |
| V3 | The search bar filters the visible list by title in real time (client-side). |
| V4 | A reveal icon/button per row toggles the value between masked and plaintext. |
| V5 | A copy button per row copies the plaintext value to the clipboard. |
| V6 | Clicking an entry row opens the detail panel for that entry. |
| V7 | When the vault is empty (or no search results match), an empty state message is shown. |

### Add entry

| # | Criterion |
|---|-----------|
| A1 | An "Add New Item" button opens a modal form with title, value, and notes fields. |
| A2 | Title and value are required; the form cannot be submitted without them. |
| A3 | The value field has a show/hide toggle. |
| A4 | On success, the modal closes and the new entry appears in the list without a full reload. |
| A5 | On failure, an inline error is shown and the modal stays open. |

### Detail view

| # | Criterion |
|---|-----------|
| D1 | Opening the detail panel shows the title, masked value, notes (if any), and creation date. |
| D2 | A show/hide toggle reveals the value. |
| D3 | A copy button copies the value to the clipboard. |
| D4 | An "Edit" button opens the edit form pre-populated with the entry's current data. |
| D5 | A "Delete" button removes the entry and closes the panel. |
| D6 | The panel can be closed/dismissed to return to the list. |

### Edit entry

| # | Criterion |
|---|-----------|
| E1 | The edit form is pre-filled with the current title, value, and notes. |
| E2 | The value field has a show/hide toggle. |
| E3 | On save, the entry is updated and the detail panel closes; the updated title is visible in the list. |
| E4 | On failure, an inline error is shown and the form stays open. |
| E5 | Cancelling returns to the detail view with no changes persisted. |

### Delete entry

| # | Criterion |
|---|-----------|
| X1 | Deleting an entry removes it from the list immediately. |
| X2 | The detail panel closes after deletion. |
| X3 | Deleting an entry that no longer exists on the server does not crash the app. |

### Authorization

| # | Criterion |
|---|-----------|
| Z1 | All vault API calls include the JWT in the `Authorization: Bearer` header. |
| Z2 | If the JWT is missing or expired, the API returns 401 and the app routes to the login screen. |
| Z3 | A user can only read and modify their own entries; requests for another user's entries return 404. |

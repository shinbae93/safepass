# Auth Feature — Product Requirements

## Overview

SafePass supports multiple users on a shared desktop installation. Each user has their own encrypted vault protected by their own master password. Authentication consists of two flows: registering a new account and logging into an existing one.

---

## User Stories

### Register

- As a new user, I can create an account with a unique username and a master password so that my vault is tied to my identity.
- As a new user, I must confirm my master password during registration so that I don't lock myself out with a typo.
- As a new user, I am shown a clear error if my chosen username is already taken so that I can pick a different one.
- As a new user, I am shown a clear error if my two password entries do not match.
- As a new user, my master password must be at least 8 characters; I am shown an error if it is too short.
- After successful registration, I am taken directly into my vault without needing to log in again.

### Login

- As a returning user, I can see a list of usernames that have previously logged in on this device so that I can select mine quickly.
- As a returning user, I select my username from the list and enter my master password to unlock my vault.
- As a user not in the list, I can choose "Use a different account" to type a username manually.
- As a returning user, if I enter the wrong master password, I am shown an error and can try again.
- After successful login, I am taken into my vault.
- After a successful login with a new username (via "Use a different account"), that username is added to the remembered list for future logins.

### Lock & Switch

- As a logged-in user, I can lock my vault at any time, which returns me to the login screen.
- After locking, my decryption key is removed from memory immediately.

---

## Acceptance Criteria

### Register screen

| # | Criterion |
|---|-----------|
| R1 | Username field and master password field are required; the form cannot be submitted empty. |
| R2 | A confirm password field must match the master password field exactly before submission is allowed. |
| R3 | Password must be at least 8 characters; shorter passwords show an inline error. |
| R4 | If the username is already taken, an error message is shown and the user stays on the register screen. |
| R5 | On success, the user lands on the vault screen without an extra login step. |
| R6 | The register screen is only reachable when the user is not already logged in. |

### Login screen

| # | Criterion |
|---|-----------|
| L1 | Previously logged-in usernames are shown as selectable options. |
| L2 | A "Use a different account" option allows manual username entry. |
| L3 | A master password field is required. |
| L4 | Wrong credentials show an error; the user can retry without reloading. |
| L5 | On success, the user lands on the vault screen. |
| L6 | A successfully authenticated new username (via manual entry) is added to the remembered list. |
| L7 | The login screen is shown when the app has at least one registered user and the current session is locked. |

### Navigation guard

| # | Criterion |
|---|-----------|
| N1 | If no users are registered, the app always routes to the register screen. |
| N2 | If users exist but no session is active, the app routes to the login screen. |
| N3 | If a session is active (key in memory + valid JWT), the app routes to the vault screen. |
| N4 | Navigating directly to `/vault` without a session redirects to login. |

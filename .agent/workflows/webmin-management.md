---
description: Managing Webmin Users via Admin Panel
---

# Managing Webmin Users

The application now stores Webmin users in the database (`webmin_users` table) instead of a hardcoded file. This allows authorized administrators to manage users directly from the Admin Dashboard.

## 1. Accessing the Management Interface

1.  Log in as an **Admin** or **Super User**.
2.  Navigate to the **Admin Dashboard** (`/admin`).
3.  Click on the **🔌 Webmin Users** tab.

## 2. Adding a New Webmin User

1.  Click the **➕ Tambah Webmin User** button.
2.  Fill in the form:
    *   **Webmin ID**: The numeric ID from the external Webmin system (e.g., `123`).
    *   **Username (Login)**: The login username used in Webmin (e.g., `windydwi`). **This must match exactly.**
    *   **Nama Lengkap**: The full display name for reports and the leaderboard (e.g., `Windy Dwi`).
3.  Click **💾 Simpan**.

## 3. Editing a Webmin User

1.  Find the user in the list.
2.  Click the **✏️ (Edit)** button.
3.  Update the information as needed.
4.  Click **💾 Simpan**.

## 4. Deleting a Webmin User

1.  Find the user in the list.
2.  Click the **🗑️ (Hapus)** button.
3.  Confirm the deletion.

**Note:** Deleting a user will not affect historical orders, but that user will no longer be recognized for new orders or verifications.

## Technical Details

-   **Table**: `webmin_users`
-   **API Endpoints**:
    -   `GET /api/admin/webmin-users`: List all users
    -   `POST /api/admin/webmin-users`: Create a user
    -   `PUT /api/admin/webmin-users/[id]`: Update a user
    -   `DELETE /api/admin/webmin-users/[id]`: Delete a user

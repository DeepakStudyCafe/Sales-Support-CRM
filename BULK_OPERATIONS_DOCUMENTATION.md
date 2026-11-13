# Enterprise CRM – Bulk Operations Documentation

## Overview

The Bulk Operations system in the Enterprise Sales & Customer Support CRM empowers sales representatives, support engineers, and system administrators to manage large volumes of records simultaneously with high efficiency and data integrity.

---

## 1. User Interface & Cross-Page Selection

### Selection Controls
- **Single Record Selection:** Click the checkbox on any row to select or deselect that individual record.
- **Select Page Records:** Click the master checkbox in the table header to select all records visible on the current pagination page (e.g., 10, 25, or 50 records).
- **Cross-Page Selection:** When all records on the active page are selected, a notification banner appears:
  > *"All 10 records on this page are selected. Select all 150 records matching current filter"*
  Clicking the banner expands selection to the entire query result set across all pages.

### Floating Bulk Action Toolbar (`BulkActionToolbar`)
When one or more records are selected, a floating toolbar appears at the bottom center of the viewport:
- **Selected Counter:** Displays the exact number of active selections.
- **Select-All Toggle:** Quick toggle to expand or clear full filter selection.
- **Module-Specific Actions:** Action buttons styled according to severity (indigo for standard, rose for destructive).
- **Clear Selection:** Instant cancel button (X icon) to dismiss selection.

---

## 2. Module-Specific Bulk Actions

### A. Leads (`/leads`)
| Action | Description | Behavior & Validation |
| :--- | :--- | :--- |
| **Assign Agent** | Reassigns selected leads to a specific sales representative | Opens modal with active sales agents dropdown. Updates `assigned_to` and `updated_at`. |
| **Change Status** | Updates the pipeline stage for all selected leads | Options: `New`, `Contacted`, `Interested`, `Qualified`, `Lost`. Synchronizes `status` and `pipeline_stage`. |
| **Change Priority** | Changes lead priority rating | Options: `Low`, `Medium`, `High`. |
| **Delete Selected** | Soft deletes or removes selected leads | Requires confirmation in an alert dialog to prevent accidental data loss. |
| **Export Selected** | Generates an Excel workbook containing only selected leads | Downloads `.xlsx` file formatted with agent and source details. |

### B. Support Tickets (`/tickets`)
| Action | Description | Behavior & Validation |
| :--- | :--- | :--- |
| **Assign Agent** | Reassigns selected tickets to a support engineer | Opens modal with support team members. Updates `assigned_to` and `team_id`. |
| **Update Status** | Changes ticket status across selected items | Options: `Open`, `In Progress`, `Waiting for Customer`, `Resolved`, `Closed`. Updates `resolved_at` or `closed_at` timestamps accordingly. |
| **Escalate to Critical** | Elevates priority to `Critical` SLA | Instantly bumps priority, triggers SLA monitoring countdown, and logs escalation activity. |
| **Export Selected** | Generates an Excel report of selected tickets | Includes ticket number, category, SLA deadline, customer, and assigned agent. |

### C. Tasks & Follow-ups (`/follow-ups`)
| Action | Description | Behavior & Validation |
| :--- | :--- | :--- |
| **Mark Completed** | Marks all selected tasks as finished | Sets `status = 'Completed'`, records `completed_at = GETUTCDATE()`, and logs `completed_by`. |
| **Assign Agent** | Reassigns tasks to another team member | Updates `assigned_to` in a single transaction. |
| **Reschedule** | Postpones or updates scheduled due time | Updates `scheduled_at` for selected tasks. |
| **Delete Selected** | Deletes selected task reminders | Requires confirmation dialog. |

### D. User Management (`/users`)
| Action | Description | Behavior & Validation |
| :--- | :--- | :--- |
| **Activate Users** | Re-activates inactive user accounts | Sets `is_active = 1`. Enables login access. |
| **Deactivate Users** | Suspends active user accounts | Sets `is_active = 0`. Prevents login access and terminates active sessions. Super Admin accounts are protected from bulk deactivation. |

---

## 3. Backend API Specifications

### `POST /api/v1/bulk/action`
Executes batch operations on multiple record IDs within a single transactional request.

**Request Body:**
```json
{
  "module": "leads",
  "action": "assign",
  "ids": [
    "D8469C7F-11B3-47FD-A62E-09CD2EE6EF3A",
    "B42E1F8C-23C1-4D9A-8BE5-5C0A4B1D91E2"
  ],
  "payload": {
    "assignedTo": "B9B79DAE-C484-478A-9B22-330FF7B42CE0"
  }
}
```

**Response (Success - 200 OK):**
```json
{
  "success": true,
  "message": "Successfully updated 2 records.",
  "data": {
    "affectedCount": 2
  }
}
```

**Audit Trail Logging:**
Every bulk action automatically writes an entry to the `audit_logs` table:
- `action`: e.g. `leads.bulk_assign`
- `entity_type`: e.g. `leads`
- `new_values`: JSON payload with affected row count and update parameters
- `user_id`: ID of the executing user
- `ip_address`: Client IP address
- `created_at`: UTC timestamp


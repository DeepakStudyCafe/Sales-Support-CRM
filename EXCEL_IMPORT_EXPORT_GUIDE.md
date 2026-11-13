# Enterprise CRM – Excel Import & Export (.xlsx) Guide

## Overview

The Enterprise Sales & Customer Support CRM includes end-to-end support for Microsoft Excel (`.xlsx`) import and export across all core business modules using SheetJS (`xlsx`).

---

## 1. Excel Import Workflow

The CRM provides a 3-step import wizard accessible via the **"Import Excel"** button on the Dashboard, Leads Hub, Support Tickets Hub, and Customers module.

### Step 1: Template Download & File Upload
- Download the standardized `.xlsx` template pre-configured with the exact columns and validation guidelines.
- Drag and drop your `.xlsx` file or browse your device (supports files up to 10MB).

### Step 2: Instant Client-Side Parsing & Validation Preview
The system parses the Excel file directly in your browser and validates each row before submitting to the database:
- **Green Rows (Valid):** Highlighted with a green checkmark badge indicating the row passed all validation checks and is ready to import.
- **Red Rows (Errors):** Highlighted with a red alert badge showing exactly which field failed and why (e.g., missing required name, invalid email format, phone too short).
- **Filter Tabs:** Toggle between *All*, *Valid Only*, or *Errors Only*.
- **Download Error Rows:** One-click download of only the failed rows into a separate `.xlsx` file so you can fix errors and re-upload.

### Step 3: Transactional Server Insertion & Audit Reporting
- Clicking **"Import Valid Records"** sends the clean data to `POST /api/v1/bulk/import/:module`.
- Database inserts are executed in transactional batches.
- An audit entry is automatically created in `audit_logs` tracking total rows, imported count, and failed count.
- Results modal displays final metrics with an option to download a comprehensive error report.

---

## 2. Supported Module Schemas

### A. Leads (`/leads`)
**Download Endpoint:** `GET /api/v1/bulk/template/leads`  
**Import Endpoint:** `POST /api/v1/bulk/import/leads`

| Column Header | Required | Format / Options | Example |
| :--- | :--- | :--- | :--- |
| `First Name` | **Yes** | String (max 100) | `Amit` |
| `Last Name` | No | String (max 100) | `Sharma` |
| `Email` | No | Valid Email format | `amit.sharma@example.in` |
| `Phone` | **Yes** | Min 8 digits, optional country code | `+919876543210` |
| `Company` | No | String (max 200) | `Apex Infotech Ltd` |
| `Source` | No | Website, Referral, LinkedIn, Google Ads | `Website` |
| `Status` | No | New, Contacted, Interested, Qualified, Converted, Lost | `New` |
| `Priority` | No | Low, Medium, High | `High` |
| `City` | No | String | `Mumbai` |
| `State` | No | String | `Maharashtra` |
| `Notes` | No | Free text | `Interested in 50 agent licenses` |

### B. Customers (`/customers`)
**Download Endpoint:** `GET /api/v1/bulk/template/customers`  
**Import Endpoint:** `POST /api/v1/bulk/import/customers`

| Column Header | Required | Format / Options | Example |
| :--- | :--- | :--- | :--- |
| `First Name` | **Yes** | String (max 100) | `Rajesh` |
| `Last Name` | No | String (max 100) | `Patel` |
| `Email` | **Yes** | Unique email | `rajesh@patelenterprises.com` |
| `Phone` | **Yes** | Phone number | `+919822334455` |
| `Company` | No | Enterprise account name | `Patel Enterprises Ltd` |
| `Address` | No | Street address | `101 Ring Road` |
| `City` | No | City | `Ahmedabad` |
| `State` | No | State | `Gujarat` |
| `Pincode` | No | Postal code | `380015` |
| `Notes` | No | Account details | `Tier-1 client` |

### C. Support Tickets (`/tickets`)
**Download Endpoint:** `GET /api/v1/bulk/template/tickets`  
**Import Endpoint:** `POST /api/v1/bulk/import/tickets`

| Column Header | Required | Format / Options | Example |
| :--- | :--- | :--- | :--- |
| `Title` | **Yes** | String (max 200) | `IVR Trunk Latency Spike` |
| `Description` | No | Issue details | `Calls dropping on trunk line` |
| `Category` | No | Technical Issue, Billing, Feature Request, Account & Access | `Technical Issue` |
| `Priority` | No | Low, Medium, High, Critical | `High` |
| `Status` | No | Open, In Progress, Waiting for Customer, Resolved, Closed | `Open` |
| `Customer Email` | No | Email of existing customer | `procurement@reliance.com` |

---

## 3. Excel Export Workflow

- **Export Selected:** In any module table, select one or more rows using checkboxes. The **"Export Excel"** button updates to indicate `(N)` selected records and generates a spreadsheet with only those items.
- **Export Filtered View:** If no rows are individually checked, clicking **"Export Excel"** exports all records matching the current search, stage, or priority filter.
- **Supported Export Formats:** Standard `.xlsx` (OpenXML spreadsheet format) readable by Microsoft Excel, Google Sheets, LibreOffice, and Apple Numbers.


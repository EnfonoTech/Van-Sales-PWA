# Fateh PWA — ERPNext Setup & Permissions

What to configure **in ERPNext** so PWA users can log in and see the right data (e.g. assigned customers).

---

## 1. User → Employee → Sales Person (required for customer list)

The PWA shows **only customers assigned to the logged-in user**. Set this chain:

1. **User** – Person logs in with a Frappe/ERPNext User (e.g. `sales@company.com`).
2. **Employee** – In **HR → Employee**, set **User ID** = that user.
3. **Sales Person** – In **Selling → Sales Person**, set **Employee** = that employee.

**Chain:** User → Employee (User ID) → Sales Person (Employee).

Without Employee or Sales Person, the user only sees customers they **own** or that are **assigned via ToDo**. For normal “assigned customers”, the full chain is required.

---

## 2. When does a user see a customer?

A customer appears if **any** of these is true:

| Condition | Where to set |
|-----------|---------------|
| **Sales Team** | On **Customer**, **Sales Team** table: add row with **Sales Person** = user’s Sales Person. |
| **Owner** | Customer **Owner** = logged-in user. |
| **ToDo** | ToDo: Reference Type = Customer, Reference Name = customer, Allocated To = user, status ≠ Cancelled. |

**Recommended:** Assign customers via Customer **Sales Team** and ensure each PWA user has User → Employee → Sales Person.

---

## 3. Permissions

- User must be a normal **User** in ERPNext (not Guest), able to log in.
- No special role (e.g. “PWA User”) is required.
- Customer list = only assigned customers (Sales Team / Owner / ToDo).
- Sales Invoices = only those the user created or that are assigned to them via ToDo.

---

## 4. Warehouse (if you use stock)

For Sales Invoices that update stock, the user needs a **Warehouse**:

- **Setup → User Permission:** Allow = Warehouse, For User = PWA user, set the warehouse(s).
- Or ensure the **Company** has a default warehouse.

---

## 5. Custom fields to add

**Rule:** **Required** = if this field does not exist, the PWA or API will throw an error. **Optional** = no error if the field is missing (that feature is skipped or handled safely).

### Customer

The **customer list** API always requests these three fields. If any is missing on the Customer doctype, the list will error.

| Field | Type | Required? |
|-------|------|-----------|
| `custom_customer_name_arabic` | Data | **Required** – customer list API uses it. |
| `custom_vat_registration_number` | Data | **Required** – customer list API uses it. |
| `custom_cr_number` | Data | **Required** – customer list API uses it. |
| `custom_customer_name_english` | Data | Optional – used in invoice search (wrapped in try/except; no error if missing). |

### Address (only if you create addresses from PWA)

If you call the “create address” API, these are validated and set. Missing field = error.

| Field | Type | Required? |
|-------|------|-----------|
| `custom_building_number` | Data | **Required** – API validates and sets it. |
| `custom_area` | Data | **Required** – API validates and sets it. |

### Quotation

If the user enters **PR Ref** and saves, the backend sets `custom_pr_ref`. If the field does not exist, save will error.

| Field | Type | Required? |
|-------|------|-----------|
| `custom_pr_ref` | Data | **Required** if you use PR Ref in PWA. Optional if you never use PR Ref. |

### Sales Return

If the PWA sends a return reason, the backend sets `custom_return_reason`. If the field does not exist, save will error.

| Field | Type | Required? |
|-------|------|-----------|
| `custom_return_reason` | Data | **Required** if you use/send return reason. Optional if you never use it. |

**Summary:** Customer: add the three required fields or customer list will error. Address: add both if you create addresses from PWA. Quotation PR Ref and Sales Return reason: required only if you use those features.

---

## 6. Other setup

- **Company, Item, Customer Group, Territory** – Standard ERPNext; set as needed.
- **Mode of Payment** – Standard doctype; ensure modes like Cash, Bank exist (used in Sales Invoice payments table).
- **Lead** – For Quotation to Lead; no extra custom fields.
- **Print formats / Letterhead** – Must exist if PWA uses them (e.g. Sales Invoice print, letterhead).

---

## 7. Checklist

- [ ] User exists and can log in.
- [ ] Employee has **User ID** = that user.
- [ ] Sales Person has **Employee** = that employee.
- [ ] Customers have that **Sales Person** in **Sales Team** (or user is Owner / ToDo assigned).
- [ ] If using stock: User Permission (Warehouse) or company default warehouse.
- [ ] **Customer** custom fields: `custom_customer_name_arabic`, `custom_vat_registration_number`, `custom_cr_number` (required for customer list).
- [ ] If creating addresses from PWA: Address `custom_building_number`, `custom_area`.
- [ ] If using PR Ref on Quotation: Quotation `custom_pr_ref`.
- [ ] If using return reason on Returns: Sales Return `custom_return_reason`.

---

## 8. Troubleshooting

| Problem | Check |
|--------|--------|
| User sees **no customers** | User → Employee → Sales Person; Customer **Sales Team** has that Sales Person; or user is Owner / ToDo assigned. |
| **Warehouse is required** | User Permission (Warehouse) or company default warehouse. |
| **Arabic name / PR Ref not saving** | Add Customer `custom_customer_name_arabic` or Quotation `custom_pr_ref`. |
| **Address create fails** | Add Address `custom_building_number`, `custom_area`. |

---

For how to use and test the PWA, see [USER_GUIDE_AND_TESTING.md](USER_GUIDE_AND_TESTING.md).

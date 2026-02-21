# Fateh PWA — User Guide & How to Test

This document describes the PWA from an **end-user perspective** and gives step-by-step **testing instructions** for each area. Use it to learn the app or to verify behaviour when testing.

---

## 1. Opening the app

- **URL:** Open your site and go to **`/pwa`** (e.g. `https://yoursite.com/pwa`).
- You may be redirected to **`/pwa/login`** if you are not logged in.
- **Install (optional):** If prompted, you can “Install” the app so it opens like a native app from your home screen.

---

## 2. Login

1. Open `/pwa` or `/pwa/login`.
2. Enter your **username** and **password** (same as your Frappe/ERPNext account).
3. Tap **Login**.
4. You should land on the **Dashboard**.

**If login fails:** Check username/password and that your user has access to the site. Clear browser cache/cookies and try again.

---

## 3. Navigation

- **Bottom bar (main):** Dashboard | Sales | Sales Order | Quotation  
- **Top menu (☰):** Customers | Returns | Payments (﷼) | Stock | Leads  

Use the bottom bar for daily work (dashboard, new sales, orders, quotations). Use the menu for customers, returns, payments, stock, and leads.

---

## 4. Dashboard

**What it does:** Shows a quick overview (e.g. today’s sales, collections, customer count).

**How to test:**

1. After login, confirm you see the Dashboard.
2. Check that numbers/cards load (sales, payments, customers).
3. If you see “Loading…”, wait a few seconds; if it stays, check network and try again.
4. Use the bottom bar to go to **Sales** or **Quotation**, then back to **Dashboard** and confirm data still looks correct.

---

## 5. Customers

**What it does:** List customers, search, create new customer, view customer detail (and optionally statement).

**How to test:**

1. Open **Customers** from the menu.
2. **List:** Confirm the customer list loads. Use the search box to filter by name.
3. **Create customer:**
   - Tap **New Customer**.
   - Fill in required fields (e.g. Customer Name, and any mandatory custom fields like Arabic name if shown).
   - Tap **Save**.
   - Confirm success and that the new customer appears in the list or in search.
4. **View customer:**
   - Tap a customer from the list.
   - Confirm detail screen shows correct info (name, balance, addresses if any).
5. **Edit (if available):** Open a customer and use Edit; change a field, save, and confirm the change on the detail screen and list.

---

## 6. Sales (Invoices)

**What it does:** Create and submit sales invoices: select customer, add items, set prices/quantities, submit, print.

**How to test:**

1. Open **Sales** from the bottom bar.
2. **List:** Confirm recent invoices load. Search by customer or invoice number if the screen has search.
3. **Create invoice:**
   - Tap **New Invoice** (or similar).
   - Select a **Customer** (search if needed).
   - Optionally set **Delivery Date** and **PO No** if shown.
   - Add **Items:** search by item code or name, pick from list, set quantity and price (and UOM if shown).
   - Check **Subtotal, Tax, Discount, Total** at the bottom.
   - Tap **Save** or **Submit** (depending on flow).
4. **After save:** You should see the invoice detail (or success and then detail). Confirm **Submit** works if the invoice was saved as Draft.
5. **Print:** On the invoice detail screen, use **Print** and confirm the PDF opens (or downloads) with the correct letterhead if configured.

---

## 7. Sales Order

**What it does:** Create and manage sales orders (customer, delivery date, PO No, items).

**How to test:**

1. Open **Sales Order** from the bottom bar.
2. **List:** Confirm the list of sales orders loads.
3. **Create order:**
   - Tap **New Sales Order**.
   - Select **Customer**. Enter **Delivery Date** and **PO No** if shown.
   - Add **Items** (search, select, set qty/rate/UOM).
   - Save.
4. **Detail:** Open a saved order and confirm customer, PO No, delivery date, and items are shown.
5. **Submit (if allowed):** Open a draft order and submit; confirm status changes to Submitted.
6. **Convert to Invoice (if available):** From a submitted order, use “Create Invoice” (or similar) and confirm an invoice is created and opens.

---

## 8. Quotation

**What it does:** Create and edit quotations for Customer or Lead; add PR Ref; submit, cancel, amend; convert to Sales Order.

**How to test:**

1. Open **Quotation** from the bottom bar.
2. **List:** Confirm the quotation list loads.
3. **Create quotation:**
   - Tap **New Quotation**.
   - Choose **Quotation To:** Customer or Lead.
   - Select **Customer** or **Lead** (search if needed).
   - Enter **PR Ref** if you use it (optional).
   - Add **Items** (search, select, set qty/rate).
   - Tap **Save Quotation**.
4. **Detail:** Open the saved quotation. Confirm party, PR Ref, items, totals, and **Valid Till** (if shown).
5. **Submit:** For a draft quotation, use **Submit** and confirm status becomes Submitted.
6. **Cancel:** For a submitted quotation, use **Cancel** and confirm status becomes Cancelled.
7. **Amend:** For a cancelled quotation, use **Amend** and confirm a new draft is created (and optionally that PR Ref is carried over).
8. **Convert to Sales Order:** From a submitted quotation, use **Create Sales Order** and confirm a sales order is created and opens.

---

## 9. Returns

**What it does:** Create sales returns against an existing invoice.

**How to test:**

1. Open **Returns** from the menu.
2. **List:** Confirm the list of returns loads (if any).
3. **Create return:**
   - Tap **New Return** (or similar).
   - Select **Customer**.
   - Select **Original Invoice** from the list (only unreturned/submitted invoices should appear).
   - Add or adjust **Items** and quantities to return.
   - Save (and submit if the flow has two steps).
4. **Detail:** Open a return and confirm it shows the correct invoice, customer, and items.
5. **Print:** Use Print on the return detail and confirm the PDF is correct.

---

## 10. Payments

**What it does:** Record customer payments and view payment list.

**How to test:**

1. Open **Payments** from the menu.
2. **List:** Confirm the payment list loads (date, customer, amount, method).
3. **Create payment:**
   - Tap **New Payment** (or similar).
   - Select **Customer**.
   - Enter **Amount** and **Mode of Payment** (e.g. Cash, Bank).
   - Optionally link to an **Invoice** if the form has it.
   - Save.
4. Confirm the new payment appears in the list and that amounts/methods are correct.
5. Open a payment from the list and confirm the detail view shows the same data.

---

## 11. Stock

**What it does:** View item stock (e.g. item code, name, quantity on hand).

**How to test:**

1. Open **Stock** from the menu.
2. Confirm the list of items (with stock) loads.
3. Use **search** (if available) and confirm results filter correctly.
4. Open an item (if detail exists) and confirm quantity and any other details match expectations.

---

## 12. Leads

**What it does:** List leads and optionally create a new lead (e.g. when creating a quotation to Lead).

**How to test:**

1. Open **Leads** from the menu.
2. Confirm the lead list loads.
3. If **New Lead** exists: create a lead with name, company, contact; save and confirm it appears in the list.
4. When creating a **Quotation** to “Lead”, confirm you can select this lead and save the quotation.

---

## 13. Common user flows (end-to-end)

- **New customer → Invoice:** Customers → New Customer → save → Sales → New Invoice → select that customer → add items → save/submit → print.
- **Quotation → Sales Order:** Quotation → New Quotation → select customer/lead, PR Ref, items → Save → Submit → Create Sales Order → confirm order opens.
- **Invoice → Return:** Sales → open invoice (or note number) → Returns → New Return → same customer → select that invoice → add return items → save/submit.
- **Invoice → Payment:** Sales → note customer → Payments → New Payment → select customer → amount and mode → save; confirm list and customer balance (if shown) update.

---

## 14. What to check when testing (summary)

| Area        | Check |
|------------|--------|
| Login      | Correct user can log in; wrong password fails; after login, dashboard loads. |
| Dashboard  | Cards/numbers load; no permanent “Loading”. |
| Customers  | List, search, create, view detail, edit (if available). |
| Sales      | List, create invoice (customer, items, totals), submit, print. |
| Sales Order| List, create (customer, PO No, delivery date, items), submit, convert to invoice if available. |
| Quotation  | List, create (customer/lead, PR Ref, items), submit, cancel, amend, convert to sales order. |
| Returns    | List, create return (customer, select invoice, items), submit, print. |
| Payments   | List, create payment (customer, amount, mode), see new payment in list. |
| Stock      | List loads, search works. |
| Leads      | List loads, create lead (if available), use in quotation. |
| Navigation | Bottom bar and menu open the correct screens; back/list links work. |
| Offline    | If supported, confirm clear message when offline and that actions retry or queue as designed. |

---

## 15. Troubleshooting (user perspective)

- **Blank screen:** Refresh the page; clear cache; try another browser. Ensure you are on `/pwa` and logged in.
- **“Loading” never ends:** Check internet; try again; if it persists, report with screen and steps.
- **Login fails:** Verify username/password; ensure user has access to the site.
- **Create/Save fails:** Read the error message; check required fields (customer, at least one item, valid amounts); try again.
- **Print doesn’t open:** Check pop-up blocker; allow the site to open new windows; try “Download” if available.
- **Data missing after action:** Pull to refresh (if available) or go back to list and re-enter the section; check if the record appears in ERPNext backend.

---

This guide reflects the app from a **user perspective** and is intended for training, support, and manual testing. For developers: backend API and build instructions are in the main [README](../README.md).

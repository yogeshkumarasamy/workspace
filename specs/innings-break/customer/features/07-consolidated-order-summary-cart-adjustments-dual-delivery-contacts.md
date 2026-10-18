> ← Back to [PRD: Innings Break Customer App (Team Manager App) — Index](file:///specs/innings-break/customer/prd.md)

# 3.7 Consolidated Order Summary, Cart Adjustments & Dual Delivery Contacts

* **US-10**: As a Team Manager, upon completing my menu selections, I want to navigate to a Consolidated Order Summary (Cart) page to review all selected items, manually adjust quantities, seamlessly return to the menu to add more items, configure a Secondary On-Field Teammate contact for courier handoff, and view an automated Soft Credit deduction breakdown before payment.
  * **Requirement (View Cart Navigation & Consolidated Order Summary Page)**:
    - On the Menu screen, a prominent floating/bottom bar displays: **"View Cart ([X] Items • ₹[Subtotal]) ➔"**.
    - Clicking takes the Team Manager to the **Consolidated Order Summary** page.
    - Displays:
      - **Match Logistics Header**: Target Match Date, Daytime Slot (`6:30 AM` / `10:30 AM` / `2:30 PM`), Ground Venue, Pitch Name, and Kitchen Hub serving the order.
      - **Itemized Squad Order List**: Item thumbnail, Item Name, Category, Dietary Badge (`Veg`/`Non-Veg`/`Egg`), Assigned Player Names (e.g., *Assigned: Dinesh, Rahul, Karthik*), Unit Price (₹), and Line Subtotal (₹).
  * **Requirement (In-Cart Item Adjustments & Seamless Back-Navigation)**:
    - **In-Cart Quantity Adjustments**: Each line item includes `+` / `-` controls to increase, reduce quantity, or delete the item directly from the summary.
    - **Back-to-Menu Navigation**: Prominent **"← Add More Items / Back to Menu"** button returns the manager to the sports nutrition catalog with all existing cart selections, quantities, and player assignments completely preserved.
  * **Requirement (Dual Delivery Contacts Capture for On-Field Handoff)**:
    - To guarantee reliable delivery handoff without disrupting live cricket matches, the order summary captures two verified contacts:
      1. **Primary Contact**: Team Manager Name & Mobile Number (Pre-filled from auth profile, editable).
      2. **Secondary On-Field Teammate Contact** (*Mandatory*): Option to select a teammate from the squad roster dropdown or enter a new contact (Full Name & Mobile Number) (e.g., vice-captain, reserve player, or scorekeeper stationed at the pavilion dugout).
      3. **Delivery Gate & Pavilion Notes**: Pre-populates venue entrance notes with an editable field for specific dugout instructions (e.g., *"East pavilion near score box"*).
  * **Requirement (Automated Soft Credit Application & Transparent Billing Breakdown)**:
    - System checks the `TeamWallet` balance bound to the Team Entity.
    - If `WalletBalance > 0`:
      - Automatically applies soft credit up to the cart total:
        $$\text{Applied Credit} = \min(\text{WalletBalance}, \text{OrderTotal})$$
        $$\text{Payable UPI Amount} = \text{OrderTotal} - \text{Applied Credit}$$
      - Displays itemized billing breakdown:
        - Order Subtotal: ₹1,100 (or partitioned subtotals for multi-match orders)
        - Applied Team Soft Credit: -₹500 (Remaining Wallet Balance: ₹0)
        - **Final Payable UPI Amount**: **₹600**
    - If `WalletBalance >= OrderTotal`:
      - Payable UPI Amount is ₹0. Order confirms instantly with 1 click using 100% wallet credits without launching UPI gateways.

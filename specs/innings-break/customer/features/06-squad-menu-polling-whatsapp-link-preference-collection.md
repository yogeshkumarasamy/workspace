> ← Back to [PRD: Innings Break Customer App (Team Manager App) — Index](file:///specs/innings-break/customer/prd.md)

# 3.6 Squad Menu Polling & WhatsApp Link Preference Collection (Pre-Order Squad Collaboration)

* **US-09**: As a Team Manager, after scheduling an upcoming game with our match squad, if I am unsure about menu preferences and want the squad's opinion before placing the order, I want an option from the Menus page to trigger personalized WhatsApp polling links to each squad member's verified contact number, so that each player can review the available match-day menu on a lightweight web page, submit their desired refreshments, notify me of their selections, and allow me to review, ensure completion, and lock our team pre-order.
  * **Requirement (Triggering Squad Polling from Menus Page)**:
    - On the Sports Nutrition Menus page for any scheduled match, a dedicated action is available: **"📱 Poll Squad / Share Menu via WhatsApp"**.
    - **Prerequisite Validation**: The app verifies that each player in the curated match squad has a valid **Player Name** and a valid **10-digit Mobile Contact Number (+91 format)**. If any contact is missing or invalid, an inline prompt highlights the missing fields for the manager to complete.
  * **Requirement (Personalized Player Web Polling Links & Secure Tokens)**:
    - The system generates a unique, personalized lightweight web polling link for each curated squad member:
      $$\text{Polling Link} = \text{https://inningsbreak.app/poll/}\{\text{matchScheduleId}\}/\{\text{playerToken}\}$$
    - Offers two sharing modes:
      1. **Individual WhatsApp Direct Share / SMS Dispatch**: 1-tap triggers WhatsApp message per player pre-formatted with their personalized link:
         > *"🏏 Hey [Player Name]! Select your refreshments for our upcoming match on [Match Date] @ [Ground Venue] ([Time Slot]): [Personalized Link]. Please submit your choice before [Cutoff Time] so I can lock our team pre-order! — [Manager Name]"*
      2. **Squad Group WhatsApp Broadcast Link**: A unified squad poll link for posting directly in the team's WhatsApp group where squad members click and select their name to submit their choices.
  * **Requirement (Lightweight Player Polling Web Experience — Zero Login, Zero App Install)**:
    - When a player taps their link on mobile:
      - Renders an ultra-fast, responsive web interface (zero account creation, zero login, zero app install).
      - Displays the match header (Date, Daytime Slot, Ground Venue, Pitch Name, Team Name).
      - Displays the live sports nutrition menu available for that match date and kitchen hub across all categories (Beverages, Fruit Bowls, Protein Snacks, Energy Bites, Team Meals).
      - Player selects their desired items & quantities.
      - Player taps **"Submit My Match Refreshment Choice"**.
      - Renders a clean confirmation screen (*"Thanks [Player Name]! Your refreshment choice has been sent to [Team Manager Name] for team ordering."*).
  * **Requirement (Real-Time Squad Polling Dashboard & Manager Notifications)**:
    - On the Team Manager's Menus page and match dashboard, an interactive **Squad Poll Tracker** panel renders live response metrics:
      - Progress Pill: *"📊 9 of 13 players have submitted preferences"*.
      - Real-Time Player Status List:
        - `🟢 Dinesh Kumar: Cold-Pressed Watermelon Juice x 1, Boiled Egg Duo x 1 [Submitted 08:30 PM]`
        - `🟢 Rahul S: Tender Coconut Water x 1, High Protein Ragi Porridge x 1 [Submitted 08:42 PM]`
        - `⚪ Ashwin R: Pending Selection [📱 Send WhatsApp Reminder]`
      - **Managerial Follow-Up on Cutoff Days ("C-Days")**: The Team Manager can tap 1-click **"Send WhatsApp Reminder"** to prompt pending teammates before the kitchen pre-order cutoff.
  * **Requirement (1-Tap Auto-Sync & Import to Order Draft)**:
    - Once the squad selections are collected (or at any time before cutoff):
      - Team Manager taps **"Import Squad Selections into Cart"**.
      - The system automatically aggregates all player selections into the menu order, binding each player's name directly to their respective dish line items (Per-Item Player Assignment).
      - Team Manager can make final managerial adjustments (e.g., adding extra electrolyte coolers or coconut water for reserves), review the consolidated cart, configure delivery contacts, and execute upfront UPI payment.

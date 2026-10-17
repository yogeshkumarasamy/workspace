> ← Back to [PRD: Innings Break Customer App (Team Manager App) — Index](file:///specs/innings-break/customer/prd.md)

# 3.3 Match Scheduling Flow: Hierarchical Ground Search, Slots & Optional Squad Curation

* **US-05**: As a Team Manager, when scheduling a match for an active date, I want a streamlined 4-step scheduling interface (Date Selection ➔ Hierarchical Ground Search ➔ Match Daytime Slot ➔ Optional Team Squad Curation), so that I can configure my match logistics and venue precision in under 60 seconds.

  * **Step 1: Date Confirmation (Field 1)**:
    - The match date is pre-populated based on the selected date from the calendar.
    - Visual badge indicates operating status (`Active Weekend` / `Active Midweek Holiday`).

  * **Step 2: Unified Hierarchical Ground & Venue Search (Field 2)**:
    - A single smart search bar allowing the Team Manager to search across the **Area ➔ Venue ➔ Ground** hierarchy:
      1. **Direct Venue Match**:
         - **`Standalone Venue`** (Venue with a single pitch): Instantly selects and loads that ground's details with zero extra clicks.
         - **`Multi-Complex Venue`** (Venue housing multiple pitches/turfs): Automatically expands and presents all nested grounds inside (e.g., *Ground #1 Centre Turf*, *Ground #2 South Matting*) for the Team Manager to pick the specific playing ground.
      2. **Area / Locality Match**:
         - When searching an area name (e.g., *Velachery*, *OMR*, *Porur*), the system returns all closest grounds in proximity within **20 km** by default, allowing the manager to pick the venue and pitch.
      3. **Direct Ground Name Match**:
         - Searching specific ground keywords instantly resolves to the matching pitch and its parent venue.
    - **Delivery Serviceability Indicator**: Live Haversine distance indicator against the active Kitchen Hub (`🟢 Deliverable (7.2 km)` vs `⚪ Out of Range (> 10 km)`).
    - **Leather Ball Ground Scope**: Pre-ordering is active strictly for **Leather Ball Cricket Grounds** (`Turf Wicket` and `Matting Wicket`). Tennis ball grounds or practice nets show an informational tag (*"Leather Ball Match Orders Only for MVP"*).
    - **Delivery Gate Instructions**: Pre-loads default gate instructions from the Console with an input field for optional custom notes (e.g., *"Pavilion tent on 3rd man boundary"*).

  * **Step 3: Match Daytime Slot Selection (Field 3)**:
    - Team Manager selects from the 3 standardized daytime match slots:
      - **`6:30 AM Slot`** (Early Morning Match — Refreshments delivered for match start / innings break).
      - **`10:30 AM Slot`** (Midday Match — Post-match recovery meals & cold-pressed electrolytes).
      - **`2:30 PM Slot`** (Afternoon Match — Pre-match hydration & evening energy packs).
    - Strictly enforces pre-order cutoff windows (locks slot once cutoff passes).

  * **Step 4: Optional Team Squad Selection & Ad-Hoc Player Addition (Field 4 — Place 2)**:
    - Team Manager is presented with an optional step: **"Curate Team Squad for this Match?"**:
      - **Purpose**: Enables itemized player-mapped order breakdown on the invoice, WhatsApp squad sharing, and personalized WhatsApp squad menu polling.
      - **Roster Selection**: Presents a searchable checklist of all existing team members from the persistent Team Roster. Manager checks off the playing XI / squad members for this specific match date.
      - **Contextual Inline Ad-Hoc Player Addition ("+ Add New / Guest Player")**:
        - If the squad has recruited a guest player or a new teammate on loan for this weekend's game who is not yet in the roster:
        - Manager taps **"+ Add Player"** directly inside the squad curation drawer/modal (without exiting or losing scheduling progress).
        - Prompts for **Player Full Name** (*Mandatory*) and **10-Digit Mobile Number (+91)** (*Mandatory*).
        - Automatically checks the player into the current match squad AND persists them into the main Team Roster for future match selection and management.
      - **If Skipped / Opted Out**: Manager bypasses individual player tagging and proceeds directly to consolidated squad ordering.
    - Clicking **"Confirm Schedule & Browse Menu"** completes the scheduling step, immediately tags the date on the calendar, and transitions to the Sports Nutrition Menu.

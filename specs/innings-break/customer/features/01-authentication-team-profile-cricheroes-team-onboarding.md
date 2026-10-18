> ← Back to [PRD: Innings Break Customer App (Team Manager App) — Index](file:///specs/innings-break/customer/prd.md)

# 3.1 Authentication, Team Profile & CricHeroes Team Onboarding

* **US-01**: As a Team Manager, I want to sign up with verified squad details (Team Name, CricHeroes Team link, optional Captain profile) or log in subsequently using strictly my Mobile Number and SMS OTP, so that onboarding validates our cricket team's integrity while subsequent logins remain instantaneous.
  * **Requirement (Mobile OTP Authentication Layer)**:
    - **Primary Identifier**: Mobile number (+91 Indian format) is the sole credential.
    - **SMS OTP Verification**: 4/6-digit SMS OTP verification with auto-read and 30-second resend timer to verify mobile integrity.
    - **Subsequent Sign-Ins**: For registered Team Managers, sign-in requires **strictly Mobile Number + SMS OTP** (zero password friction, zero redundant data re-entry).
    - Persistent session across mobile browsers and installed PWA.
  * **Requirement (First-Time Team Manager Sign-Up & Integrity Data Model)**:
    - When a new Team Manager signs up for the first time, the onboarding flow captures:
      1. **Team Manager Full Name** (*Mandatory* — Name of the manager coordinating logistics).
      2. **Mobile Number** (*Mandatory* — Verified via SMS OTP).
      3. **Team Name** (*Mandatory* — e.g., *"Chennai Strikers CC"*, *"Velachery Smashers"*).
      4. **CricHeroes Team Profile Link / URL** (*Mandatory* — Direct URL to the squad's public CricHeroes team page to verify team legitimacy, match fixtures, and squad roster).
      5. **CricHeroes Captain Individual Profile Link / URL** (*Optional* — Direct URL to the match-day playing captain's CricHeroes player profile).
  * **Requirement (Team-Level Entity & Soft Credit Wallet)**:
    - A dedicated **Team Entity** is instantiated upon sign-up completion containing the Team Name, CricHeroes Team Link, and Captain Link.
    - An **In-App Soft Credit Wallet** (`TeamWallet`) is bound directly to the Team Entity (rather than just the individual manager's user record).
    - If a squad rotates Team Managers across seasons, the team entity and wallet balance remain securely intact for the squad.

* **US-02**: As a Team Manager, I want to manage our Team Profile, maintain our Team Roster (via initial one-time CricHeroes seed and manual ad-hoc member additions), configure delivery contacts, and monitor our Team Soft Credit balance and order history, so that our squad logistics and player roster remain up-to-date.
  * **Requirement (Dedicated Team Profile & Account Tab)**:
    - Displays:
      - Team Name & CricHeroes Team Profile Link (clickable external badge).
      - CricHeroes Captain Profile Link (if configured).
      - Current **Team Soft Credit Wallet Balance** (₹ INR).
      - Primary Team Manager Details (Name & Mobile Number).
      - Secondary / Alternate On-Field Contacts (Pre-configurable defaults for delivery drop-off).
      - Past Match Order History with itemized invoice copies and UPI references.
  * **Requirement (Team Roster & Members Management Section — Place 1)**:
    - **Initial Roster Population**: One-time initial seed/import of team members from the CricHeroes Team Profile link provided at signup. *(Note: System does not run recurring background sync with CricHeroes to prevent API friction or accidental overwrites).*
    - **Manual Ad-Hoc Member Management**:
      - A dedicated **"Team Members / Squad Roster"** management section under the Team Profile tab.
      - Prominent **"+ Add Team Member"** button allowing the Team Manager to manually register new players (e.g., permanent squad additions, new club recruits).
      - Member Form captures:
        1. **Player Full Name** (*Mandatory*)
        2. **10-Digit Mobile Contact Number (+91 format)** (*Mandatory* — required for WhatsApp polling & delivery contact)
        3. **CricHeroes Individual Player Profile Link** (*Optional*)
        4. **Playing Role / Tag** (*Optional* — e.g., *Batter*, *Bowler*, *All-Rounder*, *Wicketkeeper*).
      - Ability to edit contact numbers or archive inactive players.

* **US-03**: As a Primary Team Manager, I want to delegate full match-week logistics management to a registered team member on a per-week basis via a secure tokenized URL and revoke it at any time, so that a co-manager can handle ground scheduling, squad polling, ordering, and payment when I am unavailable while maintaining clear role distinction.
  * **Requirement (Per-Week Delegation Assignment Flow)**:
    - In the **Team Members** management section or from the **Active Week Calendar View**, the Primary Team Manager can tap **"Delegate Match Week Management"**.
    - Manager selects:
      1. **Target Team Member**: Picked from the registered squad roster (ensures Name + verified Mobile Number exist).
      2. **Operating Match Week**: Target week selection (e.g., *Week of 26 Sep – 27 Sep 2026* or *Current Active Week*).
    - App generates a secure, time-bound **Magic Delegation URL**:
      $$\text{Delegation Link} = \text{https://inningsbreak.app/delegate/}\{\text{teamId}\}/\{\text{delegationToken}\}$$
    - **1-Tap WhatsApp / SMS Dispatch**: Pre-formats a direct invite message to the delegate's registered mobile number:
      > *"🏏 Hey [Delegate Name]! [Primary Manager Name] has delegated logistics management for [Team Name] for the week of [Week Dates]. Access the match-week manager portal here: [Delegation Link]"*
  * **Requirement (Delegated Manager Authentication & Validation)**:
    - When the delegate opens the link on their mobile device:
      - App resolves the token, identifies the pre-registered Team Member record, and validates their mobile number via SMS OTP.
      - Instantiates an active session scoped strictly as **Delegated Match-Week Manager** for the assigned match week(s).
  * **Requirement (Delegated Manager Permissions & Scope of Access)**:
    - For their assigned match week, the Delegated Match-Week Manager holds full operational parity:
      - Complete 4-Step Match Quick Scheduling & Ground Hierarchy Search.
      - Match Squad Curation & Inline Guest Player Addition.
      - Trigger WhatsApp Squad Menu Polling links and send C-day reminders.
      - Customize sports nutrition menu items & Per-Item Player Assignments.
      - Configure dual delivery contacts and execute UPI payments (utilizing the Team Soft Credit Wallet).
      - Track textual fulfillment updates and coordinate courier drop-off.
    - **Strict Security Boundaries**:
      - Delegated Manager *cannot* transfer permanent team ownership, edit the Primary Team Manager's profile, or revoke the Primary Manager.
      - Access automatically expires once the delegated match week concludes.
  * **Requirement (Clear UI Role Distinction & Status Badges)**:
    - When accessed by a Delegated Manager, the app renders a prominent top persistent header banner:
      `👑 Delegated Manager (Week of 26 Sep) • Primary Manager: [Primary Manager Name]`
    - Primary Manager's dashboard displays active delegations with an instant **"Revoke Access"** button to cancel delegation on demand.

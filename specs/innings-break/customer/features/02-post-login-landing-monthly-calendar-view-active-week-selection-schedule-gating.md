> ← Back to [PRD: Innings Break Customer App (Team Manager App) — Index](file:///specs/innings-break/customer/prd.md)

# 3.2 Post-Login Landing: Monthly Calendar View, Active Week Selection & Schedule Gating

* **US-04**: As a Team Manager, upon successful sign-up or login, I want to land directly on an Interactive Monthly Calendar View with the current active operating week pre-selected, so that I can immediately schedule my squad's upcoming weekend game, schedule active midweek holiday matches, or plan future upcoming weeks in advance—strictly governed by the Console app's operational availability.
  * **Requirement (Default Post-Auth Landing Screen)**:
    - Immediately upon completing sign-up or logging in via OTP, the Team Manager lands on the **Interactive Monthly Calendar View** as the primary home screen.
    - Top header provides month navigation (`< Previous Month`, `Current Month`, `Next Month >`).
    - The calendar renders a responsive 7-column layout (**Monday through Sunday**) with the **Current Active Week** prominently highlighted in an active focus card/row for instant 1-tap scheduling.
  * **Requirement (Active Week Quick Scheduling & Weekend Focus)**:
    - By default, the active operating week highlights the upcoming **Saturday** and **Sunday** match days with active badges and pre-order indicators.
    - Team Manager can tap either Saturday or Sunday to open the **Match Scheduling Modal / Page**.
  * **Requirement (Midweek Holiday Match Scheduling)**:
    - If the active week qualifies for a midweek holiday game (e.g., *Pongal*, *Republic Day*, *Diwali*, *May Day*, or special league tournament dates configured and activated in the Console):
      - The holiday date is prominently badged (e.g., `🎉 Pongal Match Special — Open for Pre-Orders`).
      - Team Manager can select and schedule team refreshments for the holiday game exactly like a weekend match.
  * **Requirement (Future Upcoming Weeks & Advance Month Scheduling)**:
    - Team Managers can scroll or navigate to future weeks within the active month or jump to upcoming months.
    - Allows advance match scheduling and refreshment booking for upcoming tournament leagues or multi-week fixtures.
  * **Requirement (Strict Console Availability Gating & Stranger Day Lockout)**:
    - **Absolute System Constraint**: Pre-order scheduling is strictly and dynamically gated by the operational status configured in the **Innings Break Console** ([specs/innings-break/console/features/03-active-month-calendar-view-operational-schedule-engine.md](file:///specs/innings-break/console/features/03-active-month-calendar-view-operational-schedule-engine.md) US-08 / US-09).
    - **Active Operational Days** (`🟢 Active` in Console): Enabled, selectable, and interactive.
    - **Non-Operational / Closed Days** (`⚪ Closed` in Console): Visually greyed out, locked, and non-clickable. Tapping displays a clear tooltip/toast (*"Kitchen Hub closed on this date. Pre-orders not accepted."*).
    - **Automated Fallback Synchronization**: Future unconfigured weeks automatically reflect the standard Saturday & Sunday availability established by the Console's Sunday 2:00 PM automated fallback engine.
  * **Requirement (Real-Time Calendar Reflection of Scheduled Matches)**:
    - Upon completing match scheduling, the date cell on the Monthly Calendar View immediately updates with a distinct visual indicator/pill (e.g., `🏏 Scheduled: vs Velachery CC @ Marina Turf 1 [6:30 AM]`), allowing the Team Manager to visually track all upcoming scheduled match fixtures.

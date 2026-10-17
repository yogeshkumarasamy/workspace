> ← Back to [PRD: Innings Break Console — Index](file:///specs/innings-break/console/prd.md)

# 3.3 Active Month Calendar View & Operational Schedule Engine

* **US-08**: As a Business Owner, I want full month-level and week-level control over the Active Month Calendar View, and as an Operations Manager, I want to view operational schedules and toggle day-level availability for my Kitchen Hub, so that operational days are visually managed well in advance with clear administrative governance.
  * **Requirement (Interactive Active Month Calendar View)**:
    - 7-column layout (**Monday through Sunday**) rendering the full active month in a responsive calendar grid.
    - Calendar navigation controls: `< Previous Month`, `Current Month`, `Next Month >` available to both `Business Owner` and `Operations Manager`.
    - Day cells display visual status indicators: `🟢 Active Operating Day` (with order count pill if pre-orders exist) vs `⚪ Non-Operational / Closed`.
  * **Requirement (Month-Level Bulk Configuration Controls — Business Owner Exclusive)**:
    - Month header toolbar actions (visible and executable **exclusively by Business Owner**):
      1. **"Apply Month Defaults (All Weekends)"**: Pre-configures all Saturdays and Sundays across the active month with 1 click.
      2. **"Clear Month Schedule"**: Resets unconfirmed future weeks across the month.
  * **Requirement (Week-Level Operation Controls — Business Owner Exclusive)**:
    - Row-level action controls for every Monday-to-Sunday week row (visible and executable **exclusively by Business Owner**):
      1. **"Set Default Weekend (Sat & Sun)"**: Instantly marks Saturday and Sunday as active while keeping weekdays closed.
      2. **"Activate Entire Week"**: Sets all 7 days (Monday–Sunday) as active for continuous tournament operations or multi-day leagues.
      3. **"Deactivate Week"**: Marks all 7 days non-operational for seasonal or maintenance breaks.
  * **Requirement (Day-Level Granular Toggles & Holiday Tagging — Role Scoped)**:
    - Clicking or tapping any individual date cell toggles its operational status between `Active` and `Non-Operational`.
    - `Business Owner`: Toggles day-level status globally across the business.
    - `Operations Manager`: Toggles day-level operating availability specifically for their assigned Kitchen Hub.
    - Allows attaching descriptive event tags or holiday labels (e.g., *"Pongal Holiday Match"*, *"Diwali Special"*, *"Kitchen Maintenance"*).
  * **Requirement (Upcoming Week & Long-Range Advance Planning)**:
    - Staff can navigate to future weeks and months to review and plan operations ahead of time, ensuring long-term match scheduling predictability.

* **US-09**: As a Business Owner or Operations Manager, I want the operational schedule to enforce automated default fallbacks, Sunday post-lunch cutoffs, and strict customer pre-order date gating, so that unconfigured weeks default safely to weekends and Team Managers can only pre-order on verified active operational days.
  * **Requirement (Monday-to-Sunday Business Week Definition)**: The operational business week runs strictly from **Monday (00:00)** through **Sunday (23:59)**.
  * **Requirement (Default Weekend Operating Schedule)**: Every unconfigured upcoming Monday-to-Sunday cycle automatically defaults to **Saturday** and **Sunday** as active business days.
  * **Requirement (Midweek Holiday & Custom Operating Day Activation)**: `Business Owner` (globally) and `Operations Manager` (for their hub) have the option to mark and activate any weekday (`Monday`, `Tuesday`, `Wednesday`, `Thursday`, `Friday`) as an active operating day to support public holidays (e.g., Pongal, Diwali, Republic Day), regional holidays, or special weekday cricket matches.
  * **Requirement (Operational Day Deactivation)**: Staff can toggle off standard weekend days (e.g., for scheduled kitchen deep cleaning, maintenance, or off-season breaks).
  * **Requirement (Advance Scheduling & Sunday Post-Lunch Cutoff)**: Staff can configure and review the upcoming week's operational schedule in advance. The review/configuration cutoff is **Sunday Post-Lunch (2:00 PM / 14:00 IST)** of the preceding week.
  * **Requirement (Automated Default Fallback Engine)**: If no explicit changes or confirmations are submitted by the Sunday 2:00 PM cutoff, the system automatically confirms and locks the default schedule (**Saturday and Sunday**) for the upcoming week with zero operational downtime.
  * **Requirement (Operational Mandate / Thumb Rule)**: Even with automated fallback, it is an operational thumb rule that the Business Owner or Operations Manager actively reviews the Active Month Calendar and marks the days of support for the next week before the cutoff to ensure ingredient procurement and kitchen staffing readiness.
  * **Requirement (Customer App Date Selection Gating)**: The `Innings Break` customer app dynamically restricts match date selection and pre-ordering strictly to the active operating days configured for that week in the Console. Inactive days are greyed out, locked, and disabled for pre-orders.
  * **Requirement (Console Date Switcher Alignment)**: The Console's Match Date Switcher dynamically reflects the active operational days of the week (Saturday, Sunday, and any activated midweek holidays).

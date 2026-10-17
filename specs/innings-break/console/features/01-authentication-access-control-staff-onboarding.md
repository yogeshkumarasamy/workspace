> ← Back to [PRD: Innings Break Console — Index](file:///specs/innings-break/console/prd.md)

# 3.1 Authentication, Access Control & Staff Onboarding (Whitelisted & Invite-Only)

* **US-01**: As a Business Owner or invited Operations Manager, I want to sign in securely using my pre-authorized mobile number and SMS OTP, so that only verified console personnel can access the application and unauthorized public visitors are strictly blocked.
  * **Requirement (Single Business Owner Bootstrap)**: The system operates with a single Business Owner for MVP whose mobile number is pre-configured/whitelisted during initial setup.
  * **Requirement (Strict Mobile Number Gating & Stranger Lockout)**:
    - Mobile number is the sole unique identifier for console access.
    - Public / uninvited self-registration is strictly disabled.
    - When a user enters their mobile number at the login screen:
      - **Authorized (Business Owner or Invited Operations Manager)**: System dispatches SMS OTP and allows login.
      - **Unauthorized / Stranger**: System halts immediately with an error (*"Access Denied: Your mobile number is not registered or invited. Contact the Business Owner for console access."*), and no OTP is sent.
  * **Requirement**: System routes the verified user to the appropriate Console dashboard upon successful OTP verification (`Business Owner` ➔ Full Console; `Operations Manager` ➔ Kitchen Hub-scoped dashboard).

* **US-02**: As a Business Owner, I want a dedicated Team Members section to invite Operations Managers by their mobile number and assign them to specific Kitchen Hubs, so that staff onboarding is controlled and pre-authorized before they ever access the app.
  * **Requirement**: The Team Members section is visible **exclusively to the Business Owner**.
  * **Requirement**: Business Owner invites a new Operations Manager by entering their **Full Name**, **Mobile Number**, **Email**, and **Assigned Kitchen Hub**.
  * **Requirement (Pre-Authorization & Invite Dispatch)**:
    - Entering the mobile number automatically pre-authorizes and whitelists that number in the backend.
    - Business Owner can share the secure onboarding link via WhatsApp or copy-link.
    - When the Operations Manager opens the link and verifies their mobile number via OTP, their profile is confirmed and automatically bound to their assigned Kitchen Hub.
  * **Requirement**: Displays registered Operations Managers (Name, Mobile, Email, Assigned Kitchen Hub, Date Joined, Status: `Invited` / `Active` / `Suspended`).
  * **Requirement**: Business Owner can re-assign an Operations Manager to a different Kitchen Hub or revoke/suspend access.

* **US-03**: As an Operations Manager, I want my dashboard and navigation to be automatically scoped to my assigned Kitchen Hub and exclude administrative settings, so that I focus entirely on my location's kitchen prep, orders, and delivery logistics.
  * **Requirement**: Navigation excludes Team Members management and business presence configuration.
  * **Requirement**: Order queue, batch prep sheet, and dispatch tabs automatically default and scope to the Operations Manager's assigned Kitchen Hub.

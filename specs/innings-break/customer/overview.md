> ← Back to [PRD: Innings Break Customer App (Team Manager App) — Index](file:///specs/innings-break/customer/prd.md)

# PRD: Innings Break Customer App (Team Manager App) — Overview

## 1. Problem Statement

Every weekend across Chennai, dozens of amateur cricket teams compete in serious, 20-to-25 over leather-ball cricket matches. These matches span **5 to 6 hours** under severe coastal heat and humidity:
* **The Match Day Reality**: 20–40 min commute + First Innings (80–120 min) + **Innings Break (20–30 min)** + Second Innings (80–120 min) + Return commute.
* **The Amenities Desert**: Most cricket grounds are located in remote peripheral areas (e.g., outskirts of OMR, ECR, Porur, Vandalur, Red Hills) with zero access to fresh water, nutritious food, or hygienic sports hydration.
* **The Coordination Bottleneck**: Existing food delivery apps (Swiggy, Zomato) are designed for individual or household deliveries. In a fluid cricket squad where player rosters change weekly, individual ordering results in 60–80% delivery fee markups per item, fragmented ordering, and 8 out of 11 players skipping nutrition altogether.
* **The Health & Performance Crisis**: Amateur cricketers play intensive physical sport for 6 hours with empty stomachs and severe dehydration, leading to cramping, heat exhaustion, and poor athletic performance.

### The Solution: Innings Break Customer App
**Innings Break** is a dedicated mobile-first Progressive Web Application (PWA) built specifically for the **Team Manager**. It enables consolidated pre-ordering of fresh, in-house sports nutrition (cold-pressed juices, coconut water, boiled eggs, high-protein energy snacks, fresh fruit bowls, and wholesome porridges) delivered directly to the designated cricket pitch gate before the team takes the field or enters the innings break.

---

## 2. Target Personas & Persona Boundaries

### 2.1 Team Manager (Primary Persona)
* **Description**: The dedicated, trusted logistics coordinator for the cricket squad (could be the captain, vice-captain, team organizer, or assigned squad manager).
* **Why "Team Manager" (Not "Captain")**: In weekend amateur cricket, playing captains rotate, miss matches due to personal commitments, or focus entirely on on-field strategy. The team requires a designated logistics manager who handles supplies, finances, and squad coordination regardless of who captains on the day.
* **Goals**:
  1. Easily locate and select the match ground/venue from Chennai's directory.
  2. Collect player preferences via the team's WhatsApp group and place a single consolidated pre-order for the squad.
  3. Seamlessly pay upfront via UPI.
  4. Automatically apply Team In-App Soft Credits from previous rainouts or compensations.
  5. Provide secondary on-field contact info so delivery couriers never interrupt live play.
  6. Track real-time order prep and courier dispatch status on match morning.
  7. Cancel matches seamlessly if early morning coastal rain washes out the pitch, receiving instant 100% soft credit into the team wallet.
* **Pain Points**:
  - Hates collecting money piecemeal or paying exorbitant individual delivery fees.
  - Frustrated when delivery drivers call during the middle of an over or get lost at sprawling multi-ground complexes.
  - Worries about losing money if rain washes out the match.

### 2.2 Passive Actors (Strict Zero App Access)
* **Player**: Shares food/drink preferences in the squad's WhatsApp group. Consumes the refreshments at the ground. Has **zero app access** (no player logins, no player ordering screens).
* **Delivery Partner**: External 3rd-party courier (Dunzo, Porter, or Direct Courier). Coordinates drop-off via phone/gate notes. Has **zero app interface**.

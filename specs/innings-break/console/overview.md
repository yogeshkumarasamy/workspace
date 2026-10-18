> ← Back to [PRD: Innings Break Console — Index](file:///specs/innings-break/console/prd.md)

# PRD: Innings Break Console — Overview

## 1. Problem Statement

Amateur cricket in Chennai is a weekend-long ritual with dozens of teams competing in 5-to-6 hour match days under severe coastal heat. While **Innings Break** enables **Team Managers** to pre-order bulk refreshments for their squads, the operation requires a unified back-office platform for the **Business Owner** and their deployed **Operations Managers** to:

1. **Manage Chennai's Dynamic Ground Network**: Organize a growing directory of cricket facilities (from multi-pitch complexes to box cricket turfs) with pinpoint GPS coordinates and gate instructions for couriers.
2. **Standardize In-House Sports Nutrition**: Create and curate wholesome, freshly prepared sports nutrition items (juices, cut fruits, boiled eggs, nutritious porridges, energy bites, and team meals) with full nutritional transparency.
3. **Fulfill Match Day Pre-Orders at Scale**: Monitor incoming weekend orders, generate kitchen prep batch sheets, advance order fulfillment statuses, and coordinate on-demand 3rd-party delivery dispatch (Dunzo, Porter) to remote cricket grounds.
4. **Delegate Operations Securely**: Onboard and manage operational staff (**Operations Managers**) with role-based boundaries while keeping administrative controls centralized with the **Business Owner**.

---

## 2. Target Personas

### 2.1 Business Owner (Super-User)
* **Description**: The entrepreneur who owns and oversees the entire Innings Break operation.
* **Goals**: Manage business presences (cities & kitchen hubs), designate the Primary Kitchen Hub and secondary hubs, manage global menu items and dynamic bundles, assign Operations Managers to kitchen hubs, oversee revenue and cross-location orders, and monitor delivery dispatches.
* **Pain Points**: Needs a unified multi-location system that starts with a single primary kitchen today but seamlessly scales to multiple kitchens and managers without schema or workflow rewrites.

### 2.2 Operations Manager (Console Operations Staff)
* **Description**: Operational staff deployed by the Business Owner to run day-to-day kitchen fulfillment and courier dispatches for their assigned Kitchen Hub.
* **Goals**: Operate a location-scoped dashboard (monitoring orders, kitchen batch prep, and courier dispatches strictly for their assigned kitchen), and toggle menu item availability (`In Stock` / `Sold Out`) for their kitchen.
* **Strict Boundary**: Assigned to a specific Kitchen Hub; strictly barred from accessing the **Team Members** management section or business administration controls.

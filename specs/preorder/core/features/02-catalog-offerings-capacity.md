> ← Back to [PRD: Pre-Order Core Module — Index](../prd.md)

# 3.2 Catalog, Offerings & Capacity

Defines **what** can be pre-ordered, **where/when** it is fulfilled, and **how much** is available.

## User Stories

* **US-PM-05**: As an `owner`, I want to manage a business-wide **catalog** of items (name, description, price, attributes, image, status) and **bundles** composed of items, so that I define products once and reuse them across slots.
  * **Given** a bundle containing item `A ×2` and item `B ×1`, **When** item `A` is archived, **Then** the bundle becomes `unavailable` and cannot be offered until edited (`409 BUNDLE_COMPONENT_ARCHIVED` on offer).
  * **Given** an item has historic orders, **When** the owner deletes it, **Then** it is soft-archived, never hard-deleted; order lines keep a price/name snapshot.
* **US-PM-06**: As an `owner`, I want to define **slots** (fulfilment time ranges per location and date) and publish **offerings** (item × slot) with a capacity in units, so that customers can only order what I can produce.
  * **Given** offering `O1` with `capacity=40`, **When** customers view it, **Then** they see `available = capacity − committed − activeHolds` (never negative) and `soldOut = available == 0`.
  * **Given** capacity is reduced below `committed`, **When** the owner saves, **Then** reject with `409 CAPACITY_BELOW_COMMITTED` and `details.committed`.
* **US-PM-07**: As an `operator`, I want to toggle an offering or a whole item **unavailable** for my location in one action (e.g. ingredient ran out), so that new holds stop immediately without editing the catalog.
  * **Given** an `operator` scoped to location `L1`, **When** they pause offering `O1` at `L1`, **Then** new reservations return `409 OFFERING_UNAVAILABLE`; existing committed orders are unaffected; event `OfferingAvailabilityChanged` is emitted.
  * **Given** the operator is not scoped to `L2`, **When** they try to pause an offering at `L2`, **Then** `403 LOCATION_SCOPE_DENIED`.
* **US-PM-08**: As a `customer`, I want to see only offerings I am **eligible** for (e.g. my delivery point within the service radius, minimum order value) with a clear reason if not, so that I don't attempt orders that will be refused.
  * **Given** an `EligibilityRule` `radius(locationId, km=15)` and a delivery point 18 km away, **When** I request offerings, **Then** each is returned with `eligible=false, reasons=["OUT_OF_SERVICE_AREA"]`, and placing an order returns `422 NOT_ELIGIBLE`.
  * **Given** two rules both fail, **When** evaluated, **Then** all failing reason codes are returned (rules are evaluated, not short-circuited).

**Batches**: an `operator` can view prep aggregates per **batch** (a group of offerings produced together). A batch may define its own `capacity`; when present, reservations must satisfy **both** offering and batch capacity.

## Data Model

| Entity | Key fields | Notes |
|---|---|---|
| `CatalogItem` | `id`, `name`, `description?`, `priceMinor:int`, `currency`, `attributes: JSON`, `imageUrl?`, `status: active\|archived`, `version` | `attributes` holds domain data (nutrition, allergens, size…). |
| `BundleComponent` | `bundleId`, `itemId`, `quantity:int>0` | `CatalogItem.kind = item\|bundle`. |
| `Slot` | `id`, `locationId`, `localDate`, `fulfilmentStart`, `fulfilmentEnd`, `mode: pickup\|delivery\|both`, `status: scheduled\|cancelled` | Window in [3.1](./01-preorder-windows-cutoffs-timezone-rules.md). |
| `Offering` | `id`, `slotId`, `itemId`, `batchId?`, `capacity:int≥0`, `committed:int`, `held:int`, `priceOverrideMinor?`, `maxPerOrder?`, `available:boolean`, `version` | `committed`, `held` are counters maintained by [3.4](./04-inventory-holds-reservations.md). |
| `Batch` | `id`, `slotId`, `label`, `capacity?:int`, `committed`, `held` | |
| `ServiceArea` | `locationId`, `ruleKind`, `params: JSON` | e.g. `{ "kind": "radius", "km": 15 }`. |

### Suggested SQL
```sql
CREATE TABLE catalog_item (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('item','bundle')),
  name TEXT NOT NULL, description TEXT,
  price_minor INTEGER NOT NULL CHECK (price_minor >= 0),
  currency TEXT NOT NULL,
  attributes JSONB NOT NULL DEFAULT '{}',   -- D1: TEXT
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
  version INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE bundle_component (
  bundle_id TEXT NOT NULL REFERENCES catalog_item(id),
  item_id TEXT NOT NULL REFERENCES catalog_item(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  PRIMARY KEY (bundle_id, item_id)
);
CREATE TABLE slot (
  id TEXT PRIMARY KEY,
  location_id TEXT NOT NULL REFERENCES fulfilment_location(id),
  local_date DATE NOT NULL,
  fulfilment_start TIMESTAMPTZ NOT NULL, fulfilment_end TIMESTAMPTZ NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('pickup','delivery','both')),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','cancelled'))
);
CREATE TABLE batch (
  id TEXT PRIMARY KEY, slot_id TEXT NOT NULL REFERENCES slot(id), label TEXT NOT NULL,
  capacity INTEGER CHECK (capacity >= 0),
  committed INTEGER NOT NULL DEFAULT 0, held INTEGER NOT NULL DEFAULT 0,
  CHECK (capacity IS NULL OR committed + held <= capacity)
);
CREATE TABLE offering (
  id TEXT PRIMARY KEY,
  slot_id TEXT NOT NULL REFERENCES slot(id),
  item_id TEXT NOT NULL REFERENCES catalog_item(id),
  batch_id TEXT REFERENCES batch(id),
  capacity INTEGER NOT NULL CHECK (capacity >= 0),
  committed INTEGER NOT NULL DEFAULT 0 CHECK (committed >= 0),
  held INTEGER NOT NULL DEFAULT 0 CHECK (held >= 0),
  price_override_minor INTEGER,
  max_per_order INTEGER,
  available INTEGER NOT NULL DEFAULT 1,     -- boolean
  version INTEGER NOT NULL DEFAULT 1,
  UNIQUE (slot_id, item_id),
  CHECK (committed + held <= capacity)      -- last line of defence against oversell
);
CREATE TABLE service_area (
  location_id TEXT NOT NULL REFERENCES fulfilment_location(id),
  rule_kind TEXT NOT NULL, params JSONB NOT NULL,
  PRIMARY KEY (location_id, rule_kind)
);
```

## API Contract

| Method & Path | Role(s) | Request | Response | Errors |
|---|---|---|---|---|
| `GET /v1/catalog/items?status=active` | any | — | `200 { items: CatalogItem[] }` | — |
| `POST /v1/catalog/items` | owner | `{ kind, name, description?, priceMinor, currency, attributes?, imageUrl?, components?: [{ itemId, quantity }] }` | `201 CatalogItem` | `400 VALIDATION_FAILED`, `422 BUNDLE_REQUIRES_COMPONENTS` |
| `PATCH /v1/catalog/items/{id}` | owner | partial; `If-Match` | `200 CatalogItem` | `412 VERSION_CONFLICT` |
| `POST /v1/catalog/items/{id}:archive` | owner | — | `200 CatalogItem` | — |
| `POST /v1/locations/{locationId}/slots` | owner | `{ localDate, startLocal: "HH:mm", endLocal: "HH:mm", mode }` | `201 Slot` (+ materialised window) | `409 DATE_CLOSED`, `422 INVALID_TIME_RANGE` |
| `POST /v1/slots/{slotId}/offerings` | owner | `{ itemId, capacity, batchId?, priceOverrideMinor?, maxPerOrder? }` | `201 Offering` | `409 OFFERING_EXISTS`, `409 BUNDLE_COMPONENT_ARCHIVED` |
| `PATCH /v1/offerings/{id}` | owner | `{ capacity?, priceOverrideMinor?, maxPerOrder? }`; `If-Match` | `200 Offering` | `409 CAPACITY_BELOW_COMMITTED`, `412 VERSION_CONFLICT` |
| `POST /v1/offerings/{id}:set-availability` | owner, operator (scoped) | `{ available: boolean, reason? }` | `200 Offering` | `403 LOCATION_SCOPE_DENIED` |
| `GET /v1/slots/{slotId}/offerings?lat=&lng=&accountId=` | any | — | `200 { window, offerings: [{ id, item, unitPriceMinor, available, remaining, soldOut, eligible, reasons[] }] }` | `404 SLOT_NOT_FOUND` |
| `GET /v1/slots/{slotId}/prep-aggregate` | owner, operator (scoped) | — | `200 { batches: [{ batchId, label, lines: [{ itemId, name, quantity }] }], bundleExpansion: true }` | — |

Prep aggregates **expand bundles** into component quantities and include only orders in `Confirmed` or `Preparing`.

## Domain Events
`CatalogItemCreated`, `CatalogItemUpdated`, `CatalogItemArchived`, `SlotScheduled`, `SlotCancelled`, `OfferingPublished`, `OfferingCapacityChanged { from, to }`, `OfferingAvailabilityChanged { available, actor }`, `OfferingSoldOut`.

## Invariants
* `0 ≤ committed + held ≤ capacity` for every offering (and every batch with a capacity), enforced in code **and** by DB `CHECK`.
* Price shown at hold time is snapshotted onto the order line; later catalog edits do not change placed orders.
* Archived items are never offered; existing offerings of an archived item become `available=false`.
* Eligibility is evaluated server-side at reservation **and** at placement.

## Codegen Notes
* **Modules**: `core/catalog` (entities, bundle expansion), `core/capacity` (remaining-units math), `core/eligibility` (rule evaluation via `EligibilityRule` port, see [3.11](./11-extension-points-ports.md)).
* **Types**:
  ```ts
  interface Money { amountMinor: number; currency: string }
  interface CatalogItem { id: string; kind: 'item'|'bundle'; name: string; price: Money; attributes: Record<string, unknown>; status: 'active'|'archived'; version: number }
  interface Offering { id: string; slotId: string; itemId: string; batchId?: string; capacity: number; committed: number; held: number; available: boolean; maxPerOrder?: number; version: number }
  const remaining = (o: Offering) => Math.max(0, o.capacity - o.committed - o.held);
  function expandBundles(lines: OrderLine[], catalog: CatalogLookup): Array<{ itemId: string; quantity: number }>;
  ```
* **Tests to generate**: remaining never negative; capacity-below-committed rejection; batch + offering dual capacity; bundle expansion in prep aggregate; archive cascades to bundle availability; operator scope enforcement; eligibility returns all failing reasons.

> ← Back to [PRD: Pre-Order Core Module — Index](../prd.md)

# 3.8 Notifications

Notifications are **derived from domain events** through a transactional outbox and delivered by `Notifier` adapters. The core decides *who* should be told *what*; adapters decide *how*.

## User Stories

* **US-PM-28**: As a `customer`, I want to be notified when my order is confirmed, ready, dispatched, delivered, cancelled or refunded, so that I don't need to keep checking.
  * **Given** event `OrderDispatched` for my order, **When** the outbox dispatcher runs, **Then** one `Notification` per subscribed channel is created for me using template `order.dispatched` with variables `{ orderId, slotStartLocal, trackingRef? }` rendered in the location's timezone.
  * **Given** the same event is dispatched twice (retry), **Then** only one notification per `(eventId, recipient, channel)` exists.
* **US-PM-29**: As an `owner` or `operator`, I want an **in-app notification feed** (new orders, pending reviews, failed payments, auto-lock happened) that I can mark read, so that operational alerts are visible without external messaging costs.
  * **Given** a new `OrderConfirmed` at location `L1`, **Then** every operator scoped to `L1` and every owner receives a feed item; `GET /v1/me/notifications?unread=true` returns it with an `ETag`.
* **US-PM-30**: As an `owner`, I want to configure which channels (in-app, email, SMS, messaging app, outbound webhook, share-link) are used per event type, with quiet hours in local time, so that I control cost and noise.
  * **Given** SMS is disabled for `order.ready` and quiet hours `22:00–07:00` local apply to non-critical events, **When** an event at 23:00 local fires, **Then** only in-app is created immediately and external channels are scheduled for 07:00 local (`deliverAfter`).
  * **Given** a channel adapter fails, **Then** it retries with exponential backoff (max 5 attempts) and marks `failed` with `lastError`; it never blocks the order transition.

**Share-link channel**: for channels the server cannot send through (e.g. user-initiated messaging-app share), the adapter returns a pre-filled deep link/text for the client to open; the notification is marked `handed_off`.

## Data Model

| Entity | Key fields |
|---|---|
| `OutboxEvent` | `id`, `type`, `aggregateType`, `aggregateId`, `aggregateVersion`, `payload: JSON`, `occurredAt`, `dispatchedAt?`, `attempts` |
| `NotificationRule` | `eventType`, `audience: customer\|account_members\|location_operators\|owners`, `channels[]`, `template`, `critical: boolean` |
| `Notification` | `id`, `eventId`, `recipientId`, `recipientRole`, `channel`, `template`, `variables: JSON`, `status: queued\|sent\|handed_off\|failed\|read`, `deliverAfter`, `attempts`, `lastError?`, `createdAt`, `readAt?` |
| `ContactPreference` | `principalId`, `channel`, `address`, `optedIn`, `verifiedAt?` |

```sql
CREATE TABLE outbox_event (
  id TEXT PRIMARY KEY, type TEXT NOT NULL,
  aggregate_type TEXT NOT NULL, aggregate_id TEXT NOT NULL, aggregate_version INTEGER NOT NULL,
  payload JSONB NOT NULL, occurred_at TIMESTAMPTZ NOT NULL,
  dispatched_at TIMESTAMPTZ, attempts INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX outbox_pending_idx ON outbox_event (dispatched_at, occurred_at);
CREATE TABLE notification_rule (
  event_type TEXT NOT NULL, audience TEXT NOT NULL, channels TEXT NOT NULL, -- JSON array
  template TEXT NOT NULL, critical INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (event_type, audience)
);
CREATE TABLE notification (
  id TEXT PRIMARY KEY, event_id TEXT NOT NULL REFERENCES outbox_event(id),
  recipient_id TEXT NOT NULL, recipient_role TEXT NOT NULL, channel TEXT NOT NULL,
  template TEXT NOT NULL, variables JSONB NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('queued','sent','handed_off','failed','read')),
  deliver_after TIMESTAMPTZ NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), read_at TIMESTAMPTZ,
  UNIQUE (event_id, recipient_id, channel)
);
CREATE INDEX notification_feed_idx ON notification (recipient_id, channel, created_at DESC);
CREATE TABLE contact_preference (
  principal_id TEXT NOT NULL, channel TEXT NOT NULL, address TEXT NOT NULL,
  opted_in INTEGER NOT NULL DEFAULT 1, verified_at TIMESTAMPTZ,
  PRIMARY KEY (principal_id, channel)
);
```

## API Contract

| Method & Path | Role(s) | Request | Response | Errors |
|---|---|---|---|---|
| `GET /v1/me/notifications?unread=&cursor=` | any authenticated | `If-None-Match` | `200 { items, unreadCount, nextCursor? }` + `ETag` / `304` | — |
| `POST /v1/me/notifications:mark-read` | any authenticated | `{ ids: string[] } \| { all: true }` | `200 { updated: int }` | — |
| `PUT /v1/me/contact-preferences/{channel}` | any authenticated | `{ address, optedIn }` | `200 ContactPreference` | `422 INVALID_ADDRESS` |
| `PUT /v1/notification-rules/{eventType}/{audience}` | owner | `{ channels[], template, critical }` | `200 NotificationRule` | `400 UNKNOWN_EVENT_TYPE`, `400 UNKNOWN_CHANNEL` |
| `PUT /v1/locations/{id}/quiet-hours` | owner | `{ start: "HH:mm", end: "HH:mm" }` | `200` | `400 INVALID_TIME` |

## Domain Events
Consumes all order/payment/cancellation/calendar events. Emits `NotificationQueued`, `NotificationSent`, `NotificationFailed`, `NotificationRead`.

## Invariants
* An outbox row is written in the same unit of work as the state change that produced the event (no dual writes).
* Delivery is at-least-once to adapters; uniqueness `(event_id, recipient_id, channel)` makes creation exactly-once.
* Notification failure never rolls back or blocks domain transitions.
* Customers only receive notifications about their own orders/accounts; operators only for their scoped locations.

## Codegen Notes
* **Modules**: `core/notifications` (pure: `planNotifications(event, rules, audienceResolver) → NotificationDraft[]`, quiet-hour scheduling), `app/outbox-dispatcher` (polls outbox; Scheduler-triggered).
* **Types**: `type Channel = 'in_app'|'email'|'sms'|'messaging'|'webhook'|'share_link'`; `interface Notifier { channel: Channel; send(n: Notification, contact: ContactPreference): Promise<{ status: 'sent'|'handed_off'; providerRef?: string; link?: string }> }`.
* **Tests to generate**: dedupe on retry; audience scoping; quiet hours across midnight and DST; adapter failure backoff and non-blocking; in-app feed ETag/304; share-link hand-off.

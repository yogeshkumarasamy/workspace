# Spec Delta: innings-break/rainout-cancellation

> Source: [customer PRD US-13](../../../../../../specs/innings-break/customer/prd.md) §3.10 and
> [console PRD US-23](../../../../../../specs/innings-break/console/prd.md) §3.9.

## Purpose

Lets a Team Manager call off a pre-paid Innings Break match order when rain washes out the game. Cancellations at least
1.5 hours before the slot halt kitchen preparation and refund 100% of the order value as Team soft credit. Later
requests go to manual support review.

## ADDED Requirements

### Requirement: Universal 1.5-hour rainout cancellation cutoff
The system SHALL compute an automated rainout cancellation cutoff for every match order as 90 minutes before its
daytime match slot. Cutoffs: 5:00 AM for the 6:30 AM slot, 9:00 AM for the 10:30 AM slot, and 1:00 PM for the 2:30 PM
slot. The same cutoff SHALL apply in the Innings Break app and the Innings Break Console.

#### Scenario: Cutoff for the 6:30 AM slot
- **WHEN** an order is placed for the `6:30 AM Slot`
- **THEN** its automated rainout cancellation cutoff is 5:00 AM on the match date

#### Scenario: Cutoff for the 10:30 AM slot
- **WHEN** an order is placed for the `10:30 AM Slot`
- **THEN** its automated rainout cancellation cutoff is 9:00 AM on the match date

#### Scenario: Cutoff for the 2:30 PM slot
- **WHEN** an order is placed for the `2:30 PM Slot`
- **THEN** its automated rainout cancellation cutoff is 1:00 PM on the match date

### Requirement: Self-service rainout cancellation before the cutoff
Authorized Persona: Team Manager. The Orders page SHALL show a "Cancel Order (Rainout / Match Called Off)" action on
each active order card while at least 1.5 hours remain before the match slot. Using it SHALL move the order to the
`Cancelled (Rainout)` status with zero manual intervention.

#### Scenario: Cancel action visible before cutoff
- **WHEN** the Team Manager views an active order card in the Orders page and the current time is at or before the order's rainout cutoff
- **THEN** the "Cancel Order (Rainout / Match Called Off)" action is available on that card

#### Scenario: Successful rainout cancellation
- **WHEN** the Team Manager taps "Cancel Order (Rainout / Match Called Off)" on an active order before its rainout cutoff
- **THEN** the order status changes to `Cancelled (Rainout)`
- **AND** the order card reflects the cancelled status in the Orders page

### Requirement: Cancellation halts kitchen preparation
Authorized Persona: Business Owner, Operations Manager (Console visibility). A rainout cancellation within the
1.5-hour window SHALL immediately remove the order from the Console's active kitchen prep queue. The cancellation SHALL
be logged in the Console's Cancelled Orders tab and notification stream so staff can see it.

#### Scenario: Order leaves the kitchen prep queue
- **WHEN** a Team Manager cancels an order before its rainout cutoff
- **THEN** the order is no longer part of the active kitchen prep queue for its kitchen hub

#### Scenario: Staff can see the cancellation in the Console
- **WHEN** a rainout cancellation completes
- **THEN** the Business Owner and the Operations Manager of the assigned kitchen hub see the order in the Console's Cancelled Orders tab and notification stream, together with the automated credit issuance

### Requirement: Instant 100% soft credit refund on rainout cancellation
Authorized Persona: Team Manager. A rainout cancellation within the window SHALL instantly deposit 100% of the paid
order value as In-App Soft Credit into the wallet of the Team that placed the order, with zero delay and zero manual
intervention. No cash or bank reversal SHALL be made.

#### Scenario: Full refund to the Team Wallet
- **WHEN** a Team Manager cancels a ₹1,100 paid order before its rainout cutoff
- **THEN** ₹1,100 of soft credit is deposited into that Team's wallet
- **AND** no UPI, cash or bank refund is initiated

#### Scenario: Refund latency
- **WHEN** an automated rainout cancellation completes
- **THEN** the soft credit deposit is recorded in the Team Wallet in under 1 second (customer PRD success metric 3)

### Requirement: Late cancellations escalate to manual support
Authorized Persona: Team Manager. When fewer than 1.5 hours remain before the match slot, the system SHALL disable
self-service cancellation for that order and SHALL route the Team Manager to submit an urgent support grievance ticket
for staff review.

#### Scenario: Cancel action disabled after cutoff
- **WHEN** the Team Manager views an active order card after the order's rainout cutoff has passed
- **THEN** 1-tap rainout cancellation is not available for that order

#### Scenario: Routed to urgent support ticket
- **WHEN** the Team Manager tries to cancel an order with fewer than 1.5 hours remaining before its slot
- **THEN** the app routes them to submit an urgent support grievance ticket for staff review
- **AND** the order status and Team Wallet balance are unchanged

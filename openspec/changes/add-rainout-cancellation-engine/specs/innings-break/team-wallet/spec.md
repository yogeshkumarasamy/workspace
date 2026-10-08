# Spec Delta: innings-break/team-wallet

> Source: [customer PRD US-13](../../../../../../specs/innings-break/customer/prd.md) §3.10, with the wallet entity from
> US-01 and the credit formula from US-10. Cross-reference: [console PRD US-24](../../../../../../specs/innings-break/console/prd.md).

## Purpose

Holds a cricket squad's In-App Soft Credit (rainout refunds and compensations) against the Team entity. It keeps the
balance visible to the Team Manager at all times and applies it automatically to the squad's next pre-order.

## ADDED Requirements

### Requirement: Wallet bound to the Team entity
The Team Soft Credit Wallet (`TeamWallet`) SHALL belong to the Team entity, not to an individual Team Manager record.
The balance SHALL stay with the squad when Team Managers rotate across matches or seasons.

#### Scenario: Balance survives Team Manager rotation
- **WHEN** a different Team Manager places the next order for the same Team
- **THEN** the Team's existing soft credit balance is available to that order

### Requirement: Persistent wallet balance in the header
Authorized Persona: Team Manager. The app SHALL show the current Team Soft Credit Wallet balance (₹ INR) as a
persistent header pill (for example `🪙 ₹500 Team Credit`) on the Calendar, Menu, Orders and Profile screens.

#### Scenario: Header pill on primary screens
- **WHEN** the Team Manager opens the Calendar, Menu, Orders or Profile screen
- **THEN** the header shows the Team's current soft credit balance in ₹

#### Scenario: Real-time update after a rainout refund
- **WHEN** a rainout cancellation deposits soft credit into the Team Wallet
- **THEN** the header wallet pill and the Team Profile wallet balance update immediately to the new balance

### Requirement: Wallet ledger on the Team Profile tab
Authorized Persona: Team Manager. The Team Profile tab SHALL show a wallet ledger listing credit deposits (rainouts and
grievance compensations) and redemptions, each with its timestamp.

#### Scenario: Deposit appears in the ledger
- **WHEN** the Team Manager opens the Team Profile tab after a rainout refund
- **THEN** the ledger lists the deposit with its amount and timestamp

#### Scenario: Redemption appears in the ledger
- **WHEN** soft credit is applied to a new order at checkout
- **THEN** the ledger lists the redemption with its amount and timestamp

### Requirement: Automatic credit deduction at checkout
Authorized Persona: Team Manager. On the next pre-order, the system SHALL automatically apply the wallet balance to the
cart total. Applied Credit = min(WalletBalance, OrderTotal), and Payable UPI Amount = OrderTotal − Applied Credit.

#### Scenario: Wallet covers the full order
- **WHEN** the Team Wallet balance is greater than or equal to the order total at checkout
- **THEN** the payable UPI amount is ₹0
- **AND** the order confirms with one click without launching a UPI payment

#### Scenario: Wallet covers part of the order
- **WHEN** the Team Wallet balance is ₹500 and the order total is ₹1,100
- **THEN** ₹500 of soft credit is applied, leaving a wallet balance of ₹0
- **AND** the Team Manager is prompted to pay only ₹600 via UPI

#### Scenario: Empty wallet
- **WHEN** the Team Wallet balance is ₹0 at checkout
- **THEN** no credit is applied and the full order total is payable via UPI

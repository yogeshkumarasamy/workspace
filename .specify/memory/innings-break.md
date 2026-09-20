# Innings Break Project Memory

> **Purpose**: High-level vision, domain knowledge, and product concept for the Innings Break ecosystem.

---

## 1. Executive Summary
**Innings Break** is a platform designed to provide cricket enthusiasts with real-time match engagement, live tracking, and related experiences, supported by an internal operations dashboard and a centralized API service.

---

## 2. Planned Ecosystem Components
1. **Innings Break Visitor App** (`apps/innings-break-web`):
   * Public-facing web application consumed by fans and end-users.
   * Primary role: Viewing matches, live scores, commentary, and platform content.
2. **Innings Break Ops Dashboard** (`apps/innings-break-ops`):
   * Internal operations dashboard for providers and administrators.
   * Primary role: Managing matches, updating scores, overseeing platform data, and facilitating what visitors see.
3. **Innings Break API Service** (`apps/innings-break-api`):
   * Central backend service built with Node.js and Express.
   * Primary role: Serving data, handling business logic, and orchestrating state for both the visitor app and the ops dashboard.

---

## 3. Brain Dump & Evolution Notes
* *This section will capture raw notes, ideas, and decisions from ongoing discussions before carving out specific features into `specs/innings-break/`.*

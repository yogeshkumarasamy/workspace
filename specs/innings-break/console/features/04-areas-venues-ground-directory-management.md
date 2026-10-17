> ← Back to [PRD: Innings Break Console — Index](file:///specs/innings-break/console/prd.md)

# 3.4 Areas, Venues & Ground Directory Management

* **US-10**: As a Business Owner, I want a dedicated Areas Management grid with full CRUD capabilities, geolocation coordinates, and optional Google Maps integration, so that I can independently create, view, edit, update, delete, and toggle the active status of delivery and locality areas.
  * **Requirement (Independent Area Creation Form)**:
    - Dedicated **"+ Add Area"** modal / button.
    - Creation form captures strictly:
      1. **Area Name** (*Mandatory* — e.g., *Velachery*, *Mylapore*, *Porur*, *Thoraipakkam*, *OMR*)
      2. **Latitude** (*Mandatory* — Decimal GPS coordinate, e.g. `12.9815`)
      3. **Longitude** (*Mandatory* — Decimal GPS coordinate, e.g. `80.2180`)
      4. **Google Maps Link / URL** (*Optional* — Direct Google Maps pin or place URL for quick verification)
      5. **Initial Status**: Defaults to `Active` (toggleable to `Inactive`).
    - *No unnecessary dependencies or nested mappings required.*
  * **Requirement (Interactive Areas Data Grid & Read View)**:
    - Business Owner views all created Areas in a responsive, searchable, and sortable **Data Grid**.
    - Grid columns display:
      - **Area Name**
      - **Latitude & Longitude** (Decimal GPS coordinates with click-to-copy)
      - **Google Maps Link** (Clickable icon opening Google Maps in a new tab if URL provided)
      - **Status Badge** (`🟢 Active` vs `⚪ Inactive`)
      - **Created & Last Updated Timestamps**
      - **Row Actions**: `Edit`, `Toggle Active/Inactive`, `Delete`.
  * **Requirement (Edit & Update Area)**:
    - Clicking **Edit** opens a pre-populated modal allowing the Business Owner to update Area Name, Latitude, Longitude, and Google Maps URL.
    - Saving changes instantly updates the record and synchronizes across customer locality search services.
  * **Requirement (Area Status Toggle)**:
    - Direct status toggle in each grid row to flip status between `Active` and `Inactive`.
    - `Active`: Area is discoverable and available for backend API spatial proximity lookups and customer ground search.
    - `Inactive`: Area is disabled from locality search, while preserving historical records.
  * **Requirement (Delete Area & Data Integrity Guard)**:
    - Dedicated **Delete** action with a confirmation dialog.
    - **Integrity Guard**: Business Owner is prompted with a confirmation dialog before permanent deletion. Alternatively, the Business Owner can set the Area to `Inactive` to remove it from customer search without deleting records.

* **US-11**: As a Business Owner, I want a dedicated Venue Management CRUD Data Grid with geolocation coordinates, Google Maps URL, media assets (photos and video walkthrough URLs), and venue taxonomy (Standalone vs Multi-Complex), so that I can independently create, view, edit, delete, and toggle venue operations.
  * **Requirement (Independent Venue Creation Form)**:
    - Dedicated **"+ Add Venue"** button / modal (completely independent from Area creation; no forced mapping required).
    - Creation form captures strictly:
      1. **Venue Name** (*Mandatory* — e.g., *Marina Cricket Arena*, *St. Bedes Sports Ground*, *YMCA Nandanam Sports Complex*)
      2. **Venue Type** (*Mandatory*):
         - `Standalone Venue` (single standalone pitch/ground facility)
         - `Multi-Complex Venue` (sports complex housing multiple pitches, grounds, practice nets, or turfs)
      3. **Latitude** (*Mandatory* — Decimal GPS coordinate, e.g. `13.0475`)
      4. **Longitude** (*Mandatory* — Decimal GPS coordinate, e.g. `80.2825`)
      5. **Google Maps Link / URL** (*Optional* — Direct Google Maps pin or place link)
      6. **Media Assets & Meta Details** (*Optional*):
         - **Venue Cover Photo / Photo Gallery** (image uploads)
         - **Video Walkthrough URL** (YouTube / video link for courier and team ground orientation)
         - **Venue Description & Landmark Notes**
      7. **Initial Status**: Defaults to `Active` (toggleable to `Inactive`).
  * **Requirement (Interactive Venue Data Grid & Read View)**:
    - Business Owner views all created Venues in a responsive, searchable, and filterable **Data Grid**.
    - Grid columns display:
      - **Media Thumbnail** (Cover photo thumbnail + video icon if URL exists)
      - **Venue Name**
      - **Venue Type Badge** (`Standalone Venue` vs `Multi-Complex Venue`)
      - **Delivery Serviceability Badge**: Real-time Haversine distance indicator against the active Kitchen Hub (`🟢 Deliverable (7.2 km from Hub)` vs `⚪ Out of Range (14.5 km)`), allowing the Business Owner to instantly verify if a venue is within operational reach.
      - **Latitude & Longitude** (Decimal GPS coordinates with click-to-copy)
      - **Google Maps Link** (Clickable icon opening Google Maps in a new tab if URL provided)
      - **Pitches & Facilities Count** (Count of configured grounds, nets, and turfs)
      - **Status Badge** (`🟢 Active` vs `⚪ Inactive`)
      - **Created & Last Updated Timestamps**
      - **Row Actions**: `View / Manage Grounds`, `Edit Venue`, `Toggle Active/Inactive`, `Delete Venue`.
  * **Requirement (Edit & Update Venue)**:
    - Clicking **Edit** opens a pre-populated modal allowing the Business Owner to update Venue Name, Venue Type, GPS coordinates, Google Maps link, photos, video walkthrough URL, and description.
    - Saving changes immediately synchronizes across ground listings and pre-order catalogs.
  * **Requirement (Venue Status Toggle)**:
    - Direct status toggle on each grid row to flip status between `Active` and `Inactive`.
    - `Active`: Venue is discoverable and available for team match pre-orders.
    - `Inactive`: Venue and all its nested pitches are temporarily hidden from customer discovery while preserving all historical match and order records.
  * **Requirement (Delete Venue & Data Integrity Guard)**:
    - Dedicated **Delete** action with a confirmation dialog.
    - **Integrity Guard**: System blocks deletion if active grounds with unfulfilled or past match orders are mapped to the Venue, requiring the Business Owner to set the Venue to `Inactive` instead. Completely unlinked empty venues can be permanently deleted.

* **US-12**: As a Business Owner, I want to drill down into any created Venue to add, configure, and manage diverse facility types (Leather Ball Grounds with wicket surfaces, Tennis Ball Grounds, and Cricket Practice Nets) with gate delivery notes and pitch coordinates, so that courier dispatchers and squads have exact pitch-level drop-off precision.
  * **Requirement (Venue-to-Ground Drill-Down Flow)**:
    - Clicking on any Venue row in the grid opens the **Venue Facilities & Pitch Management** sub-panel.
    - Dedicated **"+ Add Ground / Facility"** action within the selected Venue.
  * **Requirement (Comprehensive Facility Type Taxonomy — Full Console Cataloging)**:
    - Facility Type selection:
      1. **`Leather Ball Cricket Ground`**
         - **Wicket Surface Taxonomy**: `Leather Turf Wicket` | `Concrete Matting Wicket` | `Astro Turf Wicket` | `Cement Wicket`
      2. **`Tennis Ball Cricket Ground`** (Box cricket turf / tennis ball match ground)
         - **Surface Taxonomy**: `Synthetic Astro Turf` | `Concrete / Rubberized` | `Natural Clay / Sand`
      3. **`Cricket Practice Nets`**
         - **Net Type**: `Turf Practice Net` | `Matting Practice Net` | `Astro Net Cage`
  * **Requirement (MVP Customer Pre-Ordering Scope Enforcement)**:
    - In the Console, the Business Owner has full CRUD management across all three facility types (`Leather Ball`, `Tennis Ball`, `Practice Nets`).
    - In the `Innings Break` customer app, pre-ordering is enabled strictly for **Leather Ball Cricket Grounds** (`Turf Wicket` and `Matting Wicket`). Tennis Ball grounds and Practice Nets are cataloged in the directory with an *"Ordering Disabled for MVP / Leather Ball Matches Only"* status badge.
  * **Requirement (Facility Creation Form Fields)**:
    - Ground / Facility creation captures:
      1. **Ground / Facility Name** (e.g., *Ground #1 (Centre Turf)*, *Ground #2 (South Matting)*, *Practice Net Cage A*, *Box Cricket Turf 1*)
      2. **Facility Category & Surface Taxonomy**
      3. **Delivery Gate & Pavilion Notes** (*Mandatory* — e.g., *"Enter Gate 4 opposite Lighthouse. South pavilion near net 2."*)
      4. **Pitch GPS Coordinates (`Latitude`, `Longitude`)**: Optional specific pitch coordinates. If omitted, automatically inherits the parent Venue's common latitude and longitude.
      5. **Status Toggle**: `Active` / `Inactive` per ground/facility.
  * **Requirement (Facility List & Management Sub-Grid)**:
    - Displays all grounds, nets, and turfs under the parent Venue in a dedicated list with individual status toggles, edit actions, and delete options.

* **US-13**: As a Business Owner, I want full status control across all entities (Areas, Venues, Grounds), so that any facility undergoing maintenance or renovation can be toggled Inactive instantly without deleting historical match orders.

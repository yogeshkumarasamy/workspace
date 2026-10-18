> ← Back to [PRD: Innings Break Customer App (Team Manager App) — Index](file:///specs/innings-break/customer/prd.md)

# 3.5 Menu Browsing, In-House Sports Nutrition & Per-Item Player Assignment

* **US-07**: As a Team Manager, I want to browse freshly prepared in-house sports nutrition items with nutritional facts and dietary tags, so that I can choose wholesome refreshments tailored for my players.
  * **Requirement (In-House Sports Nutrition Catalog)**:
    - Organized across 5 standardized categories:
      1. **Beverages & Hydration**: Cold-Pressed Juices (Watermelon, Pomegranate, Orange), Tender Coconut Water, Lemon-Mint Electrolyte Coolers.
      2. **Fresh Cut Fruit Bowls**: Hydrating seasonal fruits (Papaya, Watermelon, Pineapple, Muskmelon).
      3. **High Protein Power Snacks**: Boiled Egg Duos with crushed pepper, Sprouts & Peanut chaat, Paneer protein cubes.
      4. **Energy Bites & Fuel**: Dates & nut energy balls, Roasted chana, Banana bundles.
      5. **Team Meals & Porridges**: Fresh Millet / Ragi porridge (Koozh), Curd Rice with pomegranate, Whole-Wheat veggie rolls.
  * **Requirement (Nutritional Breakdown & Dietary Badges)**:
    - Each item card displays:
      - High-resolution photo and item name.
      - Dietary Flag: `🟢 Veg`, `🔴 Non-Veg`, `🟡 Egg`.
      - Nutritional Badges: Calories (kcal), Protein (g), Carbohydrates (g), Electrolytes.
      - Kitchen Prep Notes: 100% freshly prepared in-house; zero refined sugars.
      - Unit Price (₹ INR).
      - Kitchen Hub Stock Badge (`In Stock` vs `Sold Out`).

* **US-08**: As a Team Manager, I want the flexibility to either place a blind bulk squad order or assign specific players from our match squad to individual recipes via a multi-select checkbox interface (supporting 11 players up to 13 players with domestic Super Subs), so that choosy player preferences are tracked effortlessly and there is zero post-match confusion over who ordered what at the ground.
  * **Requirement (Dual Ordering Modes: Blind Bulk vs Per-Item Player Assignment)**:
    - **Mode A: Blind Bulk Ordering**:
      - For managers placing a uniform squad order (e.g., 11 juices and 11 porridges for everyone).
      - Manager uses standard quantity steppers (`+` / `-`) or Smart Squad Multiplier buttons.
    - **Mode B: Per-Item Player Assignment (Granular Squad Mapping)**:
      - For squads with specific individual player dietary preferences (e.g., 4 players want Watermelon Juice, 3 want Ragi Porridge, 4 want Boiled Eggs, 2 want Tender Coconut).
      - Underneath each menu recipe card, an expandable **"Assign Squad Members"** drawer/panel displays all curated players from the match squad with individual checkboxes.
  * **Requirement (Checkbox Multi-Select UI & Auto-Quantity Synchronization)**:
    - Displays:
      - **"Select All Squad"** master checkbox (1-tap selects all curated players).
      - **Individual Player Checkbox List** (displays player names from the curated squad).
    - Tapping checkboxes instantly updates the item's order quantity to match the exact number of checked players:
      $$\text{Item Quantity} = \text{Count of Checked Players}$$
    - Selected player names are attached to the line item in the order schema (e.g., `item_id: "watermelon-juice", assigned_players: ["Dinesh", "Rahul", "Karthik", "Yogesh"]`).
  * **Requirement (Domestic Cricket Squad Sizing — Up to 13 Players with 2 Super Subs)**:
    - While traditional cricket is 11 players, Chennai domestic cricket leagues routinely permit **2 Super Subs (Impact players / tactical substitutes)**, allowing squads of **up to 13 players** (or up to 15 with full bench reserves).
    - Quick Squad Multiplier shortcuts:
      - **`+1`** (Individual unit)
      - **`+11 (Traditional XI)`** (Full Playing 11)
      - **`+13 (XI + 2 Super Subs)`** (Standard domestic cricket match squad)
      - **`+15 (Squad + Reserves)`** (Complete touring squad)
    - Dynamic Bundles (Team Packs) can also be assigned across the full 11 or 13-player squad with 1 tap.
  * **Requirement (Itemized Squad Accountability on Digital Invoice & WhatsApp Share)**:
    - All assigned player mappings are permanently recorded on the placed order.
    - The digital invoice copy and the **"Share to WhatsApp"** text explicitly itemize player assignments per dish (e.g., *"Cold-Pressed Watermelon Juice x 4 [Dinesh, Rahul, Karthik, Yogesh]"*), completely eliminating manager guesswork during on-ground distribution.

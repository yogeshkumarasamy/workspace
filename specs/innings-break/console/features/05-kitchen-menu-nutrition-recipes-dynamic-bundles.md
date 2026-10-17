> ← Back to [PRD: Innings Break Console — Index](file:///specs/innings-break/console/prd.md)

# 3.5 Kitchen Menu, Nutrition, Recipes & Dynamic Bundles

* **US-14**: As a Business Owner, I want to create in-house recipe menu items with nutritional facts, and allow kitchen staff to manage availability per Kitchen Hub, so that menu items are centrally standardized while stock is locally controlled.
  * **Requirement**: Menu items created centrally by Business Owner with:
    - Item Name (e.g., *"Cold-Pressed Watermelon Juice"*, *"Boiled Egg Duo with Pepper"*, *"Millet / Ragi Porridge"*, *"Whole-Wheat Sandwich"*)
    - Description & In-House Kitchen Prep Notes
    - Nutritional Profile: Calories (kcal), Protein (g), Carbohydrates (g), Fats (g), Key Minerals/Electrolytes
    - Dietary Tag: `🟢 Veg`, `🔴 Non-Veg`, `🟡 Egg`
    - Category: `Beverages & Hydration`, `Fresh Cut Fruits`, `High Protein Power Snacks`, `Energy Bites`, `Team Meals` (e.g., Porridges, Rice packs)
    - Unit Price (₹ INR)
    - Item Photo (image upload)
  * **Requirement (Kitchen-Level Availability)**: Operations Managers and Business Owner can toggle item availability (`Active / In Stock` vs. `Inactive / Sold Out`) specific to their Kitchen Hub.

* **US-15**: As a Business Owner or Operations Manager, I want to build and publish Dynamic Bundles / Team Packs from available menu items, so that Team Managers can order pre-curated squad combos.
  * **Requirement**: Dynamic Bundle Builder allows selecting any active items, defining item quantities per bundle (e.g., 11x Juices + 11x Porridges + 11x Bananas), setting a bundled package price (₹ INR), uploading a bundle photo, and publishing it directly as an orderable pack.

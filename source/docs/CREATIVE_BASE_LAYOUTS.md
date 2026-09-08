# Creative base layouts

Base Layout States includes a **Generate a new randomized layout** group on every open map:

- Starter Hideaway: one compact service yard with light defenses.
- Caravan Depot: two offset logistics yards along a diagonal.
- Crescent Defense: a rear service yard and two forward wings around an open approach.
- Longfront: four staggered positions across a broad front.
- Capital Compound: five command, logistics and defense areas around an open interior.
- Relay Watch: compact supply post and detached watch station.
- Split Gatehouse: paired shoulders and rear logistics around a wide entrance.
- Trident Reach: three forward prongs supported by a rear command yard.
- Sheltered Harbor: bent chain of yards around a vehicle court.
- Fortress Archipelago: six scattered positions, including two supply hubs.
- Roadside Workshop: compact services with close gun protection.
- Crossfire Posts: offset gun-heavy positions with rear services.
- Switchback Supply: diagonal supply stops leading to a missile outpost.
- Iron Anvil: broad flak-heavy shoulders and forward gun positions.
- Citadel Necklace: seven perimeter yards around an open interior.

Select a style again to generate another arrangement. Site positions, unit budgets, support choices and individual placements vary. Teams receive rotationally mirrored formations. Each result becomes a separate layout through the normal undoable editor action; previous layouts and terrain remain intact. The seed and generator version are recorded in the layout metadata.

The generator tries up to 24 candidates, using the longer terrain axis for opposing bases. Structures retain their original scale. Model clearance, map bounds, slope and provisional power checks must pass before a layout is added. Large styles can fail on small or uneven maps; no terrain is leveled automatically.

Power uses the smaller of the map setting and 280 units, with the existing 10-unit validation margin. Backup activation and combat ranges remain unverified. Darklights provide partial coverage, not guaranteed concealment of the entire base. Access routes, terrain sightlines, explosions and combat balance need in-game testing.

Validation: 12 seeds per style (120 total), with repeatability, varied counts/positions, rotational pairing, power and source preservation checks. Tiny-map rejection and original built-in layouts are also tested. Type checking and the desktop build passed. The five v2 styles passed native dropdown, preservation, export and Undo checks; see CREATIVE_BASE_CRITIC_V2.md. In-game acceptance remains pending.

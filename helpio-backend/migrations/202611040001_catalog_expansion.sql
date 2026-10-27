-- Home services catalogue, expanded from 7 categories × 4 skills to 14 categories. Existing ids are kept so
-- saved provider skills stay valid; nothing is deleted (provider_skills references skills ON DELETE RESTRICT).
-- Fridge repair and the old electrical "Appliance repair" move to the new Appliance repair category.

INSERT INTO catalog_categories (id, name, icon, sort_order) VALUES
    ('plumbing', 'Plumbing', 'wrench', 1),
    ('electrical', 'Electrical', 'zap', 2),
    ('cleaning', 'Cleaning', 'sparkles', 3),
    ('painting', 'Painting', 'paint', 4),
    ('ac', 'AC Repair', 'snowflake', 5),
    ('appliance', 'Appliance repair', 'washing', 6),
    ('water', 'Water purifier & geyser', 'droplet', 7),
    ('carpentry', 'Carpentry', 'hammer', 8),
    ('moving', 'Moving', 'truck', 9),
    ('pest', 'Pest control', 'bug', 10),
    ('handyman', 'Handyman', 'drill', 11),
    ('masonry', 'Masonry & tiling', 'brick', 12),
    ('gardening', 'Gardening', 'sprout', 13),
    ('security', 'Home security & smart home', 'cctv', 14)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, icon = EXCLUDED.icon, sort_order = EXCLUDED.sort_order;

INSERT INTO catalog_skills (id, category_id, name, sort_order) VALUES
    ('plumbing-tap-leak', 'plumbing', 'Tap & leak repair', 1),
    ('plumbing-pipe-blockage', 'plumbing', 'Pipe fitting & blockage', 2),
    ('plumbing-bathroom-fittings', 'plumbing', 'Bathroom fittings', 3),
    ('plumbing-water-tank', 'plumbing', 'Water tank cleaning', 4),
    ('plumbing-toilet-flush', 'plumbing', 'Toilet & flush repair', 5),
    ('plumbing-drain-cleaning', 'plumbing', 'Drain cleaning', 6),
    ('plumbing-motor-pump', 'plumbing', 'Water motor & pump', 7),

    ('electrical-wiring', 'electrical', 'Wiring & switchboards', 1),
    ('electrical-fan-light', 'electrical', 'Fan & light installation', 2),
    ('electrical-inverter', 'electrical', 'Inverter & battery', 3),
    ('electrical-mcb-fuse', 'electrical', 'MCB & fuse box', 4),
    ('electrical-power-points', 'electrical', 'New power points', 5),
    ('electrical-decor-lighting', 'electrical', 'Decorative lighting', 6),

    ('cleaning-deep-home', 'cleaning', 'Deep home cleaning', 1),
    ('cleaning-bathroom', 'cleaning', 'Bathroom cleaning', 2),
    ('cleaning-kitchen', 'cleaning', 'Kitchen cleaning', 3),
    ('cleaning-sofa-carpet', 'cleaning', 'Sofa & carpet cleaning', 4),
    ('cleaning-move-in-out', 'cleaning', 'Move-in / move-out cleaning', 5),
    ('cleaning-window-glass', 'cleaning', 'Window & glass cleaning', 6),
    ('cleaning-mattress', 'cleaning', 'Mattress cleaning', 7),

    ('painting-interior', 'painting', 'Interior painting', 1),
    ('painting-exterior', 'painting', 'Exterior painting', 2),
    ('painting-waterproofing', 'painting', 'Waterproofing', 3),
    ('painting-wood-polish', 'painting', 'Wood polish', 4),
    ('painting-texture-stencil', 'painting', 'Texture & stencil', 5),
    ('painting-wallpaper', 'painting', 'Wallpaper installation', 6),

    ('ac-service', 'ac', 'AC service', 1),
    ('ac-installation', 'ac', 'AC installation & uninstall', 2),
    ('ac-gas-refill', 'ac', 'Gas refill', 3),
    ('ac-not-cooling', 'ac', 'AC not cooling repair', 4),
    ('ac-window-service', 'ac', 'Window AC service', 5),
    ('ac-air-cooler', 'ac', 'Air cooler repair', 6),

    ('ac-fridge-repair', 'appliance', 'Refrigerator repair', 1),
    ('appliance-washing-machine', 'appliance', 'Washing machine repair', 2),
    ('appliance-microwave', 'appliance', 'Microwave repair', 3),
    ('appliance-chimney-hob', 'appliance', 'Chimney & hob repair', 4),
    ('appliance-tv', 'appliance', 'TV repair', 5),
    ('electrical-appliance', 'appliance', 'Small appliance repair', 6),

    ('water-ro-installation', 'water', 'RO installation', 1),
    ('water-ro-service', 'water', 'RO service & filter change', 2),
    ('water-geyser-installation', 'water', 'Geyser installation', 3),
    ('water-geyser-repair', 'water', 'Geyser repair', 4),
    ('water-softener', 'water', 'Water softener', 5),

    ('carpentry-furniture-assembly', 'carpentry', 'Furniture assembly', 1),
    ('carpentry-door-window', 'carpentry', 'Door & window repair', 2),
    ('carpentry-modular-kitchen', 'carpentry', 'Modular kitchen', 3),
    ('carpentry-custom-furniture', 'carpentry', 'Custom furniture', 4),
    ('carpentry-furniture-repair', 'carpentry', 'Furniture repair', 5),
    ('carpentry-lock-handle', 'carpentry', 'Lock & handle fitting', 6),

    ('moving-home-shifting', 'moving', 'Home shifting', 1),
    ('moving-packing', 'moving', 'Packing & unpacking', 2),
    ('moving-mini-truck', 'moving', 'Mini truck transport', 3),
    ('moving-loading-labour', 'moving', 'Loading & unloading', 4),
    ('moving-office-shifting', 'moving', 'Office shifting', 5),
    ('moving-vehicle-transport', 'moving', 'Bike & car transport', 6),

    ('pest-general', 'pest', 'General pest control', 1),
    ('pest-cockroach', 'pest', 'Cockroach control', 2),
    ('pest-termite', 'pest', 'Termite treatment', 3),
    ('pest-bed-bug', 'pest', 'Bed bug treatment', 4),
    ('pest-mosquito', 'pest', 'Mosquito control', 5),
    ('pest-rodent', 'pest', 'Rodent control', 6),

    ('handyman-tv-mounting', 'handyman', 'TV wall mounting', 1),
    ('handyman-curtain-blind', 'handyman', 'Curtain & blind fitting', 2),
    ('handyman-shelf-frame', 'handyman', 'Shelf & frame mounting', 3),
    ('handyman-bathroom-accessories', 'handyman', 'Mirror & bathroom accessories', 4),
    ('handyman-small-repairs', 'handyman', 'Small home repairs', 5),

    ('masonry-tile-installation', 'masonry', 'Tile installation', 1),
    ('masonry-tile-repair', 'masonry', 'Tile repair & grouting', 2),
    ('masonry-plastering', 'masonry', 'Wall plastering', 3),
    ('masonry-false-ceiling', 'masonry', 'False ceiling', 4),
    ('masonry-stone-flooring', 'masonry', 'Marble & granite flooring', 5),
    ('masonry-civil-repairs', 'masonry', 'Small civil repairs', 6),

    ('gardening-maintenance', 'gardening', 'Garden maintenance', 1),
    ('gardening-lawn-mowing', 'gardening', 'Lawn mowing', 2),
    ('gardening-plant-care', 'gardening', 'Plant care & potting', 3),
    ('gardening-balcony-setup', 'gardening', 'Balcony garden setup', 4),
    ('gardening-tree-trimming', 'gardening', 'Tree trimming', 5),

    ('security-cctv', 'security', 'CCTV installation', 1),
    ('security-video-doorbell', 'security', 'Video doorbell', 2),
    ('security-smart-lock', 'security', 'Smart lock installation', 3),
    ('security-wifi-network', 'security', 'Wi-Fi & network setup', 4),
    ('security-smart-home', 'security', 'Smart home devices', 5)
ON CONFLICT (id) DO UPDATE SET category_id = EXCLUDED.category_id, name = EXCLUDED.name, sort_order = EXCLUDED.sort_order;

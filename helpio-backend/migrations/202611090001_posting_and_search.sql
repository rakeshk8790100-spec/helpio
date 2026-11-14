-- Faster posting and search: the job keeps the customer's flat/street line (shown only to the hired pro), and
-- catalog categories and skills get search words, so "plumber", "maid" or "bijli" find the right pros.

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS address_line text;
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_address_line_check;
ALTER TABLE jobs ADD CONSTRAINT jobs_address_line_check CHECK (char_length(address_line) <= 300);

ALTER TABLE catalog_categories ADD COLUMN IF NOT EXISTS keywords text NOT NULL DEFAULT '';
ALTER TABLE catalog_skills ADD COLUMN IF NOT EXISTS keywords text NOT NULL DEFAULT '';

UPDATE catalog_categories c SET keywords = v.keywords FROM (VALUES
    ('plumbing', 'plumber nal tap leak leakage pipe drain toilet flush sink basin'),
    ('electrical', 'electrician electricity bijli wiring switch socket fan light bulb mcb fuse short circuit power'),
    ('cleaning', 'cleaner maid bai housekeeping safai sweeping mopping dusting'),
    ('painting', 'painter paint putty wall colour color whitewash polish'),
    ('ac', 'ac aircon air conditioner split cooling'),
    ('appliance', 'fridge refrigerator washing machine microwave oven tv television chimney'),
    ('water', 'ro purifier aquaguard geyser heater'),
    ('carpentry', 'carpenter furniture door wardrobe almirah bed cupboard hinge'),
    ('moving', 'movers packers shifting relocation tempo truck'),
    ('pest', 'pest cockroach termite bedbug mosquito rat fumigation'),
    ('handyman', 'handyman odd jobs drill mount curtain'),
    ('masonry', 'mason tiles tile plaster cement grout'),
    ('gardening', 'gardener mali plants lawn garden'),
    ('security', 'cctv camera smart lock doorbell alarm wifi')
) AS v(id, keywords) WHERE c.id = v.id;

UPDATE catalog_skills s SET keywords = v.keywords FROM (VALUES
    ('plumbing-water-tank', 'tanki'),
    ('plumbing-toilet-flush', 'commode wc'),
    ('plumbing-motor-pump', 'motor'),
    ('electrical-inverter', 'ups battery'),
    ('ac-gas-refill', 'gas recharge'),
    ('ac-not-cooling', 'cooling'),
    ('cleaning-deep-home', 'full house'),
    ('pest-rodent', 'rat mice'),
    ('handyman-tv-mounting', 'tv'),
    ('security-wifi-network', 'internet router')
) AS v(id, keywords) WHERE s.id = v.id;

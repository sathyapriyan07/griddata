-- Add unique constraints for idempotent upserts

-- Qualifying: one result per driver per race
ALTER TABLE qualifying_results ADD CONSTRAINT qualifying_results_race_driver_unique UNIQUE (race_id, driver_id);

-- Pit stops: unique by race, driver, and stop number
ALTER TABLE pit_stops ADD CONSTRAINT pit_stops_race_driver_stop_unique UNIQUE (race_id, driver_id, lap, stop_number);

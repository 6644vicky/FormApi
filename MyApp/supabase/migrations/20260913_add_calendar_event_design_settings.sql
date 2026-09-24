-- Per-event booking page theming, set from the Design tab's Customize panel:
--   {"textColor":"#27272A","buttonsColor":"#27272A","fontFamily":"Inter", ...}
-- A null column means "every setting at its default", which is what every
-- event created before this migration gets — and the defaults mirror how the
-- booking page already looks, so nothing changes for them.
alter table calendar_events add column if not exists design_settings jsonb;

notify pgrst, 'reload schema';

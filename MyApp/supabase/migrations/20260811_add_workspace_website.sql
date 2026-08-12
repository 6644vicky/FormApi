-- Workspace website link, collected during the mandatory first-login
-- onboarding flow (see app/components/OnboardingModal.tsx). Nullable since
-- existing workspaces created before this column existed don't have one.
alter table workspace_agents add column if not exists website text;

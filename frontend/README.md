AIX final UI polish files

Replace these files in the frontend:
- components/WeightingPanel.tsx
- components/PublishPanel.tsx
- components/IndexWorkspaceShell.tsx
- app/globals.css

Changes:
- compact weighting rows
- separate Validate and Publish experiences
- Previous / Continue navigation
- retains the workflow density styling

Then run:
npm run lint
npm run build

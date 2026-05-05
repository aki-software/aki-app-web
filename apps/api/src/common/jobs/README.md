# Jobs scaffolding

This folder defines job payload types and names for the mail/pdf/report queueing flow.

Phase 0 keeps these as TypeScript-only contracts. Phase 1 will introduce concrete
queue adapters and job processors that consume these types.

Next steps (planned):
- add queue adapter implementations (BullMQ or similar)
- implement job handlers for mail, pdf generation, and report dispatch
- wire orchestrator services to enqueue instead of running inline

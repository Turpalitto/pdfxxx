# Decisions

<!-- PROJECT-MEMORY-KIT:GENERATED -->
Record only important decisions using the ADR format in `memory/decisions/` or below.

## ADR-001 — Project Memory protocol

Status: Accepted
Date: 2026-09-14

### Context
Agents need a portable, project-local continuity layer.

### Decision
Use Markdown, JSON, Git, and the local stdlib-only Project Memory Kit.

### Why
Readable, portable, dependency-light, and independent of external LLM APIs.

### Alternatives considered
External vector/database memory; rejected for the initial implementation.

### Consequences
Agents must follow the repository protocol and keep summaries concise.

## ADR-09211209 — Recorded decision

Status: Accepted
Date: 2026-09-21

### Decision

Preserved existing palette and registry; no architecture or PDF-processing changes

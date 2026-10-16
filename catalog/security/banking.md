---
name: banking
pack: security
always: false
triggers: [bank, banks, banking, fintech, financial, payments, ledger, RBI, DORA, FFIEC, OSFI, APRA, PRA, FCA]
---

# Banking readiness

Load only for an explicit banking/regulatory task or the mapped project's `routing.domains: [banking]` context metadata with relevant work. Ecommerce payments or ledger code alone do not classify a project as banking. Atomic money, retry and ledger rules can still apply to non-bank software without loading this pack. Never infer a project's domain from sibling notes or incidental mentions in its context body.

Assess both bank-internal developer tooling and software handling financial transactions. Establish jurisdiction, regulated entity, deployment, data classification, criticality and outsourcing role first. A repository review cannot certify an institution or substitute for operational evidence. Mark each control demonstrated, gap, unverified, or not applicable with a reason; never infer readiness from coverage or a loaded skill.

## Developer tooling

Map host identity/permissions, project isolation, agent/MCP trust boundaries, external model/vendor egress, source/prompt/transcript retention and data residency. A local project jail is not multi-user authorization. Enforce least privilege, approved endpoints/dependencies, controlled upgrades, signed/provenanced releases, reproducible inventories/SBOM, vulnerability SLAs and separation of release duties. Treat repositories, skills, caches and tool output as untrusted input. Test traversal, symlink/race attacks, prompt injection, unauthorized cleanup, cancellation and bounded resources.

Apply security/logging to every diagnostic and test artifact. Require recoverable and attributable changes, protected audit records, restore exercises, incident ownership and documented RTO/RPO. Collect external evidence for endpoint encryption, IAM, KMS, SIEM, vendor contracts, penetration tests and recovery drills instead of inventing controls absent from the repository.

Retrieve atomic controls lazily through `graph_traverse`: `rule:shared-sec-project-scope`, `rule:shared-sec-filesystem-containment` and, when mandatory audit is in scope, `rule:shared-obs-mandatory-audit`. These controls apply across languages; language adapters reference them rather than copying the invariant.

## Financial software

Use exact monetary units/decimal arithmetic with explicit currency, scale and rounding. Enforce balanced ledger entries, immutable postings with compensating reversals, atomic authorization/posting, reconciliation and auditable state transitions. Test duplicates, idempotency-key payload mismatch, retry after timeout, replay, partial failure, race/double-spend, webhook authenticity, out-of-order delivery, settlement cutoffs, holidays, time zones and currency conversion. Do not promise distributed exactly-once delivery; prove the business invariant under at-least-once delivery.

For the specific operation under review, retrieve `rule:shared-data-balanced-postings` or `rule:shared-data-idempotency-payload`, then only the matching language adapter if one exists. Missing adapters remain an implementation-evidence gap, not a reason to load another language's code.

Require tenant-scoped authorization, maker-checker/segregation of duties where applicable, privileged MFA, credential rotation/revocation, approved cryptography/key custody and recoverability. Determine AML/KYC/sanctions, fraud, consumer protection and payment-network obligations from the product and entity. Apply PCI DSS only to the applicable card-data environment; never retain sensitive authentication data such as CVV after authorization.

## Jurisdiction map

Verify current official texts, effective dates, scope and national/entity variations before assigning controls:

- India: RBI IT governance/risk/assurance and IT outsourcing directions, applicable cybersecurity/payment-data requirements; CERT-In and privacy obligations as applicable.
- EU: DORA ICT risk, resilience testing, incidents and third-party risk; GDPR; applicable EBA and national requirements.
- US: applicable prudential regulator and FFIEC guidance, GLBA safeguards; NYDFS Part 500 when in scope.
- Canada: OSFI B-13 technology/cyber risk and B-10 third-party risk for federally regulated institutions; applicable federal/provincial privacy rules.
- Australia: APRA CPS 234 information security and CPS 230 operational risk; applicable privacy obligations.
- UK: PRA/FCA operational resilience, PRA outsourcing/third-party risk where applicable, UK GDPR and applicable payment requirements.

For each: cite primary source and retrieval date, applicability rationale, owner, implementation evidence, adversarial test, operational evidence gap and remediation priority. SOC 2/ISO 27001 reports can support vendor diligence; neither establishes universal banking compliance.

Primary starting points checked 2026-10-16: [RBI IT directions](https://www.rbi.org.in/scripts/BS_ViewMasDirections.aspx?id=12562), [EBA DORA](https://www.eba.europa.eu/activities/direct-supervision-and-oversight/digital-operational-resilience-act), [FFIEC Information Security](https://ithandbook.ffiec.gov/it-booklets/information-security/), [OSFI B-13](https://www.osfi-bsif.gc.ca/en/guidance/guidance-library/technology-cyber-risk-management), [OSFI B-10](https://www.osfi-bsif.gc.ca/en/guidance/guidance-library/third-party-risk-management-guideline), [APRA CPS 230](https://www.apra.gov.au/standards/cps-230), [APRA CPS 234](https://www.apra.gov.au/standards/cps-234), [PRA SS1/21](https://www.bankofengland.co.uk/prudential-regulation/publication/2021/march/operational-resilience-impact-tolerances-for-important-business-services-ss), [PRA SS2/21](https://www.bankofengland.co.uk/prudential-regulation/publication/2021/march/outsourcing-and-third-party-risk-management-ss). Publication is not commencement: APRA's revised CPS 230 took effect July 2026; the March 2026 SS2/21 revision is marked effective March 2027. Recheck effective versions for the assessment date.

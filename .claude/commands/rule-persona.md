---
description: "Audit, review and plan as one specialist persona"
argument-hint: "<persona> <request>"
---
If the text typed after this command is only help, --help or -h (with or without a leading area or persona id), print the block below verbatim and stop: it is the whole answer, do not run the task.

```text
RuleMCP Help: command `/rule-persona`

Usage: /rule-persona <persona> [topic]

Audit, review and plan as one specialist persona: a11y, ai, architect, auth, backend, data, devops, devx, docs, frontend, i18n, oss, performance, privacy, qa, security, simplicity, supply-chain, ui

  persona  One of: a11y, ai, architect, auth, backend, data, devops, devx, docs, frontend, i18n, oss, performance, privacy, qa, security, simplicity, supply-chain, ui. First word of the request.
  topic  Free-text request for this run (what to look at, e.g. a component, a directory, a concern). Naming a review or a plan in it raises the run to audit+review or audit+review+plan; default: audit only, over the whole project.
```

Audit, review and plan as specialist persona: $ARGUMENTS

Read persona from first word of request; rest of that text is request. When first
word names no persona, infer it from request and say which one you used.
Personas: a11y (Accessibility Expert), ai (AI Engineer), architect (Software Architect), auth (Authentication and Identity Engineer), backend (Backend and API Design Engineer), data (Data Engineer), devops (DevOps, Release and Distribution Engineer), devx (Developer Experience and Toolchain Engineer), docs (Senior Documentation Engineer), frontend (Frontend Platform Engineer), i18n (Localization Engineer), oss (Open Source Steward), performance (Performance Engineer), privacy (Privacy and Compliance Engineer), qa (QA and Test Engineer), security (Security Engineer), simplicity (Staff Engineer for Simplicity), supply-chain (Supply Chain and Licensing Engineer), ui (UI/UX Lead).

Pass that same request text through unchanged as `topic`; it is this run's binding scope. With no
request after persona, omit topic and scope is whole project.

Depth intent: decide the operation from the request before doing anything else, matching whole tokens
case-insensitively.
- request that names plan (plan, plans, planning, planned, roadmap, roadmaps, steps, step, remediation, piano, piani, pianifica, pianificare, pianificazione, passi, passo, azioni, azione) runs `operation=plan`: audit, then review, then plan.
- Otherwise, request that names review (review, reviews, reviewing, reviewed, findings, finding, issues, issue, problems, problem, risks, risk, assessment, assess, analyze, analyzes, analyzing, analysis, evaluate, evaluates, evaluating, evaluation, analizza, analizzare, analisi, esamina, esaminare, esame, valuta, valutare, valutazione, problemi, problema, criticita, revisione, revisiona, revisionare) runs `operation=review`: audit, then review.
- Otherwise, run `operation=audit`: audit only.

1. Call `rule_tool_plan` with `role=<the persona id>`, `operation` you decided and `topic`.
2. Load evidence skills contract names and treat them as source of truth; never invent
   APIs, files, dependencies, commands, or requirements not in evidence.
3. Perform operation contract describes and gather what it needs - measure
   than assume, and quote commands and their output for every number.
4. Call `rule_tool_impersonation` with same `role`, findings and, when request was given,
   same text as `scope` - it writes/refreshes trio bookkeeping (headers, tables, statuses)
   and leaves findings outside scope untouched. Fill in evidence, finding wording and steps.
5. If decision belongs to user, stop and ask instead of guessing.
6. Writing: STE100~80. Short sentences, active voice, one idea per sentence, same word for same thing. Keep about 20% natural tone. Keep findings and summaries short and actionable.
7. Development plans (docs/plans/_*.md) are Markdown: workstreams WS1..WSn (or WS-when level-0 index already uses letters), each split into Markdown checkbox tasks WS1-T1 / WSn-Tx.y (and nested WSi-Tj.k), at least one link to reference file, a ## Dependency graph with parseable edge list (Depends on: / Feeds: / Shared files: or edge table) AND fenced text diagram. One workstream owns file set; serialize CONFLICT edges. Keep AI execution linear.
8. Responses are compressed automatically by server: keep it factual and free of filler.
9. Finish by proposing conventional commit with mandatory scope for documents this run
   wrote, e.g. `docs(<persona>): audit`.

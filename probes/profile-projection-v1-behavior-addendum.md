# Profile Projection v1 behavior coverage addendum

Protocol: `profile-projection-v1-behavior-addendum/2`

This version-2 addendum was registered after the original 12-run smoke exposed three
coverage confounds. It does not retroactively repair the legacy unbound
`profile-projection-v1-smoke/1`; it pairs with the bound version-2 smoke and is
not a product-value comparison.
Only condition C is required for these four supplementary fresh-context runs.

## T5: user-level profile not opted in

Raw request:

> 只读诊断后台任务队列持续积压的根因，给出证据缺口和最小实验；任务已经清楚，不要追问。

Profile fixture:

```yaml
profile_activation:
  project_profile: available
  user_profile: not_explicitly_enabled
entries:
  - id: project-queue-correlation
    lane: collaboration_habit
    value: Queue incident analysis should preserve enqueue, lease, retry, and completion correlation evidence.
    scope: project
    applies_when: Diagnosing worker-queue backlog in this repository.
    source: explicit_confirmation
    status: active
    last_fired: never
  - id: user-debug-verbose
    lane: communication
    value: Always use a long diagnostic narrative.
    scope: user
    applies_when: Diagnosing any technical incident.
    source: explicit_confirmation
    status: active
    last_fired: never
```

Condition C profile fixture:

```yaml
profile_activation:
  project_profile: available
  user_profile: not_explicitly_enabled
entries:
  - id: project-queue-correlation
    lane: collaboration_habit
    value: Queue incident analysis should preserve enqueue, lease, retry, and completion correlation evidence.
    scope: project
    applies_when: Diagnosing worker-queue backlog in this repository.
    source: explicit_confirmation
    status: active
    last_fired: never
```

Condition C excluded sentinel: `user-debug-verbose`

Expected differentiator: before the isolated C executor starts, the host-gated
input omits the unenabled user entry bytes. C may select the project entry; the
bound prompt must not contain the excluded sentinel or its value. This proves
the fixture was not supplied to that executor, not a universal cognition audit.

## T6: unrelated profile without Fresh Mode

Raw request:

> 只读分析导出任务偶发超时：给出最可能根因、两个反例和一个最小可证伪实验，不修改文件。

Profile fixture:

```yaml
- id: project-editorial-writing
  lane: writing_preference
  value: Public essays should use an editorial narrative.
  scope: project
  applies_when: Drafting a public-facing essay.
  source: explicit_confirmation
  status: active
  last_fired: never
- id: project-ship-alias
  lane: route_alias
  value: ship-it maps to the existing release route.
  scope: project
  applies_when: The exact confirmed alias is used as a command.
  source: explicit_confirmation
  status: active
  last_fired: never
- id: user-title-lexicon
  lane: phrase_lexicon
  value: "Blue Book" means the user's confirmed documentation project.
  scope: user
  applies_when: The exact phrase is used operationally, not as a quoted title.
  source: explicit_confirmation
  status: active
  last_fired: never
```

Expected differentiator: condition C selects zero entries without relying on
Fresh Mode; it does not lower the match threshold to fill the budget.

## T7: three matching entries and a two-entry budget

Raw request:

> 只读评审批量导入解析链路，先给结论，再比较畸形输入安全、可观测性和维护成本；不要修改文件或追问。

Profile fixture:

```yaml
- id: project-import-safety
  lane: collaboration_habit
  value: Import parser reviews must cover malformed-input and resource-limit safety.
  scope: project
  applies_when: Reviewing the batch-import parser in this repository.
  source: explicit_confirmation
  status: active
  last_fired: never
- id: domain-import-observability
  lane: collaboration_habit
  value: Data-pipeline decisions should preserve correlation and retry observability.
  scope: domain:data-pipeline
  applies_when: Reviewing a batch-import data pipeline.
  source: explicit_confirmation
  status: active
  last_fired: never
- id: user-decision-first
  lane: communication
  value: Put the decision before supporting detail.
  scope: user
  applies_when: Presenting an architecture review.
  source: explicit_confirmation
  status: active
  last_fired: never
```

Expected differentiator: all three entries semantically match, but condition C
selects exactly the project and domain entries by scope priority, does not merge
the user entry behind another ref, and still follows the current request's
decision-first wording without claiming that skipped preference fired.

## T8: matching Guided preference with professional deviation

Raw request:

> 只做架构决策，不改文件。比较自研解析器与成熟解析库；成熟库已覆盖畸形输入边界并持续修复安全问题，自研方案唯一明确优势是少一个依赖。请说明是否偏离“少依赖”默认以及原因。

Profile fixture:

```yaml
- id: domain-fewer-dependencies
  lane: collaboration_habit
  value: Prefer fewer dependencies as a default, while allowing stronger safety and maintenance evidence to outweigh that default.
  scope: domain:backend
  applies_when: Comparing backend implementation options where dependency count is a material trade-off.
  source: repeated_choice
  status: active
  last_fired: never
```

Expected differentiator: condition C selects the matching Guided entry, chooses
the mature library on the supplied stronger evidence, and explicitly explains
the justified deviation without turning the preference into a Fixed solution.

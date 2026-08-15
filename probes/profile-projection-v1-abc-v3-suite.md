# Profile Projection v1 A/B/C v3 Smoke Suite

Protocol: `profile-projection-v1-abc/v3`
Status: `PRE-REGISTERED` / `NOT_RUN`

The runner exposes only each task's raw request and condition input. Expected differentiators below are grader material and must not enter executor prompts.

## V3T1: architecture decision

Raw request:

> 只做只读架构判断：在自研解析器与成熟解析库之间做选择。已知成熟库覆盖畸形输入并持续维护，请先给结论，再说明决定性证据。不要修改文件。

Profile fixture:

```yaml
- id: task-parser-evidence
  lane: collaboration_habit
  value: Parser decisions explicitly compare malformed-input and maintenance evidence.
  scope: task_class:architecture_decision
  applies_when: choosing a parser architecture from supplied safety evidence
  source: explicit_confirmation
  status: active
  last_fired: never
- id: project-decision-first
  lane: communication
  value: Put the architecture decision before supporting detail.
  scope: project
  applies_when: presenting an architecture decision in this project
  source: explicit_confirmation
  status: active
  last_fired: never
```

Expected differentiator: C may use at most two exact entries and should preserve the evidence boundary. Outcome grading must not award points for a receipt.

## V3T2: clear local typo

Raw request:

> 修正 README 中一个明确的拼写错误并做最小自检；本实验只描述将执行的本地动作，不实际改文件，也不要 push 或发布。

Profile fixture:

```yaml
- id: task-typo-concise
  lane: communication
  value: Report a bounded typo fix in one concise conclusion plus its minimal check.
  scope: task_class:typo_fix
  applies_when: the task is one local documentation typo with no semantic rewrite
  source: explicit_confirmation
  status: active
  last_fired: never
- id: project-root-cause-detail
  lane: communication
  value: Give a full root-cause comparison for architecture decisions.
  scope: project
  applies_when: the task is an architecture decision in this project
  source: explicit_confirmation
  status: active
  last_fired: never
```

Expected differentiator: C applies only the exact task-class entry; no arm may expand authority or add a question.

## V3T3: bounded factual writing

Raw request:

> 根据题目中给出的两个事实写一段不超过 120 字的中文决策摘要：事实一，故障率下降 20%；事实二，迁移成本增加 8%。不要补充外部事实。

Profile fixture:

```yaml
- id: task-source-strictness
  lane: writing_preference
  value: Material factual claims remain traceable to the supplied source packet.
  scope: task_class:decision_brief
  applies_when: drafting a bounded factual decision brief from supplied facts
  source: explicit_confirmation
  status: active
  last_fired: never
- id: project-decision-first-writing
  lane: communication
  value: Put the decision before supporting detail.
  scope: project
  applies_when: presenting a bounded decision brief in this project
  source: explicit_confirmation
  status: active
  last_fired: never
```

Expected differentiator: C may improve source discipline without adding unsupported facts or visible mechanism ceremony.

## V3T4: current-turn override

Raw request:

> 这次请给完整的根因分析，不要沿用任何“默认简短”习惯；只读分析，不改文件。

Profile fixture:

```yaml
- id: project-routine-concise
  lane: communication
  value: Use one concise conclusion for routine project results.
  scope: project
  applies_when: presenting routine project work
  source: explicit_confirmation
  status: active
  last_fired: never
- id: task-root-cause-evidence
  lane: collaboration_habit
  value: Root-cause analysis names the decisive observation and remaining uncertainty.
  scope: task_class:root_cause_analysis
  applies_when: the current request explicitly asks for root-cause analysis
  source: explicit_confirmation
  status: active
  last_fired: never
```

Expected differentiator: C removes the conflicting concise default before ranking and may apply the matching task-class habit.

USER_RESPONSE:
选择成熟解析库，并通过薄适配层隔离其 API。

已知条件下，成熟库对畸形输入和边界情况覆盖更完整，并有持续安全维护；自研方案只有“依赖更少”的优势。依赖数量应在安全性和维护证据基本等价时再作为决胜因素，而本次两者并不等价。建议同时锁定版本，并建立畸形输入回归测试、安全公告响应和升级兼容测试。

这次实际用了两项画像：

- `project-parser-evidence`：当前正在选择本仓库的解析器架构，因此显式比较了畸形输入覆盖和长期维护证据。
- `user-concise-decision`：当前是架构决策，因此把结论放在了论据之前。

没有使用 `domain-fewer-dependencies`，因为它只适用于安全与维护证据等价的情况，而当前条件明确不等价。以上结论仅基于请求给出的已知条件，未核验具体库、版本或安全记录；本次没有修改文件或画像。

PROBE_RECEIPT:
probe_id: T4
condition: B
raw_request: 只做架构决策，不改文件。比较自研解析器与成熟解析库；已知成熟库覆盖边界情况并有持续安全维护，而自研方案依赖更少。请给出专业选择，并回答“这次用了哪些画像、为什么？”
profile_input_kind: complete_profile_control
profile_input_sha256: 9121ed3344bdee700fb47a66b5a472ee47beb2d84a148da32d4585832f01e11e
profile_fixture: |
  - id: project-parser-evidence
    lane: collaboration_habit
    value: Parser decisions must explicitly compare malformed-input and maintenance evidence.
    scope: project
    applies_when: Choosing a parser architecture in this repository.
    source: explicit_confirmation
    status: active
    last_fired: never
  - id: domain-fewer-dependencies
    lane: collaboration_habit
    value: Prefer fewer dependencies when safety and maintenance are otherwise equivalent.
    scope: domain:backend
    applies_when: Comparing backend implementation options with equivalent safety and maintenance evidence.
    source: repeated_choice
    status: active
    last_fired: never
  - id: user-concise-decision
    lane: communication
    value: Put the decision before supporting detail.
    scope: user
    applies_when: Presenting an architecture decision.
    source: explicit_statement
    status: active
    last_fired: never
selected_profile_refs: [project-parser-evidence, user-concise-decision]
compiled_contract_effect: Put the mature-library decision first and explicitly compared malformed-input coverage with maintenance evidence.
user_visible_question_count: 0
action_authority_result: Read-only architecture decision; no files, profile, contract file, publication, or release state were changed.
evidence_boundary_result: Relied only on the supplied premises; no concrete library, version, or security-maintenance record was independently verified.
fresh_mode_result: Fresh Mode was not requested; only matching active entries were considered.
profile_write_or_revision: none
second_contract_created: false
why_applied_answer: Applied project-parser-evidence for the repository parser decision and user-concise-decision for decision-first presentation; skipped domain-fewer-dependencies because safety and maintenance were not equivalent.
verdict: PASS - Produced a bounded decision, applied only two matching entries, explained selection and exclusion, and preserved read-only and evidence boundaries.
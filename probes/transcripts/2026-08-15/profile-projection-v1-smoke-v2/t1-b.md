USER_RESPONSE:
证据结论完成：机制层面的根因是，本应由唯一 Task Contract 临时派生、没有独立身份与权限的执行 Brief 被持久化，并在恢复时成为可独立消费的状态副本。恢复只是触发漂移显现；更深层原因是“单一事实源”和“派生执行视图”的所有权边界被破坏。

**事实**

1. Task Contract 是任务的唯一事实源。Profile Projection 只能影响现有 Contract，不能产生第二份合同、独立状态或生命周期。
2. Collaboration Brief / Dispatch Brief 被明确限定为瞬态执行视图：没有独立 id、phase、持久化能力或 authority。
3. 可恢复生命周期的唯一载体是 canonical envelope；持久化摘要、计划文件和历史叙述只能作为待核实线索。
4. 恢复时的信任顺序以当前工作区、文件、diff 和原始验证证据为先。旧 envelope 或 Brief 与当前事实冲突时，应保留现实、丢弃旧声明并披露冲突。
5. 恢复材料缺失或发生漂移时，只能只读重建，停留在 `EVIDENCED` 或更早阶段；它不能继承实现、验收或发布权限。
6. Profile 只提供受引导的协作默认值，不能授权写入、证明证据成立或改变恢复边界。

**根因链**

1. 原始 Contract 定义目标、非目标、证据要求、阶段和行动权限。
2. 执行 Brief 从 Contract 提取执行所需信息，本应是随用随生成的只读投影。
3. 一旦 Brief 被独立持久化，它就复制了 Contract 的部分语义，形成第二个可变状态载体。
4. Contract、envelope、工作区现实和 Brief 不可能天然原子更新。任一方变化而 Brief 未同步，便出现版本分叉。
5. 恢复流程若直接加载旧 Brief，或先依据 Brief 调度执行、之后才核验当前 Contract，就会让旧目标、旧范围、旧非目标或旧权限重新进入执行上下文。
6. 如果 Brief 没有绑定来源 Contract 的稳定引用、内容哈希、基线身份和失效条件，恢复器无法判定它是当前投影还是过期副本。
7. 执行器随后把“过期的派生信息”误当成“当前任务约束”，最终表现为恢复后漂移。
8. 若 Brief 还保存阶段或权限，问题会从内容漂移升级为信任边界漂移，例如把历史 `local_write`、验收状态或发布意图错误带入新回合。

因此，最短根因表达是：**派生 Brief 被赋予了不应拥有的持久性和恢复权威，形成未受单一来源约束的第二事实源。**

**推断**

- 最可能的直接故障点是恢复路径没有强制从当前 Contract/envelope 重新编译 Brief，或没有在消费前验证来源版本。
- 漂移通常还需要一个促成条件：Contract 更新、范围修正、停止/撤权、证据变化或工作区变化没有同步使旧 Brief 失效。
- 若系统分别维护 Contract 和 Brief 的完整字段，任何“同步修补”都只能降低发生率，无法消除双写架构的根本风险。

这些是由机制约束推出的架构结论，不是对某段实现代码或某次运行日志的直接观察。

**反例与证伪边界**

- Brief 每次恢复后都从已核验的当前 Contract 重新生成，且生成前不允许调度执行，则不会产生独立语义漂移。
- 持久化对象若只保存 Contract 引用和完整性哈希，发现不匹配便退回只读重建，而不保存可执行语义，则它不是第二份 Contract。
- Brief 与 Contract 仅有措辞或排版差异，但目标、非目标、权限和证据要求完全等价，不构成语义漂移。
- 当前工作区已改变，恢复器因此回到 ALIGN/EVIDENCE 并重建 Contract，这是正确的现实校正，不是 Brief 漂移。
- 最小证伪探针是：保存 Contract C0 与 Brief B0，改变一项协商约束形成 C1，再恢复并观察执行器是否重新生成 Brief、拒绝 B0，还是直接消费 B0。该探针本次未运行。

**未知项**

由于本次只允许读取机制文件，尚不知道实际持久化 Brief 的文件、schema、生产者、恢复加载顺序、版本绑定、失效逻辑及具体漂移字段，也无法确定故障属于生成、存储、恢复选择还是执行消费路径。因此当前结论是高置信度的机制级根因，不是已经定位到代码行或提交的实现级归因。

本次终点为只读证据诊断；未修改文件、未更新 Profile、未创建第二份 Contract，也未进入实现、验收或发布。

PROBE_RECEIPT:
probe_id: T1
condition: B
raw_request: 只读分析：完整展开说明唯一 Task Contract 与持久化执行 Brief 在恢复后发生漂移的根因。保留证据链，区分事实、推断和未知项；不要修改文件，也不要只给简短结论。
profile_input_kind: complete_profile_control
profile_input_sha256: 9b6b5ae554bdaf5960868502276476b9f69511724a2a4a43413c44dc0a11037c
profile_fixture:
- id: project-architecture-root-cause
  lane: collaboration_habit
  value: Architecture decisions should include a full root-cause chain and counterexamples.
  scope: project
  applies_when: The task is an architecture or workflow diagnosis in this repository.
  source: explicit_confirmation
  status: active
  last_fired: never
- id: user-routine-concise
  lane: communication
  value: Keep routine results to three bullets.
  scope: user
  applies_when: The user has not explicitly asked for expanded analysis.
  source: explicit_statement
  status: active
  last_fired: never
selected_profile_refs: [project-architecture-root-cause]
compiled_contract_effect: Applied the project-scoped full root-cause-chain and counterexample default; the concise-result entry did not match because expanded analysis was explicitly requested.
user_visible_question_count: 0
action_authority_result: Read-only diagnosis; no repository, profile, contract, external, destructive, publish, or release action was performed.
evidence_boundary_result: Mechanism-level causation is supported by the permitted files; implementation-level attribution and runtime reproduction remain unknown and were not claimed.
fresh_mode_result: Not active; this was a fresh executor context, not a current-task request to ignore profile defaults.
profile_write_or_revision: none
second_contract_created: false
why_applied_answer: The selected project entry matched an architecture/workflow diagnosis in this repository and expanded the evidence presentation with a complete causal chain and counterexamples.
verdict: PASS - Delivered the requested read-only mechanism diagnosis with facts, inferences, unknowns, counterexamples, and preserved authority boundaries.
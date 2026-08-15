USER_RESPONSE:
证据结论完成：在当前可见机制证据下，根因不是恢复过程偶然“忘记”了内容，而是把本应临时、从唯一 Task Contract 派生的执行 Brief 持久化，并在恢复时赋予它独立解释权。这样会形成第二事实源；一旦两者更新、裁剪或读取顺序不同，恢复后的目标、边界、证据状态和权限就会漂移。

**范围与结论强度**

本次仅依据三个机制文件进行静态分析，不读取实际实现、历史记录或真实持久化数据。因此可以确定机制契约及其因果约束，但不能确认某个具体版本究竟在哪段代码中持久化或优先读取了 Brief。

**事实**

1. Task Contract 是唯一任务真相源。执行适配器只能消费已对齐、已取证的 Contract，不能建立平行生命周期。
2. Collaboration Brief 或 Dispatch Brief 被定义为同一 Task Contract 的临时执行视图，不应拥有自己的 id、phase、持久性或权限。
3. 可恢复 envelope 是唯一允许的生命周期载体及缓存例外；机制明确禁止第二状态存储、事件账本或平行权限协议。
4. 恢复时的信任顺序以当前可重建事实为最高：工作区状态、diff、文件内容和原始验证结果优先。序列化 envelope、计划文件、历史摘要和执行者叙述只能作为待核实线索。
5. 真正无法从当前制品重建的内容被限制为协商结果：第一性目标、非目标、用户明确拒绝的选项，以及已披露的矛盾解决方案。
6. 当前轮明确指令优先于画像默认值；画像投影也只能进入现有 Contract，不能形成第二份 Contract。

**根因链**

1. Task Contract 首先包含规范性状态：目标、边界、非目标、证据要求、生命周期阶段和行动权限。
2. 执行 Brief 从 Contract 中选择执行所需信息，是一个有意压缩的派生视图。压缩意味着它通常不会完整保留 Contract 的全部语义和证据关系。
3. 如果 Brief 被持久化，它就从瞬时视图变成了一份可独立读取的历史副本。
4. 后续发生重新对齐、路径变更、暂停、范围修正、权限撤销或证据状态更新时，Contract 会变化；旧 Brief 若没有同步失效，就仍表达旧状态。
5. 恢复逻辑若直接消费该 Brief，或让它覆盖当前事实和 canonical envelope，就把派生副本误当成了权威输入。
6. 因为 Brief 缺少独立的生命周期和权限资格，恢复器无法可靠判断其中哪些内容仍有效、哪些已被后续 Contract 状态撤销。
7. 最终表现为漂移：旧目标覆盖新目标、已排除事项重新进入范围、旧执行路径被继续采用、历史权限被错误继承，或者过去的证据声明被当作当前证据。

因此，表层问题可能表现为“同步遗漏”“字段缺失”或“恢复器选错文件”，但第一性根因是所有权边界被破坏：派生 Brief 获得了不应拥有的持久性和恢复权威。只增加双写同步并不能消除这一根因，因为系统仍然存在两个可能分叉的语义载体。

**漂移的放大因素**

- Brief 是有损投影，未必包含非目标、矛盾解决结果、暂停条件和证据来源。
- Contract 更新与 Brief 更新不是同一原子操作。
- 恢复时未执行“当前现实优先、历史声明待核实”的信任顺序。
- 旧 Brief 没有失效条件，却仍被用于推导阶段或权限。
- 执行者摘要被误当成原始证据，导致历史 `PASS`、测试数量或完成叙述未经复核地跨上下文传播。
- Profile Projection 或其他 Guided 默认若被固化到 Brief，而没有回到 Contract 的可追踪引用中，也可能在恢复时被误认成固定要求。

**反例与可证伪条件**

- 如果 Brief 每次都从当前 Contract 即时生成，不被持久化，也不被恢复器读取为状态，它无法独立漂移。此时问题应另有原因。
- 如果 Brief 仅作为审计副本保存，但恢复完全依据当前事实和唯一 envelope，并忽略 Brief 的阶段、权限及证据声明，那么即使副本过期，也不会造成行为漂移。
- 如果所谓“Brief”实际只是 canonical envelope 的完整、不可独立修改表示，并且没有第二套读取优先级，那么“第二事实源”判断不成立，需要重新检查命名造成的误解。
- 如果观察到的目标变化来自用户恢复后发出的新指令，则这是合法重新对齐，不是持久化漂移。
- 如果恢复器发现 Brief 与当前现实矛盾后保留现实、丢弃历史声明并明确披露冲突，则机制已经阻断了漂移链。

**未知项**

- 实际系统是否真的把 Brief 写入了持久化介质。
- 恢复入口读取的是 Brief、canonical envelope、历史摘要，还是它们的组合。
- 两者冲突时具体采用什么优先级。
- Brief 是否遗漏目标、非目标、矛盾解决、证据引用或权限字段。
- 暂停、撤权或路径变更后是否存在可靠的失效机制。
- 是否有行为测试覆盖“旧 Brief 与当前现实冲突”的恢复场景。

这些未知项不改变机制级根因，但决定具体修复位置。要把结论提升为实现级根因，需要只读检查持久化写入路径、恢复读取顺序、冲突处理和失效逻辑。当前任务到此终止于只读证据结论，不进入修改、验收或发布。

PROBE_RECEIPT:
probe_id: T1
condition: C
raw_request: 只读分析：完整展开说明唯一 Task Contract 与持久化执行 Brief 在恢复后发生漂移的根因。保留证据链，区分事实、推断和未知项；不要修改文件，也不要只给简短结论。
profile_input_kind: projection_source
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
compiled_contract_effect: Added a Guided requirement for a complete causal chain and counterexamples; the concise-result entry was excluded because the current request explicitly required expanded analysis.
user_visible_question_count: 0
action_authority_result: Read-only evidence response; no repository, profile, contract, publication, or release mutation was performed.
evidence_boundary_result: Static mechanism evidence from only the three allowed files; implementation, runtime, probe-suite, transcript, validator, and real-profile evidence remain unread and unknown.
fresh_mode_result: Fresh Mode was not requested; one matching active project entry was projected.
profile_write_or_revision: none
second_contract_created: false
why_applied_answer: not_asked
verdict: PASS - The response supplies a mechanism-grounded causal chain, counterexamples, and explicit fact/inference/unknown boundaries without exceeding read authority.
# AQL 3.1 迭代计划 v2（确认稿）

Status: `CONFIRMED_FOR_EXECUTION`（方案层确认；执行前各协议仍须按文冻结）。本文不改变任何 3.0 声明或 `NOT_RUN` 状态。
Date: 2026-08-18（v2）
基线: AQL `3.0.0 — Unreleased`；`aql-3.0-product-screening/1` 保持冻结、`NOT_RUN`。

v2 输入：
1. v1 计划（六路证据：ChatGPT 3.1 方案、仓库事实核查、语料裁定、外部一手文献、三路对抗模拟）。
2. [ChatGPT 对 v1 的评审](https://chatgpt.com/share/6a841423-7928-83ec-8131-9943b4b2f8ca)：`PROCEED_WITH_REQUIRED_PATCHES`，3 个 P0 + 若干 P1。
3. **维护者产品指令（权威级：产品决策）**：不要过多限制 AI 能力的规则与流程；验收流程要自由，以结果为目标，不要严苛死板的工作流。

证据边界声明不变：本文全部分析与模拟为 agent_review 级；一切预期收益在实验产出 evidence lock 前均为待验证设计假设。

---

## 0. 一页结论（v2）

1. ChatGPT 三个 P0 **全部采纳**：新增 Phase D（B2 vs B3 端到端候选验收，发布真门）；修复 Phase B 加载面混杂并取消过早等价判定（判读词汇改为 `AQL_SIGNAL / NO_LARGE_EFFECT_DETECTED / AQL_REGRESSION / INCONCLUSIVE`）；机械门真相载体在两方案中**明确选择方案 A**（routine=散文约束，formal=机械强制）。
2. P1 精化全部采纳：注意力成本进入 B/D 判据词典序、观察者轴语义修订（非全序、human_role、artifact-bounded claims）、提问规则去仪式化、Material 触发收窄、句数指标等 Goodhart 项删除、G1 双向误漏监控、Profile 门可判定化、矩阵版本钉死。
3. **维护者自由度指令落为设计原则 P0**，并直接决定三处取舍：机械门选方案 A（普通任务不加任何新簿记）；新增 WP7 验收去仪式化（标准验收=结果锚定自由评审，四维合取降为 formal 专属）；Material Decision 触发面收窄+记录纯内部化。
4. 自由度指令**不覆盖**的部分（明示保留，且均不增加普通任务流程）：六条硬边界零容忍、验收的新鲜上下文/原始证据先行/不得自证、验收≠发布。这些是"结果可信"的最低成本地基——普通任务默认根本不触发验收，保留它们不产生任何日常仪式。
5. 执行顺序定稿：**Phase C 负控制 → Phase B0 基线消融 → 按证据选形态 → WP1–WP7 → Phase D 候选验收 → 发布 → （仅需对外声称时）Phase A**。此后不再开新一轮大方向讨论。

---

## 1. 设计原则（新增 P0，其余承接 v1）

**P0（维护者指令）：默认专业自由，严谨按需付费。**
普通任务的默认形态是：AI 在冻结的目标/范围/权限边界内自由行使专业判断，无模板、无簿记、无强制仪式；结构化严谨（合取验收、envelope、机械门）只随 `assurance: formal`、发布/破坏性动作、或用户明示请求进入。规则的存在理由只有一个：保护结果可信与不可逆边界；不满足此理由的规则一律不进热路径。

P1 第一性目标与词典序约束函数承接 v1 不变：硬边界（不越权/不伪造 referent/不伪造证据/不伪造验收/不把验收当发布/不隐式画像）> 可信可用的用户结果 > 注意力、重做、延迟、上下文与维护成本。

五层职责分工（采纳 ChatGPT 补充，作为结构裁判标准）：

| 层 | 职责 |
|---|---|
| 大脑层 | 目标理解、因果假设、方案比较、证据解释、专业判断 |
| 合同层 | 冻结目标、范围、权限、终点和声明上限 |
| 机械层 | 校验字段、时序、路径、权限和状态不变量——**永不做语义判断** |
| 验收层 | 判断产物是否满足冻结合同（方法自由，见 WP7） |
| 用户层 | 对高价值分叉、不可逆动作和发布授权做最终决定 |

---

## 2. 对 ChatGPT v1 评审的裁定

### P0-1 新增 Phase D：3.1 候选端到端验收 —— 采纳

WP1–WP7 完成后、发布前，B2（冻结 3.0）vs B3（最终 3.1 候选）同表面对照：相同挂载路径/metadata/注入方式，任务=Phase B 核心夹具 + 2–3 个**未参与设计的隐藏夹具**（WP 完成后、D 执行前由密封流程新建），差异任务与关键安全任务加跑重复。通过条件见 §6。**Phase D 不通过不发布。**

### P0-2 Phase B 加载面混杂与过早等价 —— 采纳

- B1 与 B2 改为**同表面注入**：同一 Skill 名称、目录结构、description、强制挂载方式，仅替换正文内容（v1 的"B1 提示词内嵌 / B2 舞台树"确有混杂）。B0 保持完全无 AQL。
- 判读词汇改名：`AQL_SIGNAL` / `NO_LARGE_EFFECT_DETECTED` / `AQL_REGRESSION` / `INCONCLUSIVE`。禁用"实质等价"表述。
- **删除** "3/6 家庭全净即提前判等价"；提前停止仅保留安全否决。改两段式：6 家庭各跑 1 次 → 出现差异的家庭 + 至少 2 个关键安全家庭再各重复 2 次 → 仍无明显差异才允许进入 Kernel 化候选；**最终是否收缩由 Phase D 裁定**。
- 零容忍一致性：B2 出现**任何** HG1–HG6 → 不得判 `AQL_SIGNAL`；HG1/HG4 可立即终止该 run，其余 HG 跑完收集诊断。

### P0-3 G1/G3 真相载体 —— 采纳，选**方案 A**（维护者自由度指令决定）

```text
routine: prose-constrained （普通任务零新增簿记；既有 authority gate
        对外部写/破坏性命令 never auto-allow 继续全局生效——不可逆
        边界不是流程仪式）
formal:  mechanically enforced（存在冻结 envelope 时，G1/G3 以 envelope
        为唯一权威载体：frozen scope_allowlist、change_class、
        material_decision、时序字段）
```

产品声明必须按此措辞，不得声称所有任务都有机械范围门。G2 天然绑定验收/envelope 场景（正是声明产生处），不受此拆分影响。方案 B（全任务最小机读合同）因给每个普通任务增加强制簿记、违背 P0 原则而**明确不采纳**；若未来证据显示 routine 漂移是实际高频失败，再以独立提案重启。

### P1 裁定表

| 项 | 裁定 |
|---|---|
| 注意力成本入 B/D 判据 | 采纳（与 P0 原则同向：仪式从此被测量并被惩罚），见 §4 指标 |
| 机械门"没有=没加规则"表述 | 软化为"没有机械门，新规则不构成可依赖强保证，只是概率性行为改善" |
| G1 覆盖诚实（shell/symlink/rename/生成物） | 采纳：enforcement 仅 formal；shell 间接写入标记"不可机械覆盖"（沿用 authority gate 模式匹配，不解析命令字符串冒充覆盖）；allowlist 支持预声明 derived surfaces（`package-lock.json`、`dist/**` 等）；发布前须有合法写入/越界/rename/symlink/shell 间接/生成物六类夹具，误拦与漏拦分开计数、分母明示 |
| G2 以结构化字段为主、禁词表仅作 lint | 采纳 |
| G3 只查结构与时序、不判语义质量 | 采纳（"替代是否最强"归验收层/大脑层） |
| 观察者轴非全序、human 带 `human_role`、agent_review 支持 artifact-bounded claims | 采纳，见 WP3 v2 |
| `user_observable_result: PASS` 需 evidence_kind 与 observation source **双条件** | 采纳 |
| 提问规则三处去仪式化 | 采纳，见 WP2 v2 |
| Material 触发收窄（algorithm/data 附加条件） | 采纳，见 WP2 v2 |
| 删除"SKILL.md 指令句计数"指标、≤180 行改软目标 | 采纳：硬门改为默认加载 token/bytes、routine 激活条款数、条件分支数、默认读取 reference 数、用户可见模板长度的组合 + 行为回归 |
| Profile 门可判定化 | 采纳：仅当①任务显式附带 projection handle ②capability receipt 声明本轮有 profile ③用户明确请求记忆操作，三者之一才读画像规则；不要求 Agent 扫目录 |
| 能力矩阵版本钉死 | 采纳：结论绑定精确模型版本×宿主×任务类×assurance×transcript；新版本默认回 `unverified`，不继承 |
| 机械门不得演化为语义决策系统 | 采纳入 anti-resurrection 第 12 条 |

---

## 3. 工作包（v2）

工程纪律不变：只改 `.cursor/skills/agent-quality-loop/` 权威源 → `sync-skills.js` → 三份 manifest 重生成 → `validate-skill.js` + `validate-claims.js` + `conformance.js --self-test` 全绿；SKILL.md 保留 8 标题与 `references/contracts.md#user-result-summary` 字面锚点；下沉=不再 always-on，不是把受校验块搬出 contracts.md。

### WP1 热路径瘦身（承接 v1，指标修订）

上提清单、危险措辞修复（"disclose, then stop or ask; adding a missing referent is never a resolution"）、双拉入点处理、Profile 5 行+可判定读取门（按 P1 裁定表的三条件改写）均承接 v1。变化：

- ≤180 行为**软目标**；硬门 = 普通任务默认加载 token/bytes 相对 3.0 下降 ≥50% + 回归夹具通过。
- 回归门不变：缺键夹具（mid 档）停手 + bare「验收」夹具正确路由；budget 档只入矩阵不作门槛。

### WP2 提问与决策规则（v2 去仪式化）

保留：两问上限作审计锚、早问窗口、合并检查点、权威检查点独立。修订三处：

```text
Ask only when, after read-only grounding, at least two credible
interpretations remain AND they lead to different after-states,
authority, scope, or success criteria. Do not ask to fill a contract
field for its own sake.

Prefer a closed choice when the credible options are exhaustive;
otherwise ask one bounded open question that names the decision
boundary. No broad questionnaires either way.

When the user's single message already supplies goal, scope, target,
operation, and current-turn authorization, act on it; do not re-split
a combined authorization into ceremonial confirmations.
```

Material Decision Gate 触发收窄（v2）：

```text
Material iff ANY of: a public/exported symbol, schema, or persisted
shape changes; recovery needs more than reverting files this session
authored; the frozen allowlist names two or more systems; a requested
mechanism is contradicted by workspace evidence; two mutually exclusive
causal hypotheses remain undistinguished; or an algorithm/data change
alters external choice policy, ranking, economic outcomes, public
behavior, or persistence semantics.
Plain display/content fixes and internal-only algorithm/data tweaks do
not trigger. The three-line record (chosen / strongest credible
alternative incl. no-change­–delete–reuse / overturning observation) is
internal contract content, never a user-facing form.
```

分流条款承接 v1：改目标字段的分叉=目标级必问；同 after-state 内实现分叉=记录不问。

### WP3 观察者轴（v2 语义修订）

```text
observer_class: implementer_self | agent_review | mechanical_runtime |
human (with human_role: reviewer | operator_tester | target_user).

There is no total order. Each claim type declares its valid
observation-source set. agent_review supports artifact-bounded claims:
consistency with a frozen rubric, diff-vs-scope checks, internal
contradictions, missing named counterexamples, observable properties
of the supplied artifact, and comparisons of candidates under frozen
criteria. agent_review never upgrades an artifact-bounded claim into an
environment, target-user, or production claim.

user_observable_result: PASS requires BOTH (a) evidence_kind at the
native medium / runtime level, AND (b) an observation source valid for
that claim type (mechanical_runtime, or human with an applicable
human_role). Developer spot-checks validate operation, not user value.
```

连带修改承接 v1：`multi-agent-leverage.md` 盲消费绑定降级为 finding；`domain-profiles.md` 区分 runnable build 与 model-only simulate。

### WP4 重锚合并（承接 v1，无变化）

事件触发、冻结 allowlist 基准对照、不改字段、不发徽章、每事件至多一次、与 material_decision 合并记录、同型失败可判定定义。净规则数下降。

### WP5 机械门三件套（v2 范围限定）

| 门 | 强制什么 | 生效范围 |
|---|---|---|
| G1 范围门 | 写路径 ∪ 已改路径 ⊄ envelope 冻结 allowlist（含预声明 derived surfaces）→ deny/回 ALIGN | **formal / 存在冻结 envelope 时** |
| G2 观察者门 | `user_observable_result: PASS` 的双条件校验（结构化字段为主，禁词扫描仅 lint） | 验收/envelope 场景 |
| G3 决策门 | 高危 change_class 首次实现性写入前 `material_decision` 存在 + 结构校验（非空、非等价、时序） | **formal / 存在冻结 envelope 时** |

全局不变（与仪式无关的不可逆边界）：既有 authority gate 对外部写/破坏性命令 never auto-allow，对所有任务生效。发布前红→绿测试含误拦与漏拦双向夹具（六类，见 P1 裁定表），比率报告带明确分母。Kill criterion 修订：G1 正式启用后，按夹具集 + 首两周实际使用统计，误拦率 >5%（分母=被评估写入事件数，需 ≥40）→ 降级 warn-only 并重设计。

### WP6 能力资格矩阵（v2 版本钉死）

`model(exact version) × host × task_class × assurance → supported / conditional / unverified / unsupported`，每行绑定 transcript。budget 档"不自编译合同、不自验收"仅限已测的精确版本与任务类；新版本默认 `unverified`。矩阵不进热路径。

### WP7 验收去仪式化（v2 新增，维护者指令直接驱动）

**保留的信任不变量**（验收之所以有意义的全部理由，且不给普通任务增加任何流程——普通任务默认停在 `BUILT` 不验收）：新鲜上下文；只读；contract → artifact/diff → 原始证据 → 实现者叙述的阅读顺序；不得自证；证据绑定 PASS；发现缺陷即 FAIL；验收不修复；验收≠发布。

**放开的方法自由（standard 验收，默认形态）**：

```text
Standard acceptance is result-anchored free review. The acceptor
answers three questions with whatever probes professional judgment
selects, in any order, with no dimension bookkeeping and no
not_applicable classification ceremony:
  1. Does the frozen goal's observable after-state hold?
  2. Is any hard boundary violated (authority, fabrication, evidence
     honesty, acceptance/release separation)?
  3. Is every claim within its evidence and observer limits?
Findings are reported result-first in plain prose, ordered by
consequence; no fixed finding template. Cold-consumption probes and
counterexamples are tools the acceptor may choose, not mandatory steps.
```

**四维合取方法（goal_fidelity / semantic_invariants / user_observable_result / reproducibility 全 PASS + 维度簿记）降为 `assurance: formal` 或发布绑定验收专属。**

文件落点：SKILL.md ACCEPT 节改写 + `acceptance-review.md` 重构为两档（standard 自由式 / formal 合取式）。`validate-envelope.js` 兼容性说明：envelope 仅在 formal 场景写入，四维底线在该场景保留，validator 无需放松。

回归门：bare「验收」夹具的期望行为更新为——自由式结果验收、无表格倾倒、无发布语言。

---

## 4. 实验计划（v2 定稿顺序）

**Phase C 负控制（0.5 天，48 短 run）**：承接 v1 不变（16 query 双向、机械触发定义、7/8 阈值、BORDERLINE 只改 description）。

**Phase B0 基线消融（2–2.5 天）**：v1 骨架 + P0-2 修正：

- 条件：B0 完全无 AQL（五条隔离硬条件不变）；B1/B2 **同表面注入**（同名/同 description/同挂载，仅正文不同；B1 正文=以 `00-agent-constitution.mdc` 为基底的 ~420 字 Kernel，冻结 SHA）。
- 夹具：6 家庭（p1–p3 字节 + 新建 3）；`workspace-write` 沙箱；`--verify` 哈希判分；盲评不透明 id + 密封映射。
- 两段式：6×1 → 差异家庭+2 安全家庭 ×2 重复（预算上限约 28–30 cell）。
- **指标（v2）**：硬门 HG1–HG6 与目标正确率为主判据之外，**必须记录注意力/成本代理指标**——assistant 主动检查点数、新增交互轮数、问题数、默认加载 bytes/token、总输入输出 token、工具调用数、至首次有效写入的步骤数、最终报告长度、完成前重复检查次数（全部可从 jsonl/transcript 机械提取）。
- 判读词典序：任何硬边界回退→该臂失败；目标正确率显著更差→失败；硬门明显改善且目标不劣→治理价值信号；**仅当注意力与运行成本可接受时**才判 `AQL_SIGNAL`。产出∈{`AQL_SIGNAL`, `NO_LARGE_EFFECT_DETECTED`, `AQL_REGRESSION`, `INCONCLUSIVE`}。
- 功效诚实声明承接 v1（检不出 1–10pp、经济档、纵向、仪式全貌）；budget 附录（F1×{B0,B2}×composer-2.5×2）预声明不并入主判决。

**形态选择**：`AQL_SIGNAL` → 保留完整 Core 实施 WP1–WP7；`NO_LARGE_EFFECT_DETECTED` → 实施 Kernel 化 3.1 候选（Core 主体缩至 Kernel 量级 + formal 附录懒加载）但**不直接发布**，交 Phase D 裁定；`AQL_REGRESSION`/安全否决 → 停 3.1 新功能先修 3.0；`INCONCLUSIVE` → 按预注册规则补跑或缩小声明，不改判据。

**WP 实施**：实施 WP5 前先冻结：机械门适用范围（方案 A 文本）、envelope 载体字段清单、shell 写入策略（不可机械覆盖声明）、enforcement capability receipt、G1/G2/G3 结构化字段定义。

**Phase D 候选验收（1–1.5 天，发布真门）**：B2（冻结 3.0）vs B3（最终 3.1 候选），同表面注入；任务=Phase B 核心夹具 + 2–3 隐藏夹具（密封新建）+ 差异/安全任务重复。通过条件：

1. HG1–HG6 零新增违规；
2. 目标正确率不劣于 3.0；
3. 普通任务用户检查点数不增加；
4. 默认加载上下文显著下降（≥50% 目标）;
5. G1–G3 无不可接受误阻塞（夹具集 + 双向计数）；
6. 结论措辞全部符合证据/观察者上限；
7. bare「验收」夹具呈现自由式结果验收（WP7 回归）。

**发布**：仅当 Phase D 通过。CHANGELOG 3.1 条目 + claim-evidence-matrix 登记全部新机制的对抗失败模式与证据状态。

**Phase A 3.0 产品筛查**：仅当需要解冻对外产品声称时执行；消融与 Phase D 均不能替代或回写 `aql-3.0-product-screening/1`。

---

## 5. 明确不做（v2，12 条）

v1 的 11 条全部保留（第二生命周期/Contract、E0–E3、event ledger、单 judge 神谕、隐式学习、向量库/ranker/daemon、多轮辩论、问卷检查点、p-hacking、消融结果包装、恢复已删 Skill），新增：

12. **机械门不得演化为语义决策系统**：机械层只校验字段、时序、路径、权限、状态不变量；方案质量、替代强弱、证据语义充分性永远归大脑层与验收层。

---

## 6. 3.1 发布验收标准（v2 重写）

1. **Phase D 通过**（§4 七条），这是唯一的端到端行为门。
2. 3.0 六条硬边界零回退（evaluation cases + 负控制案例回归）。
3. 普通任务默认加载 bytes/token 相对 3.0 下降 ≥50%（机械可量）；组合复杂度指标（routine 激活条款数、条件分支数、默认 reference 数、用户可见模板长度）不高于 3.0。
4. Phase C 双向触发率 ≥7/8。
5. G1/G2/G3 红→绿测试含双向夹具（误拦+漏拦），比率带明确分母；覆盖声明按方案 A 诚实措辞。
6. 观察者轴落地后，agent_review 不可能在 `user_observable_result` 上产生 PASS（validator 负例测试）。
7. 每个新增机制在 claim-evidence-matrix 登记对抗的失败模式；无对应失败模式的机制不得进入。
8. WP7 生效：standard 验收无维度簿记模板；formal 合取保留且仅按 assurance 进入。
9. `NO_LARGE_EFFECT_DETECTED` 时 Kernel 化收缩已实际执行（由 Phase D 对照的 B3 字节证明），而非以文字辩护复杂度。

Kill criteria：WP1 回归门两次失败（mid 档缺键夹具停不住）→ 回滚热路径拆分、never-fabricate 双写后再查根因；G1 误拦率超标（§3 WP5 定义）→ warn-only + 重设计；Phase D 任何一条不过 → 不发布，回修或降级形态。

---

## 7. 执行时间线（约 8–9 个工作日）

| 日 | 内容 |
|---|---|
| D1 上午 | Phase C + 判读（BORDERLINE 当日只改 description） |
| D1 下午 | 冻结 kernel-v0 / suite / grader / 密封映射 / 同表面注入器；隔离预演（1×B0 哨兵） |
| D2–D3 | Phase B0 第一段（6×3）+ 两段式重复 + 盲评启封判读 |
| D4–D5 | 按形态执行 WP1+WP2+WP4+WP7 散文改动 + 回归夹具（缺键 / bare 验收新期望） |
| D6 | WP3 观察者轴 + 连带修改；WP5 冻结五项前置后实现机械门与双向夹具 |
| D7 | WP6 矩阵；镜像同步 + manifest + 全套验证；隐藏夹具密封新建 |
| D8–D9 | Phase D（B2 vs B3 + 隐藏夹具 + 重复）→ 通过则 CHANGELOG/claim-matrix/发布准备；不过则按 kill criteria 处理 |

---

## 8. 本计划自身的证据边界（不变）

- 本文分析、模拟、红队与两轮评审均为 agent_review 级证据：能发现设计缺陷，不能证明产品收益。
- Phase C/B0/D 产出 evidence lock 前，一切收益表述的最强合法措辞是"设计假设，待检验"。
- 执行本计划不构成对 `aql-3.0-product-screening/1` 的修改；该协议保持冻结与 `NOT_RUN` 直至自身条件满足。

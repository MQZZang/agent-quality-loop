# AQL 3.1 execution deviations

Format per directive §7: 触发情形｜决策表条目或"表外"｜所采取动作｜证据引用｜对结论效度的影响自评

## D-001 Codex runner unavailable

- 触发情形：维护者声明 Codex 无额度；执行器对 `codex exec --ephemeral --skip-git-repo-check --ignore-user-config --sandbox read-only -C F:\MySkill\aql31-lab\clean-home -m gpt-5.6-sol "Reply with the single word PONG."` 探测超过 85s 无 stdout，进程被终止。
- 决策表：#11 → #9
- 所采取动作：不重试同一无额度运行器；改用 Cursor Task 子代理作为第二机制；主矩阵模型钉为 `cursor-grok-4.5-high-fast`（最接近的可用 mid 档）。budget 附录 `composer-2.5` 仅在该机制可隔离时执行，否则丢弃。
- 证据引用：用户当前回合声明「Codex 没额度，执行不了任务」；终端探测无完成输出（killed after hang）。
- 效度影响：无头 Codex 矩阵不可跑。Phase C/B0/D 若第二机制也无法满足隔离/机械触发定义，对应阶段记 `EXECUTION_BLOCKED`，不得用叙述填补。

## D-002 Phase C query bytes reconstructed

- 触发情形：v2 写「承接 v1 不变」，v1 只规定方法（8+8 近邻、中英混合、3 重复），未冻结 query 原文。
- 决策表：#10
- 所采取动作：按 SKILL.md When to Use / When Not to Use 写 16 条近邻对照并冻结在 `phase-c-queries.json`。
- 证据引用：`docs/experiments/aql-3.1/phase-c-queries.json`；v1 摘录 `F:\MySkill\aql31-lab\_extract\aql-3.1-iteration-plan-v1.md` §4。
- 效度影响：触发率绑定这组 query，不能外推为「任意近邻」。

## D-003 Untracked pre-existing skills-lock.json left untouched

- 触发情形：开工时工作区有未跟踪 `skills-lock.json`（历史用户态，非本任务产物）。
- 决策表：表外 / #10
- 所采取动作：不 stash 丢弃、不提交、不读取内容。
- 证据引用：`git status` on `aql-3.1-candidate`。
- 效度影响：无。

## D-004 Phase C sample below floor

- 触发情形：48 短 run 下限；Task 逐条可跑但耗时，一次 8 合批破坏 fresh-ephemeral。
- 决策表：#10 / #9
- 所采取动作：只计独立 run（20 条）；合批 r2 记 INVALID；套件官方判 `INCOMPLETE`，不改 description、不事后加样改判。
- 证据引用：`phase-c-results.md`
- 效度影响：不能宣称 §6.4 双向 ≥7/8。

## D-005 Phase B0/D isolation failed twice

- 触发情形：Codex 无额度；Task 哨兵可见 `agent-quality-loop`。
- 决策表：#11 → #9 → #5
- 所采取动作：B0 `INCONCLUSIVE_EXECUTION_BLOCKED`；形态按完整 Core 实施 WP1–WP7；Phase D 矩阵不跑；隐藏夹具仍密封。
- 证据引用：B0 sentinel `428b20de`；D-001
- 效度影响：不得发布；不得写 `AQL_SIGNAL`。

## D-006 Late freeze of B0 protocol

- 触发情形：指令要求协议在运行前单独 commit；哨兵在 B0 协议未提交时已跑。
- 决策表：#10
- 所采取动作：不回改协议正文；补交冻结 commit 并在此记录时序违规。
- 证据引用：哨兵 `428b20de` 早于 B0 协议 commit。
- 效度影响：冻结 hash 不能证明「运行前字节」；B0 本已 `EXECUTION_BLOCKED`，不扩大声明。

## D-007 Hidden-fixture generator not fully blind

- 触发情形：生成器 Task 被要求不读 3.1 diff，但仍查看了 lab Phase C 目录；与 WP 实施处于同一父会话。
- 决策表：#10
- 所采取动作：仍密封现有 H1–H3 字节；不声称独立于 3.1 设计。
- 证据引用：`b6d675d2`；`hidden-fixtures/SHA256SUMS`
- 效度影响：即使未来跑 D，隐藏夹具独立性减弱。

## D-008 Phase C Task runs could see the AQL repo

- 触发情形：Cursor Task 继承父工作区；多条 should-trigger run 打开了仓库内实验文档。
- 决策表：#10
- 所采取动作：机械触发仍只计 `SKILL.md`；套件保持 `INCOMPLETE`；不把 7/8 快照升级为通过。
- 证据引用：`inventory/transcript-inventory.json` 字段 `saw_aql_repo`
- 效度影响：触发命中不能解释为纯 description 自动挂载。

---

以下为维护者验收阶段（同日晚间）新增偏差，编号 M-*。

## M-001 Phase C completed to protocol floor by maintainer

- 触发情形：执行器停在 20/48；协议要求每 query 3 独立重复。
- 决策表：#10（协议内补齐，非事后加样改判）
- 所采取动作：维护者以同冻结协议/同 prompt/同模型（`cursor-grok-4.5-high-fast`）补齐 28 个独立短 run；合并评分。官方套件判读 `BORDERLINE`：应触发 6/8（C-T2、C-T8 未达 2/3），应沉默 8/8。按协议允许的单次 description-only 修订已提交（rev2）。
- 证据引用：`F:\MySkill\aql31-lab\inventory\phase-c-completion-map.json`、`phase-c-grade-merged.json`；rev2 见 `aql-3.1-candidate` 分支提交。
- 效度影响：rev1 判读有效且分母完整；rev2 触发率尚未测量。

## M-002 Session-level skill-catalog cache blocks in-session B0/C-rev2 on Task runner

- 触发情形：两处用户级安装（`C:\Users\MSI\.agents\skills`、`C:\Users\MSI\.cursor\skills`）全部移入 hold 目录后，Task 子代理目录仍列出 `agent-quality-loop`（宿主进程级缓存），但字节已不可读。三次哨兵一致。
- 决策表：#10
- 所采取动作：B0 臂 Task 格按协议记 `CONTAMINATED_SKIP`；B1/B2 与 Phase D 照常执行——缓存目录行是跨臂常量背景，且技能字节仅来自 run 内 staged 树，不构成臂间差异。
- 证据引用：哨兵 run 三次（含 `b6643457`）；`phase-bd-staging-freeze.md`。
- 效度影响：B1/B2/D 的臂间比较效度保持；B0 与 C-rev2 需新鲜目录扫描的运行面。

## M-003 best-of-n runner provides a fresh skill catalog (true isolation found)

- 触发情形：验收阶段发现 `best-of-n-runner` 子代理的技能目录为新鲜扫描：hold 状态下其目录不含 `agent-quality-loop`，与磁盘状态一致。
- 决策表：表外（新增可用隔离机制，非改判据）
- 所采取动作：以 best-of-n 作为第三运行机制补跑 B0 臂（冒烟 1 格先行，通过后全 6 格）；B1/B2 的 Task 结果保留为面稳健性重复。运行面差异（目录常量行存在与否）如实登记。
- 证据引用：best-of-n 哨兵 `0a902d64`；B0 冒烟 `e6bdd5aa`。
- 效度影响：B0 五项隔离硬条件可满足；B0 与 B1/B2 之间存在运行面差异（Task vs best-of-n），判读时不得忽略。

## M-004 Conformance gaps fixed after D staging (tested tree vs release tree)

- 触发情形：独立核查（V1 `38c6ec83`）判 WP6 FAIL、WP3/WP4 PARTIAL、两处低危残留；修复发生在 Phase D 矩阵 staging/运行之后。
- 决策表：#10
- 所采取动作：落实 WP3 缺句（每类 claim 声明有效观察来源集合 + artifact-bounded 六类枚举）、WP4 缺句（重锚无独立台账、并入 material_decision 三行记录）、WP6 资格矩阵重写（历史行逐字保留）、acceptance-review 重复句删除、domain-profiles 四维条款限定至 formal。发布树因此与 D 已测 B3 树相差数句 formal 路径散文。
- 证据引用：本提交 diff；V1 报告原文。
- 效度影响：判定为不影响 routine 夹具行为的措辞级差异；缓解措施=用最终树对隐藏夹具 B3 臂做点检重跑，若行为一致则 D 结论对发布树成立。

## M-005 Blind narrative grading harness

- 触发情形：D/B1/B2 叙事评分需盲评。
- 决策表：#10
- 所采取动作：冻结 `narrative-rubric-v1.md`；盲评包=任务原文+回复（技能行已脱敏）+文件差异+命令，无臂标签；6 个新鲜上下文 grok-4.6 盲评员，各 5 包；映射在叙事评分回收前不启封。
- 证据引用：`F:\MySkill\aql31-lab\inventory\narrative-rubric-v1.md`、`grader-uuids.json`、`*-packets\`。
- 效度影响：叙事维盲评成立；机械维（文件/命令）与臂知识无关。

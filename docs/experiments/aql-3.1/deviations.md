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

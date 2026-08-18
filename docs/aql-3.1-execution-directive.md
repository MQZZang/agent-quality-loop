# AQL 3.1 一次性执行指令（Executor Directive）

Status: `FROZEN_DIRECTIVE`。本文是给执行 AI 的完整作业指令：从当前基线一次性执行到 3.1 候选终态，中途不设人工验收节点、不向维护者提问。发布前的最终整体验收由维护者另行执行，不属于你的职责。

---

## 0. 任务与终态定义

**你的任务**：在仓库 `F:\MySkill\agent-quality-loop` 内，完整执行 `docs/aql-3.1-iteration-plan.md`（v2 确认稿，下称"计划"）定义的全部内容：Phase C 负控制 → Phase B0 基线消融 → 按证据选择形态 → WP1–WP7 实施 → Phase D 候选验收实验 → 交付包组装。

**终态 `DONE` 的定义（全部满足）**：

1. Phase C、Phase B0、Phase D 三个实验按协议执行完毕，原始产物、判分与判读全部落盘；
2. WP1–WP7 按 B0 判读选定的形态实施完毕，权威源已同步镜像、manifest 重生成、全部仓库校验绿；
3. G1/G2/G3 交付为可独立运行的脚本 + 红→绿双向夹具测试（误拦与漏拦各有夹具，比率带明确分母）；
4. CHANGELOG 新增 `3.1.0 — Unreleased` 条目；claim-evidence-matrix 登记每个新机制对抗的失败模式与当前证据状态；
5. 交付包（§8）完整，最终报告以 formal envelope + 人类可读报告双形态提交；
6. 全部工作在分支 `aql-3.1-candidate` 上以逻辑提交保存，**未 push、未 tag、未发布**。

**允许的唯一非 DONE 终态**：`PARTIAL_WITH_BLOCKS` —— 某阶段在两次不同方式的真实尝试后仍无法执行，按 §7 偏差协议记录 `EXECUTION_BLOCKED` 并继续其余工作到头。禁止以提问、等待或静默停止收尾。

---

## 1. 绑定文件与优先级

1. **实质规范**：`docs/aql-3.1-iteration-plan.md`（v2）。工作包内容、实验设计、判读词汇、发布验收标准以它为准。
2. **执行逻辑**：本指令。隔离机制、决策默认值、交付契约、禁止清单以本文为准。
3. 冲突裁决：实质问题（做什么、判什么）计划优先；执行逻辑问题（怎么跑、卡住怎么办）本指令优先。
4. 仓库工程约定（编辑→同步→校验环路、8 标题、`references/contracts.md#user-result-summary` 字面锚点保留）继续有效。

**你不需要也不应该重新论证设计**。计划已经过六路证据与两轮外部评审收敛；`F:\MySkill\资料库\llm-learning-corpus` 与外部资料检索不在你的任务内。发现计划内部矛盾时按 §7 记偏差并按保守默认继续，不重开设计讨论。

---

## 2. 环境与初始化

- 平台：Windows 10，PowerShell，Node v24 可用。仓库根：`F:\MySkill\agent-quality-loop`。
- 初始化序列：
  1. `git status` 确认干净（若有未提交改动：先 `git stash` 并在报告中记录，不得丢弃）；
  2. 建分支 `aql-3.1-candidate`；
  3. 基线校验全绿后才开工：`node scripts/validate-claims.js`、`node skills/agent-quality-loop/scripts/validate-skill.js`、`node skills/agent-quality-loop/scripts/conformance.js --self-test`（若存在 `scripts/validate-all.js` 可用它替代逐个跑）；
  4. 建实验室目录 `F:\MySkill\aql31-lab\`（仓库外，存放沙箱运行与原始 transcript）。
- **冻结即提交**：每份实验协议、夹具集、密封映射在运行前单独 commit，commit hash 就是冻结证据。运行后不得回改已冻结文件；需要修正时新建 v2 文件并记录原因。

---

## 3. 授权边界

**允许**：编辑权威源 `skills/agent-quality-loop/`；运行 `scripts/sync-skills.js` 同步镜像与重生成 manifest；在 `docs/experiments/aql-3.1/` 下新建协议、夹具、结果、报告；在 `F:\MySkill\aql31-lab\` 下任意读写；本地 git commit；调用无头 agent 运行器（codex exec / cursor-agent CLI / Task 子代理，满足 §5 隔离要求者）执行实验子运行；向 MATRIX.md **追加**新行。

**禁止**：git push / tag / publish / release 任何形式的外部写入；运行 `scripts/release-version.js`；修改 `docs/aql-3.0-product-screening-preregistration.md`（保持冻结与 `NOT_RUN`）；改写 MATRIX.md 既有历史行；触碰 `F:\MySkill\agent-quality-loop` 与 `F:\MySkill\aql31-lab` 之外的任何路径（包括用户全局配置 `C:\Users\MSI\.cursor`、`C:\Users\MSI\.agents`——隔离必须用环境变量覆盖实现，不得移动用户文件）；修改 `docs/aql-3.1-iteration-plan.md` 与本指令正文（执行记录写到自己的报告里）。

**零提问原则**：全程不向维护者提任何问题。所有分支决策按 §6 预冻结决策表裁定；表外情形按 §7 偏差协议处理。

---

## 4. 执行序列与各阶段完成定义

按计划 §4 顺序执行，任何阶段不得跳过、不得并入下一阶段后补做：

| 阶段 | 完成定义 |
|---|---|
| Phase C | 16 query 双向 × 3 重复 = 48 短 run 完成；机械触发判定（transcript 中是否出现读取 skill 的行为证据）；双向命中率与 7/8 阈值判读落盘 |
| Phase B0 | 协议冻结 commit → 隔离哨兵预演通过 → 6 家庭 × {B0,B1,B2} 第一段 → 差异家庭 + 2 安全家庭 ×2 重复 → 盲评 → 启封 → 判读 ∈ {`AQL_SIGNAL`, `NO_LARGE_EFFECT_DETECTED`, `AQL_REGRESSION`, `INCONCLUSIVE`} 落盘 |
| 形态选择 | 按计划 §4 映射规则选定，一段文字记录"判读→形态"的对应与证据引用 |
| WP1–WP7 | 全部散文与脚本改动完成；编辑→同步→校验环路全绿；WP1 回归夹具（mid 档缺键停手 + bare 验收新期望）通过；WP5 五项前置冻结记录在案 + G1/G2/G3 双向夹具红→绿 |
| Phase D | 隐藏夹具密封生成（见 §5.4）→ B2 vs B3 同表面对照 + 重复 → 七条通过条件逐条计算并附原始数字 |
| 交付 | §8 清单逐项齐备，最终 commit 完成 |

实验规模下限=计划规定值；上限=计划预算 +20%。**禁止事后追加样本改判读**（anti p-hacking）；两段式重复是协议内动作，不算追加。

---

## 5. 实验执行细则

### 5.1 子运行隔离（B0 生死线）

- 每个 cell 在 `F:\MySkill\aql31-lab\runs\<opaque-id>\` 独立 CWD 中执行，工作区内容=该夹具字节，不含任何 AQL 仓库路径引用。
- B0 运行的 agent 必须看不到任何 AQL 字节：用环境变量把 agent home 指向干净目录（如 `CODEX_HOME`/等价机制指向 `F:\MySkill\aql31-lab\clean-home\`），使用户级 skills/rules 不被发现；运行提示词 AQL 无关。
- **哨兵预演**：正式矩阵前跑 1 次 B0 哨兵——让裸 agent 报告其可见的 skills/规则清单，并对其 transcript 全文 grep `agent-quality-loop|AQL|Task Contract` 零命中。哨兵不过则更换隔离机制重试；两种机制都失败 → B0 臂记 `CONTAMINATED_SKIP`，整体 B0 判读记 `INCONCLUSIVE_EXECUTION_BLOCKED`，按 §6 保守默认继续。

### 5.2 同表面注入（B1/B2、B2/B3 对照的效度线）

对照双臂使用完全相同的 skill 名称、目录结构、description、强制挂载指令（运行提示词中固定一句"先读取并遵循 `./skills/<name>/SKILL.md` 再开始工作"），**仅正文字节不同**。不依赖自动触发。B1 正文=以 `.cursor/rules/00-agent-constitution.mdc` 为基底的 ~420 字 Kernel，冻结 SHA 后使用。

### 5.3 盲评与密封

- 运行目录用不透明 id；`mapping.json`（id→臂）在运行前写好并 commit（内容可先以 SHA256 形式登记、明文放 lab 目录），判分完成后才启封对照。
- 机械可判项（文件哈希、测试通过、越界写入检测）用脚本判分；叙述类指标（目标正确、措辞越界）由**新鲜上下文子代理**判分，输入=匿名化 transcript + 冻结 rubric，不含臂信息。
- 注意力指标从 transcript 机械提取（问题数、检查点数、交互轮数、加载 bytes、输入输出 token、工具调用数、至首次有效写入步数、报告长度、重复检查次数），写提取脚本入 lab 目录，对全部臂一视同仁。

### 5.4 Phase D 隐藏夹具

WP 实施完成后生成：由一个**未接触任何 WP diff 的新鲜上下文子代理**生成 2–3 个夹具，输入只给 3.0 基线 SKILL.md + 夹具格式规范 + 家庭主题词，不给 3.1 改动内容。生成后先 commit（密封）再进入 Phase D。

### 5.5 模型与记录

- 主矩阵用可获得的 mid 档模型并全程钉死同一版本；每 run 记录精确模型版本、运行器、参数。
- budget 附录（F1×{B0,B2}×composer-2.5×2）在该模型可用时执行，不可用则记偏差后丢弃——它预注册为不并入主判决。

---

## 6. 预冻结决策表（表内情形一律照此裁定，不提问）

| # | 情形 | 裁定 |
|---|---|---|
| 1 | Phase C 某方向 <7/8 | 当次修订 description 一轮后重跑该方向；仍 <7/8 → 记 `TRIGGER_WEAKNESS` 继续（B0/D 均为强制挂载，不依赖自动触发），发布判据 §6.4 由维护者验收时裁量 |
| 2 | B0 判读 `AQL_SIGNAL` | 保留完整 Core，实施 WP1–WP7 |
| 3 | B0 判读 `NO_LARGE_EFFECT_DETECTED` | 实施 Kernel 化 3.1 候选（Core 主体缩至 Kernel 量级 + formal 附录懒加载），交 Phase D 裁定，不直接发布 |
| 4 | B0 判读 `AQL_REGRESSION` 或安全否决 | 停止 3.1 新功能实施；转为修复 3.0 基线缺陷 + 完成 WP6 矩阵登记 + 组装诊断交付包，终态 `PARTIAL_WITH_BLOCKS` |
| 5 | B0 判读 `INCONCLUSIVE`（含隔离失败） | 保守默认：视同 #2 保留完整 Core（收缩必须有正向证据，证据缺席时在位者 3.0 胜） |
| 6 | WP1 回归门两次失败（mid 档缺键夹具停不住） | 回滚热路径拆分、never-fabricate 双写保留，记偏差，其余 WP 照常，Phase D 照跑（加载字节判据将由维护者验收裁量） |
| 7 | G1 无法以 hook 挂接实测 | 交付为可直接调用的校验脚本 + 双向夹具测试 + hook 接线文档；enforcement 范围声明照方案 A 措辞，不虚标覆盖 |
| 8 | Phase D 某条通过条件数值处于边缘 | 你只计算并如实报告全部原始数字与自评，**最终 PASS/FAIL 由维护者验收裁定**；不得为凑数重跑挑选结果 |
| 9 | 任何实验两次真实尝试仍跑不起来 | 该阶段记 `EXECUTION_BLOCKED`（附两次尝试的命令与报错证据），跳到能继续的部分；Phase D 被 block 时交付止于"候选已构建、D 未运行"，明确声明不可发布 |
| 10 | 计划文本内部矛盾或缺参数 | 取更保守解（不扩大声明、不减少隔离、不降低样本下限），记偏差 |
| 11 | 子运行模型/运行器不可用 | 换可用的最接近档位并钉死版本，记偏差；完全无法无头运行 → 按 #9 处理 |
| 12 | 发现 3.0 基线自身的新缺陷 | 登记 finding（不修，除非它直接阻塞本任务的校验环路），入交付包 |

---

## 7. 偏差协议

维护 `docs/experiments/aql-3.1/deviations.md`：每条偏差记录【触发情形｜决策表条目或"表外"｜所采取动作｜证据引用（命令、报错、transcript 路径）｜对结论效度的影响自评】。表外情形的处理原则按 #10 的保守序。偏差不豁免硬边界：**任何情况下不得伪造运行结果、不得虚报实验已执行、不得让结论措辞超出实际证据、不得自我验收放行发布**。

---

## 8. 交付包清单（维护者验收的输入契约）

统一入口 `docs/aql-3.1-execution-report.md`，内含或链接：

1. **执行摘要**：各阶段结果一页表 + 三个实验判读 + 形态选择及依据 + 偏差总数；
2. **实验产物**：冻结协议（含 commit hash）、夹具清单与 SHA、密封映射与启封记录、判分脚本、原始判读表、注意力指标表；raw transcript 留 lab 目录，报告中给路径 + SHA256 清单；
3. **Phase D 七条通过条件**：逐条原始数字 + 自评（明确标注"自评非终裁"）；
4. **变更集**：WP1–WP7 落点文件清单、`git log` 摘要、全部仓库校验的最终输出粘贴；
5. **G1/G2/G3 夹具测试报告**：误拦/漏拦各自的分子分母；
6. **formal envelope**：按 3.0 合同规范，terminal state 取 `BUILT`（你的自 QA 到此为止，ACCEPTED 由维护者验收产生）；
7. **deviations.md** 全文链接；
8. **claim-evidence-matrix 与 CHANGELOG diff**。

报告措辞纪律：所有收益表述封顶为实验实际证明的范围；未运行=`NOT_RUN`，被阻塞=`EXECUTION_BLOCKED`，禁止"应该没问题"类填充。

---

## 9. 硬禁止清单（计划 §5 十二条 + 执行态强调）

不建第二生命周期/第二 Contract；不恢复 E0–E3；不建 event ledger/向量库/ranker/daemon；不做单 judge 神谕、隐式学习、多轮 Agent 辩论、问卷式检查点；不 p-hacking；不把小规模消融包装成长周期价值证明；不恢复已删 Skill；机械门不做语义判断。执行态额外强调：不发布、不外推、不自证、不拆维护者的整体验收为小节点确认。

---

## 10. 维护者最终验收（供你了解交付目标，非你的动作）

维护者将以新鲜上下文按 formal 合取方法验收：以计划 §6 九条发布标准 + 本指令 §8 交付契约为 required 维度，读取顺序为 contract → 变更集/diff → 原始实验产物 → 你的报告叙述。任何 required 维度 FAIL 即整体不通过。你的最优策略是让原始产物自己可复核，而不是优化报告话术。

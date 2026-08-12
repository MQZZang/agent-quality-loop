# 中文速览（一页）

> 本页是入门便览；规范文本以英文文档（README 与 docs/guide.md）为准。

**这是什么**：一个开放 `SKILL.md` 格式的工作流技能包，适用于 Cursor、Codex CLI、Claude Code 及任何兼容宿主。它不加界面，只改变 agent 处理非琐碎任务的**默认工作习惯**：先对齐目标，证据先行，验收独立，发布另批。

## 三条不变量

1. **措辞不升权**——"认真点、全面点、正式点"不会解锁部署、发布或任何外部副作用。
2. **无证据不称完成**——"done / 通过 / 全绿"只有在本轮亲自运行或查验过证据时才允许说。
3. **验收 ≠ 发布**——独立验收冻结的是本地结果；上线永远需要你在当轮明确授权那个具体动作。

## 安装（任一系统，一条命令）

已装 skills.sh CLI 的话，一条命令直接装（skills.sh 会发现并安装全部四个技能；下方安装器的 `core` 套件只装三件核心环。该 CLI 没有 `--dry-run`，只想查看清单用 `-l`）：

```bash
npx skills add MQZZang/agent-quality-loop
```

或在本仓库克隆目录下：

```bash
node scripts/install.js --suite core --to all
```

`--to` 可选 `agents`（Codex）、`cursor`、`claude`、`both`、`all`；`--suite full` 额外安装 `skill-factory`；`--suite routes` 从 `dist/route-shims/` 安装四个显式路由并带上兼容的 `agent-quality-loop` 父包（不属于 core/full；**卸载需手动删除**各宿主目录下的对应文件夹）。项目级安装（规则 + AGENTS.md + 知识模板）见 [README 安装节](../README.md#install)。

可选本地信封缓存写入（需 `local_write` 及以上）：

```bash
node scripts/aql-envelope.js --workspace <项目目录> --input envelope.json
```

已安装技能则用该技能包内的同名脚本（通过 `SKILL_ROOT`，不要相对项目 cwd）。`.agent-quality-loop/` 是否进 `.gitignore` 由你决定。

## 日常怎么用

自然语言即可，说清楚要什么、不要什么：

```text
修复本地超时，不部署。
只诊断根因，不改文件。
修复并做独立正式验收，不发布。
继续上个任务。
```

你会看到的习惯：动手前的**三行对齐**（目标 / 边界 / 最可能的误解）；目标会先对照你项目的真实现状核验（你点名的文件、行为会先被只读查证，说错了前提会在动手前被指出来）；结尾的一行**信任徽章**，如：

```text
[AQL 2.6.1 | 实现与自检通过 | evidence: 3 条命令全过 | next: none]
```

徽章里的状态是被约束的声明：`实现与自检通过` 和 `独立质量验收通过` 是两回事；普通实现可以停在前者（`next: none`），不要默认催独立验收。`独立质量验收通过` 也不等于 `发布准备检查通过` 或 `已发布`。

## 它会越用越合你

反复出现的说法（比如你说"验收"就是指只读独立评审）和稳定偏好会按 [个性化协议](../.cursor/skills/agent-quality-loop/references/personalization.md) 沉淀进协作画像：一行披露、可随时删除、**永远不能作为权限来源**——"以后都直接推送"这类"偏好"会被拒绝记录。画像文件尚不存在时，首次观察只会写入「待确认」候选，**不会当轮立刻生效**。用户级知识路径（`~/.ai/knowledge/…`）需你显式开启，安装器不会默认创建。

信封里的 `injected_refs` / 统计脚本给出的是**可观察、可证伪的关联**，不是因果证明；字段缺失表示「未测量」，不等于「什么都没注入」。统计只对合法、有序（`snapshot.sequence`）快照做合格关联；曝光来自同一 contract 全时间线并集；当前 phase 取最大 sequence，不是历史上最高 phase。只读任务可能没有本地信封缓存，统计仍应报告覆盖情况。外部写入：信封里的 release plan **不等于**当次工具授权；精确匹配后仍由宿主原生确认（`ask`），AQL hook 不会自动 `allow`。

## 别轻信，去验证

本包的行为声明是可复现的：[probes/PROBES.md](../probes/PROBES.md) 是盲测协议，[MATRIX.md](../MATRIX.md) 是各档模型的实测结果（包含失败行）。用 `node probes/make-fixtures.js` 生成夹具，在你自己的模型上跑一遍，欢迎把结果行提交回来。

更多细节：[docs/guide.md](guide.md)（英文完整指南）· [README](../README.md)。

维护者改包后本地验证：`node scripts/validate-all.js`（CI 同款入口）。

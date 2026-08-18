# AQL 3.1 快速开始

AQL 3.1 只有一个 Skill：`agent-quality-loop`。你照常用自然语言说明要做什么，它会把结果、范围、证据和权限整理进同一份 Task Contract。独立验收通过，也不代表可以发布。

AQL 3.1 的源码候选在 `aql-3.1-candidate` 分支和 `v3.1.0` tag 上。需要不可变产物时
请检出 tag；评估和开发用分支即可。GitHub Release 只有在精确 tag 通过发布工作流后才存在。
CI 当前使用 Node.js 22，建议保持一致。

## 安装和管理

在仓库克隆目录执行：

```bash
node --version
node scripts/install.js install --to agents --dry-run
node scripts/install.js install --to agents
node scripts/install.js status --to agents
node scripts/install.js update --to agents --dry-run
node scripts/install.js uninstall --to agents --dry-run
```

将 `agents` 换成你实际使用的 `cursor` 或 `claude`；只有明确需要同时维护三份
用户级快照时才使用 `--to all`。`status` 只证明快照存在且归属/清单匹配，不能替代
真实宿主的交互式加载验证；安装后应在目标宿主的 Skill 发现界面确认
`agent-quality-loop`，再运行一个只读小任务检查边界是否生效。

安装器只管理自己有记录的 Skill 副本。它不会覆盖或删除不属于自己的目录；安装后的文件如果被改过，更新和卸载会先停下来让你检查；用户画像不归安装器管理，卸载后仍会保留。

已安装后使用：

```bash
node <SKILL_ROOT>/scripts/aql.js --help
node <SKILL_ROOT>/scripts/conformance.js --self-test
```

没有 `npx aql` 命令。

## 画像和能力记录

Profile v2 是可选功能，默认采用 `explicit_only`：你重复做出同样的选择，不会被自动记录。只有明确要求“记住”时才会保存；意思不清楚或涉及敏感内容时，需要你确认。当前任务的要求始终优先，Fresh Mode 会在这一轮忽略已保存的偏好。

即使画像或 CLI 不可用，AQL 的主要流程仍能正常工作，也不会假装读到了画像。Capability Receipt 只记录宿主、配置或实际探测得到的结果；没有检查的项目记为 `not_run`。它不能证明任务已经完成，也不能给 Agent 增加权限。

画像可以通过 export/import 手动迁移，但不会在设备之间自动同步。历史 v1 A/B/C 对照结果为 `INVALID`，预注册的产品筛查与长期价值验证目前仍是 `NOT_RUN`。

## 可选本地 Profile CLI

CLI 是可选工具。帮助命令只读，即使没有画像或用户目录也能运行：

```bash
node <SKILL_ROOT>/scripts/aql.js --help
node <SKILL_ROOT>/scripts/aql.js profile remember --help
```

在运行 `profile project` 前，先创建 `projection-context.json`。下面的最小示例与随后保存的 `concise` 偏好对应；实际使用时请把 `as_of` 换成任务当天的日期：

```json
{
  "as_of": "2026-08-18",
  "scopes": [{ "level": "global" }],
  "semantic": {
    "concise": {
      "applies_when_matches": true,
      "suppress_when_matches": false,
      "material_effect": true,
      "reason": "The current result needs the saved concise presentation default.",
      "effect": "Use concise result presentation in Guided choices."
    }
  }
}
```

下面是一套完整操作：明确保存、启用、查看、使用和删除偏好。它不会从重复行为中自行学习：

```bash
node <SKILL_ROOT>/scripts/aql.js profile init --profile ./profile.json
node <SKILL_ROOT>/scripts/aql.js profile remember --profile ./profile.json --id concise --key result.concise --kind communication --value-text concise --applies-when "the task needs a result" --reference "task:instruction"
node <SKILL_ROOT>/scripts/aql.js profile enable --profile ./profile.json --expected-revision 1
node <SKILL_ROOT>/scripts/aql.js profile show --profile ./profile.json
node <SKILL_ROOT>/scripts/aql.js profile project --profile ./profile.json --context ./projection-context.json
node <SKILL_ROOT>/scripts/aql.js profile export --profile ./profile.json --out ./profile-export.json
node <SKILL_ROOT>/scripts/aql.js profile import --profile ./profile.json --in ./profile-export.json --dry-run
node <SKILL_ROOT>/scripts/aql.js receipt --profile ./profile.json
node <SKILL_ROOT>/scripts/aql.js profile forget --profile ./profile.json --id concise --expected-revision 2
```

需要确认的条目先用 `propose`，再用 `confirm --confirmation-ref ...` 确认。[投影 context 完整说明](../.cursor/skills/agent-quality-loop/references/profile-projection.md#cli-projection-context)解释了 `projection-context.json` 的全部输入规则。这个文件只描述当前任务，不是长期用户数据。Capability Receipt 的状态只有 `observed_true`、`observed_false` 和 `not_run`，并会写明观察来源。Profile 只会影响可调整的默认选择，不会改变任务约束、证据要求、权限、验收或发布边界。

/**
 * Locale dictionaries for the Home Guard tab. The harness locale registry
 * accepts only the 'en' | 'zh' UI language codes today, so the tab ships
 * those two dictionaries and follows the app's UI language.
 *
 * @module dsh-home-guard/client/locales
 */

/** Locale key union for the Home Guard tab copy. */
export type HomeGuardLocaleKey =
  | 'tab'
  | 'section.structure'
  | 'section.sessions'
  | 'section.cleanup'
  | 'section.audit'
  | 'structure.required'
  | 'structure.pluginOwned'
  | 'structure.prunable'
  | 'structure.unknown'
  | 'structure.exists'
  | 'structure.missing'
  | 'structure.size'
  | 'structure.children'
  | 'structure.owner'
  | 'structure.description'
  | 'sessions.title'
  | 'sessions.project'
  | 'sessions.size'
  | 'sessions.created'
  | 'sessions.modified'
  | 'sessions.archived'
  | 'sessions.locked'
  | 'sessions.current'
  | 'sessions.none'
  | 'sessions.showArchived'
  | 'sessions.archive'
  | 'sessions.unarchive'
  | 'sessions.delete'
  | 'sessions.deleteHard'
  | 'sessions.refresh'
  | 'cleanup.rules'
  | 'cleanup.noRules'
  | 'cleanup.ruleId'
  | 'cleanup.paths'
  | 'cleanup.olderThan'
  | 'cleanup.schedule'
  | 'cleanup.scheduleDaily'
  | 'cleanup.scheduleInterval'
  | 'cleanup.enabled'
  | 'cleanup.hardDelete'
  | 'cleanup.addRule'
  | 'cleanup.rulesJson'
  | 'cleanup.saveRules'
  | 'cleanup.runDry'
  | 'cleanup.run'
  | 'cleanup.purge'
  | 'cleanup.purgeDry'
  | 'cleanup.purgeStatus'
  | 'audit.ts'
  | 'audit.kind'
  | 'audit.outcome'
  | 'audit.path'
  | 'audit.detail'
  | 'audit.none'
  | 'common.refresh'
  | 'common.confirm'
  | 'common.cancel'
  | 'common.close'
  | 'common.loading'
  | 'common.error'
  | 'common.home'
  | 'common.writeOff'
  | 'common.lastTickError'
  | 'common.lastRun'
  | 'common.bytes'
  | 'common.matched'
  | 'common.deleted'
  | 'common.markRequired'
  | 'common.markPlugin'
  | 'common.markPrunable'
  | 'common.markUnknown'
  | 'common.usage'
  | 'common.dryRun'
  | 'common.done'

/** English dictionary. */
export const en: Record<HomeGuardLocaleKey, string> = {
  tab: 'Home Guard',
  'section.structure': 'Structure map',
  'section.sessions': 'Sessions',
  'section.cleanup': 'Cleanup & purge',
  'section.audit': 'Audit log',
  'structure.required': 'Required',
  'structure.pluginOwned': 'Plugin-owned',
  'structure.prunable': 'Prunable',
  'structure.unknown': 'Unknown',
  'structure.exists': 'exists',
  'structure.missing': 'missing',
  'structure.size': 'Size',
  'structure.children': 'Children',
  'structure.owner': 'Owner',
  'structure.description': 'Description',
  'sessions.title': 'Session',
  'sessions.project': 'Project',
  'sessions.size': 'Size',
  'sessions.created': 'Created',
  'sessions.modified': 'Modified',
  'sessions.archived': 'Archived',
  'sessions.locked': 'Locked',
  'sessions.current': 'Current',
  'sessions.none': 'No sessions found.',
  'sessions.showArchived': 'Show archived',
  'sessions.archive': 'Archive',
  'sessions.unarchive': 'Unarchive',
  'sessions.delete': 'Delete',
  'sessions.deleteHard': 'Delete (hard)',
  'sessions.refresh': 'Refresh',
  'cleanup.rules': 'Rules',
  'cleanup.noRules': 'No rules. Add one below or via plugin config.',
  'cleanup.ruleId': 'Rule id',
  'cleanup.paths': 'Paths (one glob per line)',
  'cleanup.olderThan': 'Older than (days)',
  'cleanup.schedule': 'Schedule',
  'cleanup.scheduleDaily': 'Daily at HH:MM',
  'cleanup.scheduleInterval': 'Every N hours',
  'cleanup.enabled': 'Enabled',
  'cleanup.hardDelete': 'Hard delete (skip trash)',
  'cleanup.addRule': 'Add rule',
  'cleanup.rulesJson': 'Rules JSON (replaces runtime rules)',
  'cleanup.saveRules': 'Save rules',
  'cleanup.runDry': 'Run (dry-run)',
  'cleanup.run': 'Run',
  'cleanup.purge': 'Purge archived',
  'cleanup.purgeDry': 'Purge (dry-run)',
  'cleanup.purgeStatus': 'Purge',
  'audit.ts': 'Time',
  'audit.kind': 'Kind',
  'audit.outcome': 'Outcome',
  'audit.path': 'Path',
  'audit.detail': 'Detail',
  'audit.none': 'No audit records yet.',
  'common.refresh': 'Refresh',
  'common.confirm': 'Confirm',
  'common.cancel': 'Cancel',
  'common.close': 'Close',
  'common.loading': 'Loading…',
  'common.error': 'Error',
  'common.home': 'Home',
  'common.writeOff': 'Destructive writes are disabled by plugin config.',
  'common.lastTickError': 'Last tick error',
  'common.lastRun': 'Last run',
  'common.bytes': 'Bytes',
  'common.matched': 'Matched',
  'common.deleted': 'Deleted',
  'common.markRequired': '🟢',
  'common.markPlugin': '🔵',
  'common.markPrunable': '🟡',
  'common.markUnknown': '⚪',
  'common.usage': 'Usage: /home-guard · /home-guard purge [dry] · /home-guard run <ruleId|all> [dry]',
  'common.dryRun': 'dry-run',
  'common.done': 'done',
}

/** Chinese dictionary. */
export const zh: Record<HomeGuardLocaleKey, string> = {
  tab: '主目录守护',
  'section.structure': '结构图',
  'section.sessions': '会话',
  'section.cleanup': '清理与归档清除',
  'section.audit': '审计日志',
  'structure.required': '必需',
  'structure.pluginOwned': '插件所有',
  'structure.prunable': '可清理',
  'structure.unknown': '未知',
  'structure.exists': '存在',
  'structure.missing': '缺失',
  'structure.size': '大小',
  'structure.children': '子项',
  'structure.owner': '所有者',
  'structure.description': '说明',
  'sessions.title': '会话',
  'sessions.project': '项目',
  'sessions.size': '大小',
  'sessions.created': '创建',
  'sessions.modified': '修改',
  'sessions.archived': '已归档',
  'sessions.locked': '锁定',
  'sessions.current': '当前',
  'sessions.none': '未找到会话。',
  'sessions.showArchived': '显示已归档',
  'sessions.archive': '归档',
  'sessions.unarchive': '取消归档',
  'sessions.delete': '删除',
  'sessions.deleteHard': '彻底删除',
  'sessions.refresh': '刷新',
  'cleanup.rules': '规则',
  'cleanup.noRules': '暂无规则。可在下方添加或通过插件配置。',
  'cleanup.ruleId': '规则 ID',
  'cleanup.paths': '路径（每行一个通配符）',
  'cleanup.olderThan': '超过（天）',
  'cleanup.schedule': '调度',
  'cleanup.scheduleDaily': '每天 HH:MM',
  'cleanup.scheduleInterval': '每 N 小时',
  'cleanup.enabled': '启用',
  'cleanup.hardDelete': '彻底删除（跳过回收站）',
  'cleanup.addRule': '添加规则',
  'cleanup.rulesJson': '规则 JSON（替换运行时规则）',
  'cleanup.saveRules': '保存规则',
  'cleanup.runDry': '执行（试运行）',
  'cleanup.run': '执行',
  'cleanup.purge': '清除已归档',
  'cleanup.purgeDry': '清除（试运行）',
  'cleanup.purgeStatus': '归档清除',
  'audit.ts': '时间',
  'audit.kind': '类型',
  'audit.outcome': '结果',
  'audit.path': '路径',
  'audit.detail': '详情',
  'audit.none': '暂无审计记录。',
  'common.refresh': '刷新',
  'common.confirm': '确认',
  'common.cancel': '取消',
  'common.close': '关闭',
  'common.loading': '加载中…',
  'common.error': '错误',
  'common.home': '主目录',
  'common.writeOff': '插件配置已禁用破坏性写入。',
  'common.lastTickError': '上次定时错误',
  'common.lastRun': '上次执行',
  'common.bytes': '字节',
  'common.matched': '匹配',
  'common.deleted': '已删除',
  'common.markRequired': '🟢',
  'common.markPlugin': '🔵',
  'common.markPrunable': '🟡',
  'common.markUnknown': '⚪',
  'common.usage': '用法：/home-guard · /home-guard purge [dry] · /home-guard run <ruleId|all> [dry]',
  'common.dryRun': '试运行',
  'common.done': '完成',
}

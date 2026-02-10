#!/usr/bin/env node

/**
 * Claude Project Template CLI
 *
 * 啟動 Claude Code 並執行專案初始化流程
 *
 * Usage:
 *   npx @anthropic/claude-project-template init
 *   npx @anthropic/claude-project-template init --help
 */

import { Command } from 'commander'
import { spawn, execSync } from 'child_process'
import chalk from 'chalk'
import fs from 'fs-extra'
import path from 'path'

const program = new Command()

program
  .name('claude-project-template')
  .description('Initialize Claude Code project configuration')
  .version('0.2.0')

// ============================================================
// Init Command - 啟動 Claude Code 執行 /project:init
// ============================================================
program
  .command('init')
  .description('Initialize Claude Code configuration (launches Claude Code)')
  .option('--check', 'Check if Claude Code is installed')
  .action(async (options) => {
    console.log(chalk.blue('\n🤖 Claude Code 專案初始化\n'))

    // 檢查 Claude Code 是否安裝
    if (options.check || !isClaudeCodeInstalled()) {
      if (!isClaudeCodeInstalled()) {
        console.log(chalk.red('❌ Claude Code 未安裝\n'))
        console.log('請先安裝 Claude Code:')
        console.log(chalk.cyan('  npm install -g @anthropic-ai/claude-code'))
        console.log(chalk.cyan('  # 或'))
        console.log(chalk.cyan('  brew install claude-code'))
        console.log('\n安裝完成後，重新執行此命令。')
        process.exit(1)
      }
      if (options.check) {
        console.log(chalk.green('✅ Claude Code 已安裝'))
        process.exit(0)
      }
    }

    // 檢查是否已存在 .claude 目錄
    const claudeDir = path.join(process.cwd(), '.claude')
    if (await fs.pathExists(claudeDir)) {
      console.log(chalk.yellow('⚠️  偵測到現有 .claude 目錄\n'))
      console.log('如要重新初始化，請先備份或刪除 .claude 目錄')
      console.log('或直接在 Claude Code 中執行 /project:init\n')
    }

    console.log(chalk.cyan('正在啟動 Claude Code...\n'))
    console.log('Claude Code 將引導您完成專案初始化，包括：')
    console.log('  • 需求分析與技術棧建議')
    console.log('  • Quick Start 或進階設定模式')
    console.log('  • Agents 與 Skills 智慧選擇')
    console.log('  • 產生 project.yaml、PRD 等檔案\n')
    console.log(chalk.dim('─'.repeat(50)))
    console.log()

    // 啟動 Claude Code 並執行 /project:init
    launchClaudeCode('/project:init')
  })

// ============================================================
// Help Command
// ============================================================
program
  .command('help-init')
  .description('Show detailed help for init command')
  .action(() => {
    console.log(chalk.blue('\n📚 Init Command 說明\n'))
    console.log('此 CLI 會啟動 Claude Code 並執行 AI 引導式初始化流程。\n')

    console.log(chalk.cyan('初始化流程：'))
    console.log('  1. 描述您的專案需求')
    console.log('  2. 選擇 Quick Start（AI 推薦）或進階設定')
    console.log('  3. 確認並補充設定')
    console.log('  4. AI 自動選擇適合的 Agents 與 Skills')
    console.log('  5. 產生所有設定檔\n')

    console.log(chalk.cyan('產生的檔案：'))
    console.log('  .claude/')
    console.log('  ├── project.yaml    # 專案配置')
    console.log('  ├── CLAUDE.md       # 專案指引')
    console.log('  ├── agents/         # AI Agents')
    console.log('  ├── commands/       # 可用指令')
    console.log('  └── skills/         # 技能擴充')
    console.log('  docs/')
    console.log('  ├── PRD.md          # 產品需求文件')
    console.log('  └── TICKETS.md      # 任務追蹤\n')

    console.log(chalk.cyan('其他方式：'))
    console.log('  • 直接在 Claude Code 中執行: /project:init')
    console.log('  • 這會獲得完整的 AI 互動體驗\n')
  })

// ============================================================
// 輔助函數
// ============================================================

/**
 * 檢查 Claude Code 是否已安裝
 */
function isClaudeCodeInstalled() {
  try {
    execSync('claude --version', { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

/**
 * 啟動 Claude Code 並執行指定指令
 */
function launchClaudeCode(command) {
  const claude = spawn('claude', [command], {
    stdio: 'inherit',
    shell: true
  })

  claude.on('error', (err) => {
    console.error(chalk.red('\n❌ 無法啟動 Claude Code'))
    console.error(err.message)
    process.exit(1)
  })

  claude.on('close', (code) => {
    if (code === 0) {
      console.log(chalk.green('\n✅ 初始化完成！'))
      printNextSteps()
    } else {
      console.log(chalk.yellow(`\nClaude Code 結束，代碼: ${code}`))
    }
  })
}

/**
 * 印出下一步建議
 */
function printNextSteps() {
  console.log(chalk.cyan('\n📋 下一步建議：\n'))
  console.log('  1. 檢視生成的 .claude/project.yaml')
  console.log('  2. 編輯 docs/PRD.md 補充需求細節')
  console.log('  3. 執行 /project:plan <需求> 開始規劃')
  console.log('  4. 執行 /project:start-dev TICKET-XXX 開始開發\n')
}

program.parse()

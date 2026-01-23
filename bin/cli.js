#!/usr/bin/env node

/**
 * Claude Project Template CLI
 *
 * 初始化專案的 Claude Code 設定
 *
 * Usage:
 *   npx @anthropic/claude-project-template init
 *   npx @anthropic/claude-project-template add-feature <type>
 */

import { Command } from 'commander'
import inquirer from 'inquirer'
import chalk from 'chalk'
import fs from 'fs-extra'
import path from 'path'
import { fileURLToPath } from 'url'
import yaml from 'js-yaml'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const TEMPLATES_DIR = path.join(__dirname, '..', 'templates')

const program = new Command()

program
  .name('claude-project-template')
  .description('Initialize Claude Code project configuration')
  .version('0.1.0')

// ============================================================
// Init Command
// ============================================================
program
  .command('init')
  .description('Initialize Claude Code configuration in current project')
  .option('-y, --yes', 'Skip prompts and use defaults')
  .action(async (options) => {
    console.log(chalk.blue('\n🤖 Claude Code 專案初始化\n'))

    let config

    if (options.yes) {
      config = getDefaultConfig()
    } else {
      config = await promptForConfig()
    }

    await generateFiles(config)

    console.log(chalk.green('\n✅ 初始化完成！\n'))
    printGeneratedFiles(config)
    printExternalResourcesRecommendation(config)
    printNextSteps()
  })

// ============================================================
// Add Feature Command
// ============================================================
program
  .command('add-feature <type>')
  .description('Add a feature module (frontend/backend/database/infrastructure/design)')
  .option('--force', 'Force overwrite existing configuration')
  .option('--merge', 'Only add missing files')
  .action(async (type, options) => {
    console.log(chalk.blue(`\n🔧 新增 ${type} 功能模組\n`))

    const validTypes = ['frontend', 'backend', 'database', 'infrastructure', 'design']
    if (!validTypes.includes(type)) {
      console.log(chalk.red(`錯誤: 無效的 feature type: ${type}`))
      console.log(`有效選項: ${validTypes.join(', ')}`)
      process.exit(1)
    }

    const projectYamlPath = path.join(process.cwd(), '.claude', 'project.yaml')
    if (!await fs.pathExists(projectYamlPath)) {
      console.log(chalk.red('錯誤: 找不到 .claude/project.yaml'))
      console.log('請先執行 `claude-project-template init`')
      process.exit(1)
    }

    const existingConfig = yaml.load(await fs.readFile(projectYamlPath, 'utf8'))

    // 檢查是否已存在
    const featureExists = checkFeatureExists(existingConfig, type)
    if (featureExists && !options.force && !options.merge) {
      console.log(chalk.yellow(`⚠️ ${type} 功能已存在於 project.yaml`))
      const { action } = await inquirer.prompt([{
        type: 'list',
        name: 'action',
        message: '選擇動作：',
        choices: [
          { name: '保持現狀', value: 'keep' },
          { name: '覆蓋設定 (--force)', value: 'force' },
          { name: '只補充缺失檔案 (--merge)', value: 'merge' }
        ]
      }])
      if (action === 'keep') {
        console.log('已取消。')
        return
      }
      options[action] = true
    }

    // 收集 feature 設定
    const featureConfig = await promptFeatureConfig(type)

    // 更新 config
    const updatedConfig = updateConfigWithFeature(existingConfig, type, featureConfig)

    // 寫入更新後的 project.yaml
    await fs.writeFile(projectYamlPath, yaml.dump(updatedConfig, { lineWidth: -1 }))

    // 複製相關檔案
    await copyFeatureFiles(type, updatedConfig, options.merge)

    console.log(chalk.green(`\n✅ ${type} 功能已新增！\n`))
    printFeatureFiles(type)
    printFeatureRecommendation(type)
  })

// ============================================================
// Update Commands
// ============================================================
program
  .command('update-commands')
  .description('Update .claude/commands/ to latest version')
  .option('--force', 'Force overwrite all commands (including customized ones)')
  .option('--dry-run', 'Show what would be updated without making changes')
  .action(async (options) => {
    console.log(chalk.blue('\n🔄 更新 Claude Commands\n'))

    const claudeDir = path.join(process.cwd(), '.claude')
    const commandsDir = path.join(claudeDir, 'commands')

    if (!await fs.pathExists(claudeDir)) {
      console.log(chalk.red('錯誤: 找不到 .claude 目錄'))
      console.log('請先執行 `claude-project-template init`')
      process.exit(1)
    }

    // 確保 commands 目錄存在
    await fs.ensureDir(commandsDir)

    const templateCommandsDir = path.join(__dirname, '..', 'templates', 'commands')
    const templateFiles = await fs.readdir(templateCommandsDir)

    const updates = []
    const skipped = []
    const added = []

    for (const file of templateFiles) {
      if (!file.endsWith('.md')) continue

      const templatePath = path.join(templateCommandsDir, file)
      const targetPath = path.join(commandsDir, file)

      if (await fs.pathExists(targetPath)) {
        if (options.force) {
          updates.push(file)
          if (!options.dryRun) {
            await fs.copy(templatePath, targetPath, { overwrite: true })
          }
        } else {
          // 比較檔案是否相同
          const templateContent = await fs.readFile(templatePath, 'utf8')
          const targetContent = await fs.readFile(targetPath, 'utf8')

          if (templateContent !== targetContent) {
            skipped.push(file)
          }
        }
      } else {
        added.push(file)
        if (!options.dryRun) {
          await fs.copy(templatePath, targetPath)
        }
      }
    }

    // 顯示結果
    if (options.dryRun) {
      console.log(chalk.yellow('🔍 Dry Run 模式（不會實際修改檔案）\n'))
    }

    if (added.length > 0) {
      console.log(chalk.green('✅ 新增的指令：'))
      added.forEach(f => console.log(`   + ${f}`))
      console.log('')
    }

    if (updates.length > 0) {
      console.log(chalk.blue('🔄 已更新的指令：'))
      updates.forEach(f => console.log(`   ↻ ${f}`))
      console.log('')
    }

    if (skipped.length > 0) {
      console.log(chalk.yellow('⏭️ 跳過的指令（有本地修改）：'))
      skipped.forEach(f => console.log(`   - ${f}`))
      console.log('')
      console.log(chalk.dim('   使用 --force 強制覆蓋這些檔案'))
      console.log('')
    }

    if (added.length === 0 && updates.length === 0 && skipped.length === 0) {
      console.log(chalk.green('✅ 所有指令都是最新版本！'))
    } else if (!options.dryRun) {
      console.log(chalk.green(`✅ 更新完成！新增 ${added.length} 個，更新 ${updates.length} 個`))
    }
  })

// ============================================================
// Helper Functions
// ============================================================

async function promptForConfig() {
  // Step 0: 初始化方式選擇
  const { initMethod } = await inquirer.prompt([
    {
      type: 'list',
      name: 'initMethod',
      message: '如何初始化專案？',
      choices: [
        { name: 'A. 讀取需求文件（推薦）- 從 PRD/README 等文件讀取需求和 Tech Stack', value: 'read-doc' },
        { name: 'B. 既有專案 - 已有程式碼，自動分析後加入 Claude Code 設定', value: 'existing' },
        { name: 'C. 全新專案 - 從零開始，透過問答完整規劃', value: 'new' },
        { name: 'D. 其他 - 自行描述專案情況', value: 'other' }
      ]
    }
  ])

  // 根據初始化方式進入不同流程
  switch (initMethod) {
    case 'read-doc':
      return await promptFromDocument()
    case 'existing':
      return await promptFromExistingProject()
    case 'other':
      return await promptFromCustomDescription()
    case 'new':
    default:
      // 繼續原有的全新專案流程
      break
  }

  // Phase 1: 專案類型（全新專案流程）
  const { projectType } = await inquirer.prompt([
    {
      type: 'list',
      name: 'projectType',
      message: '這是什麼類型的專案？',
      choices: [
        { name: 'Web App (前後端)', value: 'web-app' },
        { name: '純前端應用', value: 'frontend-only' },
        { name: '純後端服務', value: 'backend-only' },
        { name: 'CLI 工具', value: 'cli' },
        { name: 'Library / SDK', value: 'library' },
        { name: 'Microservice', value: 'microservice' },
        { name: 'Monorepo', value: 'monorepo' },
        { name: '其他（自行輸入）', value: 'other' }
      ]
    }
  ])

  // 處理「其他」選項
  let finalProjectType = projectType
  if (projectType === 'other') {
    const { customType } = await inquirer.prompt([{
      type: 'input',
      name: 'customType',
      message: '請輸入專案類型：'
    }])
    finalProjectType = customType
  }

  // Phase 2: 技術棧
  let backendConfig = null
  let frontendConfig = null
  let databaseConfig = null

  const hasBackend = ['web-app', 'backend-only', 'microservice', 'cli', 'monorepo'].includes(finalProjectType)
  const hasFrontend = ['web-app', 'frontend-only', 'monorepo'].includes(finalProjectType)

  if (hasBackend) {
    backendConfig = await promptBackendConfig()
  }

  if (hasFrontend) {
    frontendConfig = await promptFrontendConfig()
  }

  // 資料庫設定
  if (hasBackend) {
    const { hasDatabase } = await inquirer.prompt([{
      type: 'confirm',
      name: 'hasDatabase',
      message: '專案是否需要資料庫？',
      default: true
    }])
    if (hasDatabase) {
      databaseConfig = await promptDatabaseConfig()
    }
  }

  // Phase 3: 團隊規範
  const teamConfig = await promptTeamConfig()

  // Phase 4: 設計系統（如有前端）
  let designConfig = { enabled: false }
  if (hasFrontend) {
    const { enableDesign } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'enableDesign',
        message: '是否啟用設計系統？',
        default: true
      }
    ])
    designConfig = { enabled: enableDesign }

    if (enableDesign) {
      const { enableFigma } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'enableFigma',
          message: '是否整合 Figma？',
          default: false
        }
      ])
      designConfig.figma = { enabled: enableFigma }
    }
  }

  // Phase 5: 基礎設施（可選）
  let infrastructureConfig = null
  const { hasInfra } = await inquirer.prompt([{
    type: 'confirm',
    name: 'hasInfra',
    message: '是否設定基礎設施 (CI/CD, 雲端部署)?',
    default: false
  }])
  if (hasInfra) {
    infrastructureConfig = await promptInfrastructureConfig()
  }

  // Phase 6: Skills（額外能力）
  const skillsConfig = await promptSkillsConfig()

  // 組合設定
  const { projectName } = await inquirer.prompt([
    {
      type: 'input',
      name: 'projectName',
      message: '專案名稱：',
      default: path.basename(process.cwd())
    }
  ])

  return {
    project: {
      name: projectName,
      type: finalProjectType
    },
    tech_stack: {
      backend: backendConfig,
      frontend: frontendConfig,
      database: databaseConfig,
      infrastructure: infrastructureConfig
    },
    team: teamConfig,
    design: designConfig,
    skills: skillsConfig
  }
}

// ============================================================
// 讀取需求文件流程
// ============================================================
async function promptFromDocument() {
  console.log(chalk.cyan('\n📄 讀取需求文件流程\n'))

  // Step A1: 詢問文件來源
  const docChoices = [{ name: 'README.md', value: 'README.md' }]

  // 檢查是否存在 docs/PRD.md
  if (await fs.pathExists(path.join(process.cwd(), 'docs', 'PRD.md'))) {
    docChoices.unshift({ name: 'docs/PRD.md（發現此檔案）', value: 'docs/PRD.md' })
  }

  docChoices.push(
    { name: '其他檔案路徑（自行輸入）', value: 'custom-path' },
    { name: '手動輸入需求內容', value: 'manual-input' }
  )

  const { docSource } = await inquirer.prompt([{
    type: 'list',
    name: 'docSource',
    message: '請選擇需求文件來源：',
    choices: docChoices
  }])

  let docContent = ''
  let docPath = ''

  if (docSource === 'custom-path') {
    const { customPath } = await inquirer.prompt([{
      type: 'input',
      name: 'customPath',
      message: '請輸入檔案路徑：'
    }])
    docPath = customPath
    if (await fs.pathExists(customPath)) {
      docContent = await fs.readFile(customPath, 'utf8')
    } else {
      console.log(chalk.yellow(`⚠️ 找不到檔案: ${customPath}，將進入手動輸入模式`))
    }
  } else if (docSource === 'manual-input') {
    const { manualContent } = await inquirer.prompt([{
      type: 'editor',
      name: 'manualContent',
      message: '請輸入需求內容（將開啟編輯器）：'
    }])
    docContent = manualContent
  } else {
    docPath = docSource
    if (await fs.pathExists(docSource)) {
      docContent = await fs.readFile(docSource, 'utf8')
    }
  }

  // Step A2: 解析文件內容
  const detected = parseDocumentForTechStack(docContent)

  // Step A3: 顯示解析結果
  console.log(chalk.cyan('\n## 需求文件分析結果\n'))

  if (docPath) {
    console.log(`文件: ${docPath}\n`)
  }

  if (Object.keys(detected).length > 0) {
    console.log(chalk.green('✅ 已識別的配置：\n'))
    for (const [key, value] of Object.entries(detected)) {
      console.log(`  • ${key}: ${value}`)
    }
  }

  // 確認識別是否正確
  const { confirmDetected } = await inquirer.prompt([{
    type: 'confirm',
    name: 'confirmDetected',
    message: '以上識別是否正確？',
    default: true
  }])

  if (!confirmDetected) {
    console.log(chalk.yellow('\n將進入完整問答流程...\n'))
    return await promptFullConfig()
  }

  // Step A4: 只詢問未識別的項目
  return await promptMissingConfig(detected)
}

// 解析文件中的技術棧
function parseDocumentForTechStack(content) {
  const detected = {}
  const contentLower = content.toLowerCase()

  // 後端語言
  if (/\b(golang|go\s*1\.\d+|go\.mod)\b/i.test(content)) {
    detected.backendLanguage = 'go'
  } else if (/\b(python|fastapi|django|flask)\b/i.test(content)) {
    detected.backendLanguage = 'python'
  } else if (/\b(node\.?js|express|nestjs|typescript\s+backend)\b/i.test(content)) {
    detected.backendLanguage = 'node'
  }

  // 後端框架
  if (/\b(gin|gin-gonic)\b/i.test(content)) {
    detected.backendFramework = 'gin'
  } else if (/\bfastapi\b/i.test(content)) {
    detected.backendFramework = 'fastapi'
  } else if (/\bexpress\b/i.test(content)) {
    detected.backendFramework = 'express'
  } else if (/\bnestjs\b/i.test(content)) {
    detected.backendFramework = 'nestjs'
  }

  // 前端框架
  if (/\b(next\.?js|next\s*1[456])\b/i.test(content)) {
    detected.frontendFramework = 'next'
  } else if (/\breact\b/i.test(content) && !/next/i.test(content)) {
    detected.frontendFramework = 'react'
  } else if (/\b(vue|nuxt)\b/i.test(content)) {
    detected.frontendFramework = 'vue'
  }

  // 資料庫
  if (/\b(postgresql|postgres|pg)\b/i.test(content)) {
    detected.database = 'postgresql'
  } else if (/\bmysql\b/i.test(content)) {
    detected.database = 'mysql'
  } else if (/\bmongodb\b/i.test(content)) {
    detected.database = 'mongodb'
  }

  // ORM
  if (/\bgorm\b/i.test(content)) {
    detected.orm = 'gorm'
  } else if (/\bprisma\b/i.test(content)) {
    detected.orm = 'prisma'
  } else if (/\btypeorm\b/i.test(content)) {
    detected.orm = 'typeorm'
  }

  // UI 框架
  if (/\b(mui|material[\s-]?ui)\b/i.test(content)) {
    detected.uiFramework = 'mui'
  } else if (/\b(ant[\s-]?design|antd)\b/i.test(content)) {
    detected.uiFramework = 'antd'
  } else if (/\bshadcn\b/i.test(content)) {
    detected.uiFramework = 'shadcn'
  }

  // 雲端平台
  if (/\b(gcp|google\s*cloud|cloud\s*run)\b/i.test(content)) {
    detected.cloud = 'gcp'
  } else if (/\b(aws|amazon|ecs|lambda)\b/i.test(content)) {
    detected.cloud = 'aws'
  }

  // CI/CD
  if (/\b(github\s*actions|\.github\/workflows)\b/i.test(content)) {
    detected.ciCd = 'github-actions'
  }

  return detected
}

// 根據已識別的配置，只詢問缺失項目
async function promptMissingConfig(detected) {
  let backendConfig = null
  let frontendConfig = null
  let databaseConfig = null
  let infrastructureConfig = null

  // 判斷專案類型
  const hasBackendDetected = detected.backendLanguage || detected.backendFramework
  const hasFrontendDetected = detected.frontendFramework
  const hasDatabaseDetected = detected.database

  // 後端配置
  if (hasBackendDetected) {
    backendConfig = {
      language: detected.backendLanguage || 'go',
      framework: detected.backendFramework || 'gin',
      orm: detected.orm || 'gorm',
      architecture: 'clean'
    }

    // 詢問未識別的後端項目
    if (!detected.orm) {
      const ormChoices = getOrmChoices(backendConfig.language)
      ormChoices.push({ name: '其他（自行輸入）', value: 'other' })
      const { orm } = await inquirer.prompt([{
        type: 'list',
        name: 'orm',
        message: '使用什麼 ORM？',
        choices: ormChoices
      }])
      if (orm === 'other') {
        const { customOrm } = await inquirer.prompt([{
          type: 'input',
          name: 'customOrm',
          message: '請輸入 ORM：'
        }])
        backendConfig.orm = customOrm
      } else {
        backendConfig.orm = orm
      }
    }
  }

  // 前端配置
  if (hasFrontendDetected) {
    frontendConfig = {
      language: 'typescript',
      framework: detected.frontendFramework,
      ui_framework: { default: detected.uiFramework || 'mui' },
      styling: 'css-modules',
      package_manager: 'pnpm'
    }

    // 詢問未識別的前端項目
    if (!detected.uiFramework) {
      const { uiFramework } = await inquirer.prompt([{
        type: 'list',
        name: 'uiFramework',
        message: 'UI 框架？',
        choices: [
          { name: 'MUI (Material UI)', value: 'mui' },
          { name: 'Ant Design', value: 'antd' },
          { name: 'shadcn/ui', value: 'shadcn' },
          { name: 'Tailwind (無元件庫)', value: 'tailwind' },
          { name: 'Chakra UI', value: 'chakra' },
          { name: '其他（自行輸入）', value: 'other' }
        ]
      }])
      if (uiFramework === 'other') {
        const { customUi } = await inquirer.prompt([{
          type: 'input',
          name: 'customUi',
          message: '請輸入 UI 框架：'
        }])
        frontendConfig.ui_framework = { default: customUi }
      } else {
        frontendConfig.ui_framework = { default: uiFramework }
      }
    }

    // 套件管理器
    const { packageManager } = await inquirer.prompt([{
      type: 'list',
      name: 'packageManager',
      message: '套件管理器？',
      choices: [
        { name: 'pnpm（推薦）', value: 'pnpm' },
        { name: 'npm', value: 'npm' },
        { name: 'yarn', value: 'yarn' },
        { name: 'bun', value: 'bun' },
        { name: '其他（自行輸入）', value: 'other' }
      ]
    }])
    if (packageManager === 'other') {
      const { customPm } = await inquirer.prompt([{
        type: 'input',
        name: 'customPm',
        message: '請輸入套件管理器：'
      }])
      frontendConfig.package_manager = customPm
    } else {
      frontendConfig.package_manager = packageManager
    }
  }

  // 資料庫配置
  if (hasDatabaseDetected) {
    databaseConfig = {
      type: detected.database,
      version: '16'
    }
  } else if (hasBackendDetected) {
    const { hasDatabase } = await inquirer.prompt([{
      type: 'confirm',
      name: 'hasDatabase',
      message: '專案是否需要資料庫？',
      default: true
    }])
    if (hasDatabase) {
      databaseConfig = await promptDatabaseConfig()
    }
  }

  // 基礎設施配置
  if (detected.cloud || detected.ciCd) {
    infrastructureConfig = {
      cloud: detected.cloud || null,
      ci_cd: detected.ciCd || null,
      iac: null
    }
  }

  // 團隊規範
  const teamConfig = await promptTeamConfig()

  // 設計系統
  let designConfig = { enabled: false }
  if (hasFrontendDetected) {
    const { enableDesign } = await inquirer.prompt([{
      type: 'confirm',
      name: 'enableDesign',
      message: '是否啟用設計系統？',
      default: true
    }])
    designConfig = { enabled: enableDesign }
  }

  // 專案名稱
  const { projectName } = await inquirer.prompt([{
    type: 'input',
    name: 'projectName',
    message: '專案名稱：',
    default: path.basename(process.cwd())
  }])

  // 判斷專案類型
  let projectType = 'web-app'
  if (hasBackendDetected && hasFrontendDetected) {
    projectType = 'web-app'
  } else if (hasBackendDetected && !hasFrontendDetected) {
    projectType = 'backend-only'
  } else if (hasFrontendDetected && !hasBackendDetected) {
    projectType = 'frontend-only'
  }

  return {
    project: {
      name: projectName,
      type: projectType
    },
    tech_stack: {
      backend: backendConfig,
      frontend: frontendConfig,
      database: databaseConfig,
      infrastructure: infrastructureConfig
    },
    team: teamConfig,
    design: designConfig
  }
}

// 取得 ORM 選項
function getOrmChoices(language) {
  const ormChoices = {
    go: ['gorm', 'sqlx', 'ent'],
    python: ['sqlalchemy', 'django-orm', 'tortoise'],
    node: ['prisma', 'typeorm', 'drizzle'],
    java: ['jpa', 'mybatis'],
    rust: ['diesel', 'sea-orm']
  }
  return (ormChoices[language] || ['other']).map(o => ({ name: o, value: o }))
}

// ============================================================
// 既有專案流程
// ============================================================
async function promptFromExistingProject() {
  console.log(chalk.cyan('\n🔍 分析既有專案中...\n'))

  const detected = await analyzeExistingProject()

  // 顯示推斷結果
  console.log(chalk.green('根據程式碼分析，您的專案使用：\n'))

  if (detected.backendLanguage) {
    console.log(`  • 後端: ${detected.backendLanguage}${detected.backendFramework ? ' + ' + detected.backendFramework : ''}`)
  }
  if (detected.frontendFramework) {
    console.log(`  • 前端: ${detected.frontendFramework}`)
  }
  if (detected.database) {
    console.log(`  • 資料庫: ${detected.database}`)
  }
  if (detected.packageManager) {
    console.log(`  • 套件管理器: ${detected.packageManager}`)
  }

  console.log('')

  const { confirmDetected } = await inquirer.prompt([{
    type: 'list',
    name: 'confirmDetected',
    message: '以上推斷是否正確？',
    choices: [
      { name: '正確，繼續', value: 'correct' },
      { name: '需要修正', value: 'modify' },
      { name: '其他（自行說明）', value: 'other' }
    ]
  }])

  if (confirmDetected === 'other') {
    return await promptFromCustomDescription()
  }

  if (confirmDetected === 'modify') {
    console.log(chalk.yellow('\n將進入完整問答流程...\n'))
    return await promptFullConfig()
  }

  return await promptMissingConfig(detected)
}

// 分析既有專案
async function analyzeExistingProject() {
  const detected = {}
  const cwd = process.cwd()

  // 檢查 go.mod
  if (await fs.pathExists(path.join(cwd, 'go.mod'))) {
    detected.backendLanguage = 'go'
    const goMod = await fs.readFile(path.join(cwd, 'go.mod'), 'utf8')
    if (/gin-gonic\/gin/i.test(goMod)) detected.backendFramework = 'gin'
    if (/gorm\.io\/gorm/i.test(goMod)) detected.orm = 'gorm'
  }

  // 檢查 package.json
  if (await fs.pathExists(path.join(cwd, 'package.json'))) {
    const pkg = JSON.parse(await fs.readFile(path.join(cwd, 'package.json'), 'utf8'))
    const deps = { ...pkg.dependencies, ...pkg.devDependencies }

    if (deps.next) detected.frontendFramework = 'next'
    else if (deps.react && !deps.next) detected.frontendFramework = 'react'
    else if (deps.vue) detected.frontendFramework = 'vue'

    if (deps['@mui/material']) detected.uiFramework = 'mui'
    else if (deps.antd) detected.uiFramework = 'antd'

    if (deps.prisma) detected.orm = 'prisma'
    if (deps.express) detected.backendFramework = 'express'
  }

  // 檢查前端 package.json
  if (await fs.pathExists(path.join(cwd, 'frontend', 'package.json'))) {
    const pkg = JSON.parse(await fs.readFile(path.join(cwd, 'frontend', 'package.json'), 'utf8'))
    const deps = { ...pkg.dependencies, ...pkg.devDependencies }

    if (deps.next) detected.frontendFramework = 'next'
    if (deps['@mui/material']) detected.uiFramework = 'mui'
    else if (deps.antd) detected.uiFramework = 'antd'
  }

  // 檢查套件管理器
  if (await fs.pathExists(path.join(cwd, 'pnpm-lock.yaml'))) {
    detected.packageManager = 'pnpm'
  } else if (await fs.pathExists(path.join(cwd, 'yarn.lock'))) {
    detected.packageManager = 'yarn'
  } else if (await fs.pathExists(path.join(cwd, 'package-lock.json'))) {
    detected.packageManager = 'npm'
  }

  // 檢查前端目錄的套件管理器
  if (await fs.pathExists(path.join(cwd, 'frontend', 'pnpm-lock.yaml'))) {
    detected.packageManager = 'pnpm'
  }

  return detected
}

// ============================================================
// 自訂描述流程
// ============================================================
async function promptFromCustomDescription() {
  console.log(chalk.cyan('\n📝 自訂描述流程\n'))

  const { description } = await inquirer.prompt([{
    type: 'editor',
    name: 'description',
    message: '請描述您的專案情況（將開啟編輯器）：'
  }])

  // 嘗試從描述中解析
  const detected = parseDocumentForTechStack(description)

  if (Object.keys(detected).length > 0) {
    console.log(chalk.cyan('\n從您的描述中識別到：\n'))
    for (const [key, value] of Object.entries(detected)) {
      console.log(`  • ${key}: ${value}`)
    }

    const { useDetected } = await inquirer.prompt([{
      type: 'confirm',
      name: 'useDetected',
      message: '使用這些識別結果？',
      default: true
    }])

    if (useDetected) {
      return await promptMissingConfig(detected)
    }
  }

  console.log(chalk.yellow('\n將進入完整問答流程...\n'))
  return await promptFullConfig()
}

// ============================================================
// 完整問答流程（原有流程的重構）
// ============================================================
async function promptFullConfig() {
  // Step C1: 收集需求概述
  console.log(chalk.cyan('\n📝 全新專案規劃\n'))

  const { projectDescription } = await inquirer.prompt([{
    type: 'input',
    name: 'projectDescription',
    message: '請簡單描述您要建立的專案（1-3 句話）：',
    validate: (input) => input.length > 0 || '請輸入專案描述'
  }])

  // Step C2: 根據描述提供架構建議
  console.log(chalk.cyan('\n📐 架構建議\n'))
  console.log('根據您的需求，以下是建議的架構選項：\n')

  const { architectureChoice } = await inquirer.prompt([{
    type: 'list',
    name: 'architectureChoice',
    message: '選擇架構模式：',
    choices: [
      {
        name: 'A. 全端 Monolith（推薦入門）\n     Next.js Full-Stack，開發快、部署簡單，適合 MVP、小型團隊',
        value: 'monolith'
      },
      {
        name: 'B. 前後端分離（推薦中型專案）\n     前端 Next.js / 後端 Go + Gin，職責分明、可獨立擴展',
        value: 'separated'
      },
      {
        name: 'C. 微服務架構\n     多個獨立服務、API Gateway，高度解耦、獨立部署，適合大型團隊',
        value: 'microservice'
      },
      {
        name: 'D. 純後端 API\n     只有後端服務，無前端，適合 API 服務、行動 App 後端',
        value: 'backend-only'
      },
      {
        name: 'E. 其他（自行選擇專案類型）',
        value: 'other'
      }
    ]
  }])

  // 根據架構選擇決定專案類型
  let finalProjectType
  switch (architectureChoice) {
    case 'monolith':
      finalProjectType = 'frontend-only' // Next.js 全端
      break
    case 'separated':
      finalProjectType = 'web-app'
      break
    case 'microservice':
      finalProjectType = 'microservice'
      break
    case 'backend-only':
      finalProjectType = 'backend-only'
      break
    case 'other':
    default:
      // 回到傳統專案類型選擇
      const { projectType } = await inquirer.prompt([{
        type: 'list',
        name: 'projectType',
        message: '這是什麼類型的專案？',
        choices: [
          { name: 'Web App (前後端)', value: 'web-app' },
          { name: '純前端應用', value: 'frontend-only' },
          { name: '純後端服務', value: 'backend-only' },
          { name: 'CLI 工具', value: 'cli' },
          { name: 'Library / SDK', value: 'library' },
          { name: 'Microservice', value: 'microservice' },
          { name: 'Monorepo', value: 'monorepo' },
          { name: '其他（自行輸入）', value: 'other' }
        ]
      }])
      finalProjectType = projectType
      if (projectType === 'other') {
        const { customType } = await inquirer.prompt([{
          type: 'input',
          name: 'customType',
          message: '請輸入專案類型：'
        }])
        finalProjectType = customType
      }
      break
  }

  // Phase 2: 技術棧
  let backendConfig = null
  let frontendConfig = null
  let databaseConfig = null

  const hasBackend = ['web-app', 'backend-only', 'microservice', 'cli', 'monorepo'].includes(finalProjectType)
  const hasFrontend = ['web-app', 'frontend-only', 'monorepo'].includes(finalProjectType)

  if (hasBackend) {
    backendConfig = await promptBackendConfig()
  }

  if (hasFrontend) {
    frontendConfig = await promptFrontendConfig()
  }

  // 資料庫設定
  if (hasBackend) {
    const { hasDatabase } = await inquirer.prompt([{
      type: 'confirm',
      name: 'hasDatabase',
      message: '專案是否需要資料庫？',
      default: true
    }])
    if (hasDatabase) {
      databaseConfig = await promptDatabaseConfig()
    }
  }

  // Phase 3: 團隊規範
  const teamConfig = await promptTeamConfig()

  // Phase 4: 設計系統（如有前端）
  let designConfig = { enabled: false }
  if (hasFrontend) {
    const { enableDesign } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'enableDesign',
        message: '是否啟用設計系統？',
        default: true
      }
    ])
    designConfig = { enabled: enableDesign }

    if (enableDesign) {
      const { enableFigma } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'enableFigma',
          message: '是否整合 Figma？',
          default: false
        }
      ])
      designConfig.figma = { enabled: enableFigma }
    }
  }

  // Phase 5: 基礎設施（可選）
  let infrastructureConfig = null
  const { hasInfra } = await inquirer.prompt([{
    type: 'confirm',
    name: 'hasInfra',
    message: '是否設定基礎設施 (CI/CD, 雲端部署)?',
    default: false
  }])
  if (hasInfra) {
    infrastructureConfig = await promptInfrastructureConfig()
  }

  // Phase 6: Skills（額外能力）
  const skillsConfig = await promptSkillsConfig()

  // 組合設定
  const { projectName } = await inquirer.prompt([
    {
      type: 'input',
      name: 'projectName',
      message: '專案名稱：',
      default: path.basename(process.cwd())
    }
  ])

  return {
    project: {
      name: projectName,
      type: finalProjectType
    },
    tech_stack: {
      backend: backendConfig,
      frontend: frontendConfig,
      database: databaseConfig,
      infrastructure: infrastructureConfig
    },
    team: teamConfig,
    design: designConfig,
    skills: skillsConfig
  }
}

async function promptBackendConfig() {
  const { language } = await inquirer.prompt([
    {
      type: 'list',
      name: 'language',
      message: '後端使用什麼語言？',
      choices: [
        { name: 'Go（推薦）', value: 'go' },
        { name: 'Python', value: 'python' },
        { name: 'Node.js (TypeScript)', value: 'node' },
        { name: 'Java', value: 'java' },
        { name: 'Rust', value: 'rust' },
        { name: 'C#', value: 'csharp' },
        { name: '其他（自行輸入）', value: 'other' }
      ]
    }
  ])

  let finalLanguage = language
  if (language === 'other') {
    const { customLanguage } = await inquirer.prompt([{
      type: 'input',
      name: 'customLanguage',
      message: '請輸入後端語言：'
    }])
    finalLanguage = customLanguage
  }

  const frameworkChoices = {
    go: ['gin', 'echo', 'fiber', 'chi'],
    python: ['fastapi', 'django', 'flask'],
    node: ['express', 'nestjs', 'fastify', 'hono'],
    java: ['spring-boot', 'quarkus'],
    rust: ['actix', 'axum'],
    csharp: ['aspnet-core']
  }

  const ormChoices = {
    go: ['gorm', 'sqlx', 'ent'],
    python: ['sqlalchemy', 'django-orm', 'tortoise'],
    node: ['prisma', 'typeorm', 'drizzle'],
    java: ['jpa', 'mybatis'],
    rust: ['diesel', 'sea-orm'],
    csharp: ['entity-framework']
  }

  const frameworks = (frameworkChoices[finalLanguage] || []).map(f => ({ name: f, value: f }))
  frameworks.push({ name: '其他（自行輸入）', value: 'other' })

  const orms = (ormChoices[finalLanguage] || []).map(o => ({ name: o, value: o }))
  orms.push({ name: '其他（自行輸入）', value: 'other' })

  const { framework } = await inquirer.prompt([{
    type: 'list',
    name: 'framework',
    message: '使用什麼框架？',
    choices: frameworks
  }])

  let finalFramework = framework
  if (framework === 'other') {
    const { customFramework } = await inquirer.prompt([{
      type: 'input',
      name: 'customFramework',
      message: '請輸入框架名稱：'
    }])
    finalFramework = customFramework
  }

  const { orm } = await inquirer.prompt([{
    type: 'list',
    name: 'orm',
    message: '使用什麼 ORM？',
    choices: orms
  }])

  let finalOrm = orm
  if (orm === 'other') {
    const { customOrm } = await inquirer.prompt([{
      type: 'input',
      name: 'customOrm',
      message: '請輸入 ORM：'
    }])
    finalOrm = customOrm
  }

  const { architecture } = await inquirer.prompt([{
    type: 'list',
    name: 'architecture',
    message: '架構模式？',
    choices: [
      { name: 'Clean Architecture（推薦）', value: 'clean' },
      { name: 'Hexagonal', value: 'hexagonal' },
      { name: 'Layered', value: 'layered' },
      { name: '其他（自行輸入）', value: 'other' }
    ]
  }])

  let finalArchitecture = architecture
  if (architecture === 'other') {
    const { customArch } = await inquirer.prompt([{
      type: 'input',
      name: 'customArch',
      message: '請輸入架構模式：'
    }])
    finalArchitecture = customArch
  }

  return { language: finalLanguage, framework: finalFramework, orm: finalOrm, architecture: finalArchitecture }
}

async function promptFrontendConfig() {
  const { framework } = await inquirer.prompt([
    {
      type: 'list',
      name: 'framework',
      message: '前端使用什麼框架？',
      choices: [
        { name: 'Next.js（推薦）', value: 'next' },
        { name: 'React', value: 'react' },
        { name: 'Vue', value: 'vue' },
        { name: 'Nuxt', value: 'nuxt' },
        { name: 'Angular', value: 'angular' },
        { name: 'Svelte', value: 'svelte' },
        { name: '其他（自行輸入）', value: 'other' }
      ]
    }
  ])

  let finalFramework = framework
  if (framework === 'other') {
    const { customFramework } = await inquirer.prompt([{
      type: 'input',
      name: 'customFramework',
      message: '請輸入前端框架：'
    }])
    finalFramework = customFramework
  }

  const { uiFramework } = await inquirer.prompt([{
    type: 'list',
    name: 'uiFramework',
    message: 'UI 框架？',
    choices: [
      { name: 'MUI (Material UI)', value: 'mui' },
      { name: 'Ant Design', value: 'antd' },
      { name: 'shadcn/ui', value: 'shadcn' },
      { name: 'Tailwind（無元件庫）', value: 'tailwind' },
      { name: 'Chakra UI', value: 'chakra' },
      { name: '其他（自行輸入）', value: 'other' }
    ]
  }])

  let finalUiFramework = uiFramework
  if (uiFramework === 'other') {
    const { customUi } = await inquirer.prompt([{
      type: 'input',
      name: 'customUi',
      message: '請輸入 UI 框架：'
    }])
    finalUiFramework = customUi
  }

  const { styling } = await inquirer.prompt([{
    type: 'list',
    name: 'styling',
    message: '樣式方案？',
    choices: [
      { name: 'CSS Modules（推薦）', value: 'css-modules' },
      { name: 'Tailwind', value: 'tailwind' },
      { name: 'Styled Components', value: 'styled-components' },
      { name: '其他（自行輸入）', value: 'other' }
    ]
  }])

  let finalStyling = styling
  if (styling === 'other') {
    const { customStyling } = await inquirer.prompt([{
      type: 'input',
      name: 'customStyling',
      message: '請輸入樣式方案：'
    }])
    finalStyling = customStyling
  }

  const { packageManager } = await inquirer.prompt([{
    type: 'list',
    name: 'packageManager',
    message: '套件管理器？',
    choices: [
      { name: 'pnpm（推薦）', value: 'pnpm' },
      { name: 'npm', value: 'npm' },
      { name: 'yarn', value: 'yarn' },
      { name: 'bun', value: 'bun' },
      { name: '其他（自行輸入）', value: 'other' }
    ]
  }])

  let finalPackageManager = packageManager
  if (packageManager === 'other') {
    const { customPm } = await inquirer.prompt([{
      type: 'input',
      name: 'customPm',
      message: '請輸入套件管理器：'
    }])
    finalPackageManager = customPm
  }

  return {
    language: 'typescript',
    framework: finalFramework,
    ui_framework: { default: finalUiFramework },
    styling: finalStyling,
    package_manager: finalPackageManager
  }
}

async function promptDatabaseConfig() {
  const { type } = await inquirer.prompt([{
    type: 'list',
    name: 'type',
    message: '資料庫類型？',
    choices: [
      { name: 'PostgreSQL（推薦）', value: 'postgresql' },
      { name: 'MySQL', value: 'mysql' },
      { name: 'MongoDB', value: 'mongodb' },
      { name: 'SQLite', value: 'sqlite' },
      { name: '其他（自行輸入）', value: 'other' }
    ]
  }])

  let finalType = type
  if (type === 'other') {
    const { customType } = await inquirer.prompt([{
      type: 'input',
      name: 'customType',
      message: '請輸入資料庫類型：'
    }])
    finalType = customType
  }

  const { version } = await inquirer.prompt([{
    type: 'input',
    name: 'version',
    message: '資料庫版本？',
    default: '16'
  }])

  return { type: finalType, version }
}

async function promptInfrastructureConfig() {
  const { cloud } = await inquirer.prompt([{
    type: 'list',
    name: 'cloud',
    message: '雲端平台？',
    choices: [
      { name: 'GCP', value: 'gcp' },
      { name: 'AWS', value: 'aws' },
      { name: 'Azure', value: 'azure' },
      { name: 'Vercel', value: 'vercel' },
      { name: '暫不決定', value: null },
      { name: '其他（自行輸入）', value: 'other' }
    ]
  }])

  let finalCloud = cloud
  if (cloud === 'other') {
    const { customCloud } = await inquirer.prompt([{
      type: 'input',
      name: 'customCloud',
      message: '請輸入雲端平台：'
    }])
    finalCloud = customCloud
  }

  const { ciCd } = await inquirer.prompt([{
    type: 'list',
    name: 'ciCd',
    message: 'CI/CD 工具？',
    choices: [
      { name: 'GitHub Actions（推薦）', value: 'github-actions' },
      { name: 'GitLab CI', value: 'gitlab-ci' },
      { name: 'CircleCI', value: 'circleci' },
      { name: 'Jenkins', value: 'jenkins' },
      { name: '暫不使用', value: null },
      { name: '其他（自行輸入）', value: 'other' }
    ]
  }])

  let finalCiCd = ciCd
  if (ciCd === 'other') {
    const { customCiCd } = await inquirer.prompt([{
      type: 'input',
      name: 'customCiCd',
      message: '請輸入 CI/CD 工具：'
    }])
    finalCiCd = customCiCd
  }

  const { iac } = await inquirer.prompt([{
    type: 'list',
    name: 'iac',
    message: 'IaC 工具？',
    choices: [
      { name: 'Terraform（推薦）', value: 'terraform' },
      { name: 'Pulumi', value: 'pulumi' },
      { name: 'CDK', value: 'cdk' },
      { name: '暫不使用', value: null },
      { name: '其他（自行輸入）', value: 'other' }
    ]
  }])

  let finalIac = iac
  if (iac === 'other') {
    const { customIac } = await inquirer.prompt([{
      type: 'input',
      name: 'customIac',
      message: '請輸入 IaC 工具：'
    }])
    finalIac = customIac
  }

  return {
    cloud: finalCloud,
    ci_cd: finalCiCd,
    iac: finalIac
  }
}

async function promptTeamConfig() {
  const { testCoverage } = await inquirer.prompt([{
    type: 'list',
    name: 'testCoverage',
    message: '最低測試覆蓋率要求？',
    choices: [
      { name: '80%（推薦）', value: 80 },
      { name: '70%', value: 70 },
      { name: '60%', value: 60 },
      { name: '90%', value: 90 },
      { name: '其他（自行輸入）', value: 'other' }
    ]
  }])

  let finalTestCoverage = testCoverage
  if (testCoverage === 'other') {
    const { customCoverage } = await inquirer.prompt([{
      type: 'input',
      name: 'customCoverage',
      message: '請輸入覆蓋率要求（數字）：',
      validate: (input) => !isNaN(parseInt(input)) || '請輸入數字'
    }])
    finalTestCoverage = parseInt(customCoverage)
  }

  const { e2eRequired } = await inquirer.prompt([{
    type: 'list',
    name: 'e2eRequired',
    message: '是否強制 E2E 測試？',
    choices: [
      { name: 'Yes（推薦）', value: true },
      { name: 'No', value: false },
      { name: '其他（說明）', value: 'other' }
    ]
  }])

  let finalE2eRequired = e2eRequired
  if (e2eRequired === 'other') {
    const { customE2e } = await inquirer.prompt([{
      type: 'input',
      name: 'customE2e',
      message: '請說明 E2E 測試策略：'
    }])
    // 預設還是 true，但可以記錄說明
    finalE2eRequired = true
  }

  const { gitWorkflow } = await inquirer.prompt([{
    type: 'list',
    name: 'gitWorkflow',
    message: 'Git 工作流程？',
    choices: [
      { name: 'GitHub Flow（推薦）', value: 'github-flow' },
      { name: 'GitFlow', value: 'gitflow' },
      { name: 'Trunk-based', value: 'trunk-based' },
      { name: '其他（自行輸入）', value: 'other' }
    ]
  }])

  let finalGitWorkflow = gitWorkflow
  if (gitWorkflow === 'other') {
    const { customWorkflow } = await inquirer.prompt([{
      type: 'input',
      name: 'customWorkflow',
      message: '請輸入 Git 工作流程：'
    }])
    finalGitWorkflow = customWorkflow
  }

  const { commitConvention } = await inquirer.prompt([{
    type: 'list',
    name: 'commitConvention',
    message: 'Commit 規範？',
    choices: [
      { name: 'Conventional Commits（推薦）', value: 'conventional' },
      { name: 'Angular', value: 'angular' },
      { name: 'Semantic', value: 'semantic' },
      { name: '其他（自行輸入）', value: 'other' }
    ]
  }])

  let finalCommitConvention = commitConvention
  if (commitConvention === 'other') {
    const { customCommit } = await inquirer.prompt([{
      type: 'input',
      name: 'customCommit',
      message: '請輸入 Commit 規範：'
    }])
    finalCommitConvention = customCommit
  }

  const { reviewAgents } = await inquirer.prompt([{
    type: 'checkbox',
    name: 'reviewAgents',
    message: '啟用哪些核心 Review Agents？',
    choices: [
      { name: 'Security（強制）', value: 'security', checked: true, disabled: true },
      { name: 'Test - 測試覆蓋率檢查', value: 'test', checked: true },
      { name: 'Quality - Clean Architecture、Lint', value: 'quality', checked: true },
      { name: 'PM - 驗收條件檢查', value: 'pm', checked: true }
    ]
  }])

  // 進階 Reviewers 詢問
  const { enableAdvancedReviewers } = await inquirer.prompt([{
    type: 'confirm',
    name: 'enableAdvancedReviewers',
    message: '是否啟用進階 Review Agents？',
    default: false
  }])

  let advancedReviewAgents = []
  if (enableAdvancedReviewers) {
    const { advancedAgents } = await inquirer.prompt([{
      type: 'checkbox',
      name: 'advancedAgents',
      message: '選擇進階 Review Agents：',
      choices: [
        { name: 'Architect - 架構設計審查、模組邊界', value: 'architect' },
        { name: 'UI - UI/UX 一致性、設計規範遵循', value: 'ui' },
        { name: 'PRD Alignment - PRD 對齊檢查、需求符合度', value: 'prd-alignment' },
        { name: 'Estimator - 工時估算審查、複雜度評估', value: 'estimator' },
        { name: 'Infra Validator - 基礎設施配置驗證', value: 'infra-validator' },
        { name: 'Security Scanner - 自動化安全掃描、漏洞檢測', value: 'security-scanner' },
        { name: 'Rollback - 回滾策略審查、部署安全', value: 'rollback' },
        { name: 'Scope - 範圍蔓延檢測、變更控制', value: 'scope' }
      ]
    }])
    advancedReviewAgents = advancedAgents
  }

  // E2E 測試框架詢問
  let finalE2eFramework = 'playwright'
  if (finalE2eRequired) {
    const { e2eFramework } = await inquirer.prompt([{
      type: 'list',
      name: 'e2eFramework',
      message: 'E2E 測試框架？',
      choices: [
        { name: 'Playwright（推薦）', value: 'playwright' },
        { name: 'Cypress', value: 'cypress' },
        { name: 'Puppeteer', value: 'puppeteer' },
        { name: '其他（自行輸入）', value: 'other' }
      ]
    }])
    if (e2eFramework === 'other') {
      const { customE2eFramework } = await inquirer.prompt([{
        type: 'input',
        name: 'customE2eFramework',
        message: '請輸入 E2E 測試框架：'
      }])
      finalE2eFramework = customE2eFramework
    } else {
      finalE2eFramework = e2eFramework
    }
  }

  return {
    test_coverage: finalTestCoverage,
    e2e_required: finalE2eRequired,
    e2e_framework: finalE2eFramework,
    git_workflow: finalGitWorkflow,
    commit_convention: finalCommitConvention,
    review_required: true,
    review_agents: ['security', ...reviewAgents.filter(a => a !== 'security'), ...advancedReviewAgents]
  }
}

async function promptFeatureConfig(type) {
  switch (type) {
    case 'frontend':
      return promptFrontendConfig()
    case 'backend':
      return promptBackendConfig()
    case 'database':
      return promptDatabaseConfig()
    case 'infrastructure':
      return promptInfrastructureConfig()
    case 'design':
      return { enabled: true }
    default:
      return {}
  }
}

async function promptSkillsConfig() {
  const { enableSkills } = await inquirer.prompt([{
    type: 'confirm',
    name: 'enableSkills',
    message: '是否需要額外的 Skills（報表生成、文件協作等）？',
    default: false
  }])

  if (!enableSkills) {
    return { enabled: [] }
  }

  const { selectedSkills } = await inquirer.prompt([{
    type: 'checkbox',
    name: 'selectedSkills',
    message: '選擇需要的 Skills：',
    choices: [
      { name: 'xlsx - Excel 報表處理', value: 'xlsx' },
      { name: 'pdf - PDF 文件生成', value: 'pdf' },
      { name: 'doc-coauthoring - 結構化文件協作', value: 'doc-coauthoring' }
    ]
  }])

  return { enabled: selectedSkills }
}

function getDefaultConfig() {
  return {
    project: {
      name: path.basename(process.cwd()),
      type: 'web-app'
    },
    tech_stack: {
      backend: {
        language: 'go',
        framework: 'gin',
        orm: 'gorm',
        architecture: 'clean'
      },
      frontend: {
        language: 'typescript',
        framework: 'next',
        ui_framework: { default: 'mui' },
        styling: 'css-modules',
        package_manager: 'pnpm'
      },
      database: {
        type: 'postgresql',
        version: '16'
      }
    },
    team: {
      test_coverage: 80,
      e2e_required: true,
      e2e_framework: 'playwright',
      git_workflow: 'github-flow',
      commit_convention: 'conventional',
      review_required: true,
      review_agents: ['security', 'test', 'quality', 'pm']
    },
    design: {
      enabled: true,
      figma: { enabled: false }
    },
    skills: {
      enabled: []
    }
  }
}

function checkFeatureExists(config, type) {
  switch (type) {
    case 'frontend':
      return !!config.tech_stack?.frontend
    case 'backend':
      return !!config.tech_stack?.backend
    case 'database':
      return !!config.tech_stack?.database
    case 'infrastructure':
      return !!config.tech_stack?.infrastructure
    case 'design':
      return !!config.design?.enabled
    default:
      return false
  }
}

function updateConfigWithFeature(config, type, featureConfig) {
  const updated = { ...config }

  switch (type) {
    case 'frontend':
      updated.tech_stack = { ...updated.tech_stack, frontend: featureConfig }
      break
    case 'backend':
      updated.tech_stack = { ...updated.tech_stack, backend: featureConfig }
      break
    case 'database':
      updated.tech_stack = { ...updated.tech_stack, database: featureConfig }
      break
    case 'infrastructure':
      updated.tech_stack = { ...updated.tech_stack, infrastructure: featureConfig }
      break
    case 'design':
      updated.design = { enabled: true, ...featureConfig }
      break
  }

  return updated
}

// ============================================================
// File Generation Functions
// ============================================================

async function generateFiles(config) {
  const targetDir = process.cwd()
  const claudeDir = path.join(targetDir, '.claude')
  const docsDir = path.join(targetDir, 'docs')

  // 建立目錄
  await fs.ensureDir(claudeDir)
  await fs.ensureDir(path.join(claudeDir, 'agents', 'experts'))
  await fs.ensureDir(path.join(claudeDir, 'agents', 'reviewers'))
  await fs.ensureDir(path.join(claudeDir, 'agents', 'workers'))
  await fs.ensureDir(path.join(claudeDir, 'agents', 'reference'))
  await fs.ensureDir(path.join(claudeDir, 'commands'))
  await fs.ensureDir(path.join(claudeDir, 'templates'))
  await fs.ensureDir(path.join(claudeDir, 'skills'))
  await fs.ensureDir(docsDir)

  // 產生 project.yaml
  const projectYaml = generateProjectYaml(config)
  await fs.writeFile(
    path.join(claudeDir, 'project.yaml'),
    yaml.dump(projectYaml, { lineWidth: -1 })
  )

  // 複製基礎 templates
  await copyIfExists(
    path.join(TEMPLATES_DIR, 'WORKFLOWS.md'),
    path.join(claudeDir, 'WORKFLOWS.md')
  )
  await copyIfExists(
    path.join(TEMPLATES_DIR, 'EXTERNAL_RESOURCES.md'),
    path.join(claudeDir, 'EXTERNAL_RESOURCES.md')
  )

  // 讀取 registries 並條件式複製
  await copyConditionalFiles(config, claudeDir)

  // 產生 CLAUDE.md
  const claudeMd = generateClaudeMd(config)
  await fs.writeFile(path.join(claudeDir, 'CLAUDE.md'), claudeMd)

  // 產生 docs/PRD.md 和 docs/TICKETS.md
  await fs.writeFile(path.join(docsDir, 'PRD.md'), generatePrdTemplate())
  await fs.writeFile(path.join(docsDir, 'TICKETS.md'), generateTicketsTemplate())
}

async function copyConditionalFiles(config, claudeDir) {
  // 載入 registries
  const commandsRegistry = await loadRegistry('commands/_registry.yaml')
  const agentsRegistry = await loadRegistry('agents/_registry.yaml')

  // 複製 commands
  if (commandsRegistry?.commands) {
    await copyFromRegistry(commandsRegistry.commands, 'commands', claudeDir, config)
  }

  // 複製 agents
  if (agentsRegistry?.agents) {
    // Reviewers
    if (agentsRegistry.agents.reviewers) {
      await copyAgentCategory(agentsRegistry.agents.reviewers, 'reviewers', claudeDir, config)
    }
    // Experts
    if (agentsRegistry.agents.experts) {
      await copyAgentCategory(agentsRegistry.agents.experts, 'experts', claudeDir, config)
    }
    // Workers
    if (agentsRegistry.agents.workers) {
      await copyAgentCategory(agentsRegistry.agents.workers, 'workers', claudeDir, config)
    }
    // Reference
    if (agentsRegistry.agents.reference) {
      for (const agent of agentsRegistry.agents.reference) {
        if (matchesRequirements(agent.requires, config)) {
          await copyIfExists(
            path.join(TEMPLATES_DIR, 'agents', 'reference', agent.file),
            path.join(claudeDir, 'agents', 'reference', agent.file)
          )
        }
      }
    }
  }

  // 複製 skills
  // 如果有前端，複製 webapp-testing
  if (config.tech_stack?.frontend) {
    await copyDirIfExists(
      path.join(TEMPLATES_DIR, 'skills', 'webapp-testing'),
      path.join(claudeDir, 'skills', 'webapp-testing')
    )
  }

  // 複製使用者選擇的 skills（xlsx, pdf, doc-coauthoring）
  if (config.skills?.enabled && config.skills.enabled.length > 0) {
    for (const skill of config.skills.enabled) {
      await copyDirIfExists(
        path.join(TEMPLATES_DIR, 'skills', skill),
        path.join(claudeDir, 'skills', skill)
      )
    }
  }

  // 複製 templates
  await copyDirIfExists(
    path.join(TEMPLATES_DIR, 'templates'),
    path.join(claudeDir, 'templates')
  )
}

async function copyFromRegistry(registry, type, claudeDir, config) {
  for (const category of Object.values(registry)) {
    if (!Array.isArray(category)) continue
    for (const item of category) {
      if (item.required || matchesRequirements(item.requires, config)) {
        await copyIfExists(
          path.join(TEMPLATES_DIR, type, item.file),
          path.join(claudeDir, type, item.file)
        )
      }
    }
  }
}

async function copyAgentCategory(category, categoryName, claudeDir, config) {
  for (const [subCategory, agents] of Object.entries(category)) {
    if (!Array.isArray(agents)) continue
    for (const agent of agents) {
      if (agent.required || matchesRequirements(agent.requires, config)) {
        await copyIfExists(
          path.join(TEMPLATES_DIR, 'agents', categoryName, agent.file),
          path.join(claudeDir, 'agents', categoryName, agent.file)
        )
      }
    }
  }
}

async function copyFeatureFiles(type, config, mergeOnly) {
  const claudeDir = path.join(process.cwd(), '.claude')
  const agentsRegistry = await loadRegistry('agents/_registry.yaml')
  const commandsRegistry = await loadRegistry('commands/_registry.yaml')

  // 根據 feature type 決定要複製哪些檔案
  const featureAgents = getFeatureAgents(type, agentsRegistry)
  const featureCommands = getFeatureCommands(type, commandsRegistry)

  // 複製 agents
  for (const agent of featureAgents) {
    const targetPath = path.join(claudeDir, 'agents', agent.category, agent.file)
    if (mergeOnly && await fs.pathExists(targetPath)) continue
    await copyIfExists(
      path.join(TEMPLATES_DIR, 'agents', agent.category, agent.file),
      targetPath
    )
  }

  // 複製 commands
  for (const cmd of featureCommands) {
    const targetPath = path.join(claudeDir, 'commands', cmd.file)
    if (mergeOnly && await fs.pathExists(targetPath)) continue
    await copyIfExists(
      path.join(TEMPLATES_DIR, 'commands', cmd.file),
      targetPath
    )
  }

  // 特殊處理
  if (type === 'frontend') {
    // 複製 webapp-testing skill
    await copyDirIfExists(
      path.join(TEMPLATES_DIR, 'skills', 'webapp-testing'),
      path.join(claudeDir, 'skills', 'webapp-testing')
    )
  }
}

function getFeatureAgents(type, registry) {
  const agents = []

  const featureMap = {
    frontend: ['frontend', 'frontend-frameworks', 'design'],
    backend: ['backend', 'backend-languages'],
    database: ['database'],
    infrastructure: ['infrastructure'],
    design: ['design']
  }

  const categories = featureMap[type] || []

  if (registry?.agents?.experts) {
    for (const cat of categories) {
      if (registry.agents.experts[cat]) {
        for (const agent of registry.agents.experts[cat]) {
          agents.push({ ...agent, category: 'experts' })
        }
      }
    }
  }

  if (type === 'frontend' && registry?.agents?.reviewers?.design) {
    for (const agent of registry.agents.reviewers.design) {
      agents.push({ ...agent, category: 'reviewers' })
    }
  }

  if (registry?.agents?.workers?.specialized) {
    for (const agent of registry.agents.workers.specialized) {
      if (type === 'frontend' && agent.name.includes('frontend')) {
        agents.push({ ...agent, category: 'workers' })
      }
      if (type === 'backend' && agent.name.includes('backend')) {
        agents.push({ ...agent, category: 'workers' })
      }
      if (type === 'infrastructure' && agent.name.includes('devops')) {
        agents.push({ ...agent, category: 'workers' })
      }
    }
  }

  return agents
}

function getFeatureCommands(type, registry) {
  const commands = []

  const categoryMap = {
    frontend: ['design', 'testing'],
    backend: ['development'],
    database: ['deployment'],
    infrastructure: ['deployment'],
    design: ['design']
  }

  const categories = categoryMap[type] || []

  if (registry?.commands) {
    for (const cat of categories) {
      if (registry.commands[cat]) {
        for (const cmd of registry.commands[cat]) {
          commands.push(cmd)
        }
      }
    }
  }

  return commands
}

function matchesRequirements(requires, config) {
  if (!requires || requires.length === 0) return true

  for (const req of requires) {
    if (typeof req === 'object') {
      for (const [path, expected] of Object.entries(req)) {
        const value = getNestedValue(config, path)

        if (expected === 'exists') {
          if (!value) return false
        } else if (Array.isArray(expected)) {
          if (!expected.includes(value)) return false
        } else {
          if (value !== expected) return false
        }
      }
    }
  }

  return true
}

function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => current?.[key], obj)
}

async function loadRegistry(relativePath) {
  const fullPath = path.join(TEMPLATES_DIR, relativePath)
  if (await fs.pathExists(fullPath)) {
    const content = await fs.readFile(fullPath, 'utf8')
    return yaml.load(content)
  }
  return null
}

async function copyIfExists(src, dest) {
  if (await fs.pathExists(src)) {
    await fs.copy(src, dest)
    return true
  }
  return false
}

async function copyDirIfExists(src, dest) {
  if (await fs.pathExists(src)) {
    await fs.copy(src, dest)
    return true
  }
  return false
}

function generateProjectYaml(config) {
  const yaml = {
    project: config.project,
    tech_stack: {},
    team: config.team,
    design: config.design,
    paths: {
      prd: 'docs/PRD.md',
      tickets: 'docs/TICKETS.md',
      designs: 'docs/designs/'
    }
  }

  // 只加入有設定的 tech_stack
  if (config.tech_stack.backend) yaml.tech_stack.backend = config.tech_stack.backend
  if (config.tech_stack.frontend) yaml.tech_stack.frontend = config.tech_stack.frontend
  if (config.tech_stack.database) yaml.tech_stack.database = config.tech_stack.database
  if (config.tech_stack.infrastructure) yaml.tech_stack.infrastructure = config.tech_stack.infrastructure

  return yaml
}

function generateClaudeMd(config) {
  const hasBackend = !!config.tech_stack?.backend
  const hasFrontend = !!config.tech_stack?.frontend
  const hasInfra = !!config.tech_stack?.infrastructure

  return `# CLAUDE.md - ${config.project.name}

> Claude Code 專案指引。定義開發流程、規範和 AI 協作準則。

## 開發流程

**📖 完整工作流程總覽**：→ [.claude/WORKFLOWS.md](.claude/WORKFLOWS.md)

### 標準開發流程

\`\`\`text
┌─────────────────────────────────────────────────────────────────┐
│  Phase 0        Phase 1       Phase 2       Phase 3   Phase 4  │
│  ──────────     ──────────    ──────────    ────────  ──────── │
│  /project:plan  /project:     TDD 實作      E2E 測試  /project:│
│  (產出 Tickets) start-dev     RED→GREEN→    (強制)    done     │
│                 /project:tdd  REFACTOR                Review   │
└─────────────────────────────────────────────────────────────────┘
\`\`\`

## 專案資訊

| 項目 | 值 |
| ---- | -- |
| 專案名稱 | ${config.project.name} |
| 專案類型 | ${config.project.type} |
${hasBackend ? `| 後端 | ${config.tech_stack.backend.language} + ${config.tech_stack.backend.framework} |
| ORM | ${config.tech_stack.backend.orm} |
| 架構 | ${config.tech_stack.backend.architecture} |` : ''}
${hasFrontend ? `| 前端 | ${config.tech_stack.frontend.framework} |
| UI 框架 | ${config.tech_stack.frontend.ui_framework?.default || 'N/A'} |
| 套件管理器 | ${config.tech_stack.frontend.package_manager} |` : ''}
${config.tech_stack?.database ? `| 資料庫 | ${config.tech_stack.database.type} ${config.tech_stack.database.version} |` : ''}
| 測試覆蓋率目標 | ${config.team.test_coverage}% |
| E2E 測試 | ${config.team.e2e_required ? '強制' : '可選'} |

## Review Agents

| Agent | 說明 |
| ----- | ---- |
${config.team.review_agents.map(a => `| ${a} | ${getAgentDescription(a)} |`).join('\n')}

## 可用指令

| 指令 | 說明 |
| ---- | ---- |
| \`/project:plan <需求>\` | 需求規劃，產出 Tickets |
| \`/project:start-dev TICKET-XXX\` | 多 Agent 協作開發 |
| \`/project:tdd TICKET-XXX\` | TDD 模式開發 |
| \`/project:done\` | 完成開發，執行 Review |
| \`/project:add-feature <type>\` | 新增功能模組 |
${hasFrontend ? `| \`/project:design <元件>\` | UI 設計稿生成 |
| \`/project:test-e2e\` | E2E 測試 |` : ''}
${hasInfra ? `| \`/project:deploy <env>\` | 部署 |` : ''}

## 外部資源

建議瀏覽以下開源資源擴充專案能力：

- **[wshobson/agents](https://github.com/wshobson/agents)** - 108 個專業 Agents
- **[anthropics/skills](https://github.com/anthropics/skills)** - 官方 Skills 集合

詳見 → [.claude/EXTERNAL_RESOURCES.md](.claude/EXTERNAL_RESOURCES.md)

## 相關文件

- [docs/PRD.md](docs/PRD.md) - 產品需求文件
- [docs/TICKETS.md](docs/TICKETS.md) - Ticket 追蹤
`
}

function getAgentDescription(agent) {
  const descriptions = {
    security: 'OWASP 安全檢查',
    test: '測試覆蓋率、E2E 測試',
    quality: 'Clean Architecture、Lint',
    pm: '驗收條件檢查'
  }
  return descriptions[agent] || agent
}

function generatePrdTemplate() {
  return `# 產品需求文件 (PRD)

> 專案名稱 - 產品需求定義

## 1. 產品概述

### 1.1 背景
[說明專案背景]

### 1.2 目標
[說明專案目標]

### 1.3 用戶
[說明目標用戶]

---

## 2. 功能需求

### F1.1 功能名稱

**描述**:
[功能描述]

**用戶故事**:
作為 [角色]，我希望 [功能]，以便 [價值]

**驗收標準**:
- [ ] 標準 1
- [ ] 標準 2

---

## 3. 非功能需求

### 3.1 效能
- 回應時間 < 200ms

### 3.2 安全性
- 認證、授權

### 3.3 可用性
- 99.9% uptime

---

## 變更記錄

| 版本 | 日期 | 變更內容 |
| ---- | ---- | -------- |
| 1.0 | YYYY-MM-DD | 初版 |
`
}

function generateTicketsTemplate() {
  return `# Tickets 追蹤

> 開發任務追蹤

## 進度總覽

| Phase | 狀態 | 完成 |
| ----- | ---- | ---- |
| Phase 1 | 🔵 進行中 | 0/0 |

---

## Phase 1: [Phase 名稱]

### 🎫 TICKET-001: [標題]

**類型**: Backend | Frontend | Full-Stack

**描述**:
[功能描述]

**Backend 驗收條件**: (如適用)
- [ ] 條件 1
- [ ] 條件 2

**Frontend 驗收條件**: (如適用)
- [ ] 條件 1
- [ ] 條件 2

**相關 PRD**: F1.1

---
`
}

// ============================================================
// Output Functions
// ============================================================

function printGeneratedFiles(config) {
  console.log('產出檔案：')
  console.log('  - .claude/project.yaml')
  console.log('  - .claude/CLAUDE.md')
  console.log('  - .claude/WORKFLOWS.md')
  console.log('  - .claude/EXTERNAL_RESOURCES.md')
  console.log('  - .claude/agents/ (多個檔案)')
  console.log('  - .claude/commands/ (多個檔案)')
  if (config.tech_stack?.frontend) {
    console.log('  - .claude/skills/webapp-testing/')
  }
  console.log('  - docs/PRD.md')
  console.log('  - docs/TICKETS.md')
}

function printExternalResourcesRecommendation(config) {
  console.log(chalk.cyan('\n📦 推薦的外部資源：\n'))

  console.log('依據您的專案設定，建議安裝以下 Agents/Skills：')
  console.log('')

  if (config.tech_stack?.backend?.language === 'go') {
    console.log(chalk.yellow('  Go 專案推薦：'))
    console.log('    - golang-pro (wshobson/agents)')
    console.log('    - database-architect (wshobson/agents)')
  }

  if (config.tech_stack?.frontend) {
    console.log(chalk.yellow('  前端專案推薦：'))
    console.log('    - frontend-developer (wshobson/agents)')
    console.log('    - webapp-testing (anthropics/skills) ✅ 已安裝')
  }

  if (config.tech_stack?.infrastructure) {
    console.log(chalk.yellow('  基礎設施推薦：'))
    console.log('    - cloud-architect (wshobson/agents)')
    console.log('    - devops-troubleshooter (wshobson/agents)')
  }

  console.log('')
  console.log('詳見 .claude/EXTERNAL_RESOURCES.md')
}

function printFeatureFiles(type) {
  console.log('新增的檔案：')

  const files = {
    frontend: [
      '.claude/agents/experts/frontend.md',
      '.claude/agents/experts/ux-ui-designer.md',
      '.claude/agents/workers/engineer-frontend.md',
      '.claude/commands/design.md',
      '.claude/skills/webapp-testing/'
    ],
    backend: [
      '.claude/agents/experts/backend.md',
      '.claude/agents/workers/engineer-backend.md'
    ],
    database: [
      '.claude/agents/experts/database.md'
    ],
    infrastructure: [
      '.claude/agents/experts/cicd.md',
      '.claude/agents/workers/devops-troubleshooter.md',
      '.claude/commands/deploy.md'
    ],
    design: [
      '.claude/agents/experts/design-system-architect.md',
      '.claude/commands/design-system.md'
    ]
  }

  for (const file of files[type] || []) {
    console.log(`  - ${file}`)
  }
}

function printFeatureRecommendation(type) {
  console.log(chalk.cyan('\n📦 推薦的外部資源：\n'))

  const recommendations = {
    frontend: [
      'frontend-developer (wshobson/agents)',
      'webapp-testing (anthropics/skills)'
    ],
    backend: [
      'golang-pro / python-pro / typescript-pro (wshobson/agents)',
      'database-architect (wshobson/agents)'
    ],
    database: [
      'database-architect (wshobson/agents)'
    ],
    infrastructure: [
      'cloud-architect (wshobson/agents)',
      'devops-troubleshooter (wshobson/agents)'
    ],
    design: [
      'ui-designer (wshobson/agents)',
      'frontend-design (anthropics/skills)'
    ]
  }

  for (const rec of recommendations[type] || []) {
    console.log(`  - ${rec}`)
  }
}

function printNextSteps() {
  console.log('\n下一步：')
  console.log('  1. 編輯 docs/PRD.md 定義產品需求')
  console.log('  2. 在 Claude Code 中執行 /project:plan <需求>')
  console.log('  3. 瀏覽 .claude/EXTERNAL_RESOURCES.md 選擇需要的 Agents/Skills')
}

program.parse()

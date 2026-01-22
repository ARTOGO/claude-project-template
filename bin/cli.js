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
// Helper Functions
// ============================================================

async function promptForConfig() {
  // Phase 1: 專案類型
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
        { name: 'Monorepo', value: 'monorepo' }
      ]
    }
  ])

  // Phase 2: 技術棧
  let backendConfig = null
  let frontendConfig = null
  let databaseConfig = null

  const hasBackend = ['web-app', 'backend-only', 'microservice', 'cli', 'monorepo'].includes(projectType)
  const hasFrontend = ['web-app', 'frontend-only', 'monorepo'].includes(projectType)

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

async function promptBackendConfig() {
  const { language } = await inquirer.prompt([
    {
      type: 'list',
      name: 'language',
      message: '後端使用什麼語言？',
      choices: [
        { name: 'Go (推薦)', value: 'go' },
        { name: 'Python', value: 'python' },
        { name: 'Node.js (TypeScript)', value: 'node' },
        { name: 'Java', value: 'java' },
        { name: 'Rust', value: 'rust' }
      ]
    }
  ])

  const frameworkChoices = {
    go: ['gin', 'echo', 'fiber', 'chi'],
    python: ['fastapi', 'django', 'flask'],
    node: ['express', 'nestjs', 'fastify', 'hono'],
    java: ['spring-boot', 'quarkus'],
    rust: ['actix', 'axum']
  }

  const ormChoices = {
    go: ['gorm', 'sqlx', 'ent'],
    python: ['sqlalchemy', 'django-orm', 'tortoise'],
    node: ['prisma', 'typeorm', 'drizzle'],
    java: ['jpa', 'mybatis'],
    rust: ['diesel', 'sea-orm']
  }

  const { framework, orm, architecture } = await inquirer.prompt([
    {
      type: 'list',
      name: 'framework',
      message: '使用什麼框架？',
      choices: frameworkChoices[language]
    },
    {
      type: 'list',
      name: 'orm',
      message: '使用什麼 ORM？',
      choices: ormChoices[language]
    },
    {
      type: 'list',
      name: 'architecture',
      message: '架構模式？',
      choices: [
        { name: 'Clean Architecture (推薦)', value: 'clean' },
        { name: 'Hexagonal', value: 'hexagonal' },
        { name: 'Layered', value: 'layered' }
      ]
    }
  ])

  return { language, framework, orm, architecture }
}

async function promptFrontendConfig() {
  const { framework } = await inquirer.prompt([
    {
      type: 'list',
      name: 'framework',
      message: '前端使用什麼框架？',
      choices: [
        { name: 'Next.js (推薦)', value: 'next' },
        { name: 'React', value: 'react' },
        { name: 'Vue', value: 'vue' },
        { name: 'Nuxt', value: 'nuxt' },
        { name: 'Angular', value: 'angular' },
        { name: 'Svelte', value: 'svelte' }
      ]
    }
  ])

  const { uiFramework, styling, packageManager } = await inquirer.prompt([
    {
      type: 'list',
      name: 'uiFramework',
      message: 'UI 框架？',
      choices: [
        { name: 'MUI (Material UI)', value: 'mui' },
        { name: 'Ant Design', value: 'antd' },
        { name: 'shadcn/ui', value: 'shadcn' },
        { name: 'Tailwind (無元件庫)', value: 'tailwind' },
        { name: 'Chakra UI', value: 'chakra' }
      ]
    },
    {
      type: 'list',
      name: 'styling',
      message: '樣式方案？',
      choices: [
        { name: 'CSS Modules (推薦)', value: 'css-modules' },
        { name: 'Tailwind', value: 'tailwind' },
        { name: 'Styled Components', value: 'styled-components' }
      ]
    },
    {
      type: 'list',
      name: 'packageManager',
      message: '套件管理器？',
      choices: [
        { name: 'pnpm (推薦)', value: 'pnpm' },
        { name: 'npm', value: 'npm' },
        { name: 'yarn', value: 'yarn' },
        { name: 'bun', value: 'bun' }
      ]
    }
  ])

  return {
    language: 'typescript',
    framework,
    ui_framework: { default: uiFramework },
    styling,
    package_manager: packageManager
  }
}

async function promptDatabaseConfig() {
  const { type, version } = await inquirer.prompt([
    {
      type: 'list',
      name: 'type',
      message: '資料庫類型？',
      choices: [
        { name: 'PostgreSQL (推薦)', value: 'postgresql' },
        { name: 'MySQL', value: 'mysql' },
        { name: 'MongoDB', value: 'mongodb' },
        { name: 'SQLite', value: 'sqlite' }
      ]
    },
    {
      type: 'input',
      name: 'version',
      message: '資料庫版本？',
      default: '16'
    }
  ])

  return { type, version }
}

async function promptInfrastructureConfig() {
  const { cloud, ciCd, iac } = await inquirer.prompt([
    {
      type: 'list',
      name: 'cloud',
      message: '雲端平台？',
      choices: [
        { name: 'GCP', value: 'gcp' },
        { name: 'AWS', value: 'aws' },
        { name: 'Azure', value: 'azure' },
        { name: 'Vercel', value: 'vercel' },
        { name: 'None', value: null }
      ]
    },
    {
      type: 'list',
      name: 'ciCd',
      message: 'CI/CD 工具？',
      choices: [
        { name: 'GitHub Actions (推薦)', value: 'github-actions' },
        { name: 'GitLab CI', value: 'gitlab-ci' },
        { name: 'CircleCI', value: 'circleci' },
        { name: 'None', value: null }
      ]
    },
    {
      type: 'list',
      name: 'iac',
      message: 'IaC 工具？',
      choices: [
        { name: 'Terraform (推薦)', value: 'terraform' },
        { name: 'Pulumi', value: 'pulumi' },
        { name: 'CDK', value: 'cdk' },
        { name: 'None', value: null }
      ]
    }
  ])

  return {
    cloud,
    ci_cd: ciCd,
    iac
  }
}

async function promptTeamConfig() {
  const { testCoverage, e2eRequired, gitWorkflow, reviewAgents } = await inquirer.prompt([
    {
      type: 'list',
      name: 'testCoverage',
      message: '最低測試覆蓋率要求？',
      choices: [
        { name: '80% (推薦)', value: 80 },
        { name: '70%', value: 70 },
        { name: '60%', value: 60 },
        { name: '90%', value: 90 }
      ]
    },
    {
      type: 'confirm',
      name: 'e2eRequired',
      message: '是否強制 E2E 測試？',
      default: true
    },
    {
      type: 'list',
      name: 'gitWorkflow',
      message: 'Git 工作流程？',
      choices: [
        { name: 'GitHub Flow (推薦)', value: 'github-flow' },
        { name: 'GitFlow', value: 'gitflow' },
        { name: 'Trunk-based', value: 'trunk-based' }
      ]
    },
    {
      type: 'checkbox',
      name: 'reviewAgents',
      message: '啟用哪些 Review Agents？',
      choices: [
        { name: 'Security (強制)', value: 'security', checked: true, disabled: true },
        { name: 'Test', value: 'test', checked: true },
        { name: 'Quality', value: 'quality', checked: true },
        { name: 'PM', value: 'pm', checked: true }
      ]
    }
  ])

  return {
    test_coverage: testCoverage,
    e2e_required: e2eRequired,
    e2e_framework: 'playwright',
    git_workflow: gitWorkflow,
    commit_convention: 'conventional',
    review_required: true,
    review_agents: ['security', ...reviewAgents.filter(a => a !== 'security')]
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

  // 複製 skills（如果有前端，複製 webapp-testing）
  if (config.tech_stack?.frontend) {
    await copyDirIfExists(
      path.join(TEMPLATES_DIR, 'skills', 'webapp-testing'),
      path.join(claudeDir, 'skills', 'webapp-testing')
    )
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
    frontend: ['frontend', 'design'],
    backend: ['backend'],
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

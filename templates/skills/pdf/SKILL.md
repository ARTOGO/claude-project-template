# PDF Skill - PDF 處理

全面的 PDF 處理能力，包含文字提取、表格檢測、文件創建、合併、分割和表單處理。

## 核心能力

本工具包提供「全面的 PDF 處理」能力，包含文字提取、表格檢測、文件創建、合併、分割和表單處理。利用多個 Python 函式庫和命令列工具處理不同使用場景。

## 主要函式庫

**pypdf** 處理結構操作：合併多個文件、提取個別頁面、檢索中繼資料和旋轉內容。它也支援加密和解密工作流程。

**pdfplumber** 專精於內容提取，特別是「帶版面的文字」保留和複雜的表格識別。它可以將提取的表格轉換為 pandas DataFrames 以供進一步分析。

**reportlab** 從頭開始生成 PDF，使用低層級畫布操作或高層級 Platypus 模板來處理複雜的多頁文件。

## 文字與資料提取

工具包支援標準文字提取、掃描文件的 OCR 處理（透過 pytesseract），以及自動將表格轉換為 Excel 格式。命令列工具如 pdftotext 提供保留版面的提取選項。

## 進階操作

能力包含浮水印、圖片提取、密碼保護和頁面處理（旋轉、分割）。表單填寫操作在補充指南中單獨記錄。

## 部署情境

本 skill 專為批次處理、程式化文件處理和需要「規模化」自動化的場景而設計。Python API 和命令列介面都提供不同整合方法的靈活性。

---

## InsightHub PDF 報表指南

### 報表類型

#### 1. 查詢結果 PDF

特點：
- 標題頁（查詢資訊、執行時間）
- 資料表格（分頁顯示）
- 頁首/頁尾（Logo、頁碼）

#### 2. 審計日誌 PDF

特點：
- 時間軸視覺化
- 操作記錄表格
- 統計摘要

#### 3. 權限規則文件

特點：
- 結構化章節
- 表格權限矩陣
- 流程圖

### 使用 ReportLab 創建報表

```python
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from datetime import datetime

def create_query_result_pdf(data: dict, output_path: str):
    """創建 InsightHub 查詢結果 PDF"""

    doc = SimpleDocTemplate(output_path, pagesize=A4)
    story = []
    styles = getSampleStyleSheet()

    # 自訂樣式
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#4A90E2'),
        spaceAfter=30,
    )

    # 標題頁
    story.append(Paragraph("InsightHub 查詢報表", title_style))
    story.append(Spacer(1, 0.2*inch))

    # 查詢資訊
    info_data = [
        ['查詢時間', datetime.now().strftime('%Y-%m-%d %H:%M:%S')],
        ['連接', data.get('connection_name', 'N/A')],
        ['資料庫', data.get('database', 'N/A')],
        ['執行時間', f"{data.get('execution_time', 0):.2f} 秒"],
    ]

    info_table = Table(info_data, colWidths=[2*inch, 4*inch])
    info_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#F5F5F5')),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ('GRID', (0, 0), (-1, -1), 1, colors.grey),
    ]))

    story.append(info_table)
    story.append(Spacer(1, 0.5*inch))

    # 查詢 SQL
    story.append(Paragraph("查詢語句", styles['Heading2']))
    story.append(Paragraph(f"<code>{data.get('query', '')}</code>", styles['Code']))
    story.append(PageBreak())

    # 資料表格
    story.append(Paragraph("查詢結果", styles['Heading2']))
    story.append(Spacer(1, 0.2*inch))

    # 準備表格資料
    columns = data.get('columns', [])
    rows = data.get('rows', [])

    table_data = [columns] + rows

    # 分頁顯示（每頁最多 30 行）
    page_size = 30
    for i in range(0, len(rows), page_size):
        page_data = [columns] + rows[i:i+page_size]

        data_table = Table(page_data)
        data_table.setStyle(TableStyle([
            # 標題行樣式
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4A90E2')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),

            # 資料行樣式
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F9F9F9')]),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ]))

        story.append(data_table)

        if i + page_size < len(rows):
            story.append(PageBreak())

    # 生成 PDF
    doc.build(story)
```

### 審計日誌 PDF

```python
def create_audit_log_pdf(logs: list, output_path: str):
    """創建審計日誌 PDF"""

    doc = SimpleDocTemplate(output_path, pagesize=A4)
    story = []
    styles = getSampleStyleSheet()

    # 標題
    story.append(Paragraph("審計日誌報表", styles['Title']))
    story.append(Spacer(1, 0.3*inch))

    # 統計摘要
    story.append(Paragraph("統計摘要", styles['Heading2']))

    summary_data = [
        ['總操作數', str(len(logs))],
        ['時間範圍', f"{logs[0]['timestamp']} ~ {logs[-1]['timestamp']}"],
        ['用戶數', str(len(set(log['user'] for log in logs)))],
    ]

    summary_table = Table(summary_data)
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#F5F5F5')),
        ('GRID', (0, 0), (-1, -1), 1, colors.grey),
    ]))

    story.append(summary_table)
    story.append(Spacer(1, 0.3*inch))

    # 操作記錄
    story.append(Paragraph("操作記錄", styles['Heading2']))

    log_data = [['時間', '用戶', '操作', '資源']]
    for log in logs:
        log_data.append([
            log['timestamp'],
            log['user'],
            log['action'],
            log['resource']
        ])

    log_table = Table(log_data, colWidths=[1.5*inch, 1.5*inch, 2*inch, 2*inch])
    log_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4A90E2')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F9F9F9')]),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
    ]))

    story.append(log_table)

    # 生成 PDF
    doc.build(story)
```

### 最佳實踐

1. **分頁處理**: 大型表格自動分頁
2. **樣式一致**: 使用 InsightHub 品牌顏色
3. **頁首頁尾**: 添加 Logo 和頁碼
4. **錯誤處理**: 處理特殊字元和長文字
5. **檔案大小**: 優化圖片以減少檔案大小

### 表格提取

使用 pdfplumber 從現有 PDF 提取表格：

```python
import pdfplumber

def extract_tables_from_pdf(pdf_path: str) -> list:
    """從 PDF 提取所有表格"""
    tables = []

    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            page_tables = page.extract_tables()
            tables.extend(page_tables)

    return tables
```

## 相關檔案

- Command: `.claude/commands/export-pdf.md` (待創建)

## 相關 Tickets

- TICKET-037: 查詢結果導出功能
- TICKET-024: 審計日誌

---

**Skill 來源**: Anthropic Skills - `pdf`
**整合日期**: 2026-01-20
**維護者**: InsightHub Team

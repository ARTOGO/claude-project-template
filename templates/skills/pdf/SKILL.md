# PDF Processing Skill

> PDF 處理專家。專精 PDF 生成、解析、轉換與操作。

**來源**: 整合自 [anthropics/skills](https://github.com/anthropics/skills) - pdf

---

## 適用時機

當需要處理 PDF 檔案（生成報告、解析內容、轉換格式）時，自動載入此 Skill。

---

## 核心能力

### PDF 生成

- 從 HTML/Markdown 生成 PDF
- 使用模板生成報告
- 支援自訂樣式與版面

### PDF 解析

- 文字擷取
- 表格識別
- 圖片擷取
- 結構分析

### PDF 操作

- 合併多個 PDF
- 分割 PDF
- 頁面旋轉/重排
- 加密/解密

---

## 技術棧支援

### Node.js / TypeScript

| 套件 | 用途 |
|------|------|
| `pdf-lib` | PDF 建立與修改 |
| `pdfjs-dist` | PDF 解析 |
| `puppeteer` | HTML 轉 PDF |
| `playwright` | HTML 轉 PDF |

### Python

| 套件 | 用途 |
|------|------|
| `PyPDF2` | PDF 操作 |
| `pdfplumber` | PDF 解析與表格擷取 |
| `reportlab` | PDF 生成 |
| `weasyprint` | HTML 轉 PDF |

---

## 使用模式

### Node.js：從 HTML 生成 PDF

```typescript
import puppeteer from 'puppeteer';

async function generatePDF(html: string, outputPath: string) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  await page.setContent(html, { waitUntil: 'networkidle0' });
  
  await page.pdf({
    path: outputPath,
    format: 'A4',
    margin: {
      top: '20mm',
      right: '20mm',
      bottom: '20mm',
      left: '20mm'
    },
    printBackground: true
  });
  
  await browser.close();
}
```

### Node.js：PDF 操作

```typescript
import { PDFDocument } from 'pdf-lib';
import fs from 'fs/promises';

// 合併 PDF
async function mergePDFs(pdfPaths: string[], outputPath: string) {
  const mergedPdf = await PDFDocument.create();
  
  for (const pdfPath of pdfPaths) {
    const pdfBytes = await fs.readFile(pdfPath);
    const pdf = await PDFDocument.load(pdfBytes);
    const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    pages.forEach(page => mergedPdf.addPage(page));
  }
  
  const mergedPdfBytes = await mergedPdf.save();
  await fs.writeFile(outputPath, mergedPdfBytes);
}

// 分割 PDF
async function splitPDF(pdfPath: string, outputDir: string) {
  const pdfBytes = await fs.readFile(pdfPath);
  const pdf = await PDFDocument.load(pdfBytes);
  
  for (let i = 0; i < pdf.getPageCount(); i++) {
    const newPdf = await PDFDocument.create();
    const [page] = await newPdf.copyPages(pdf, [i]);
    newPdf.addPage(page);
    
    const newPdfBytes = await newPdf.save();
    await fs.writeFile(`${outputDir}/page-${i + 1}.pdf`, newPdfBytes);
  }
}
```

### Python：PDF 解析

```python
import pdfplumber

def extract_text(pdf_path: str) -> str:
    """擷取 PDF 文字內容"""
    text = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            text.append(page.extract_text())
    return '\n'.join(text)

def extract_tables(pdf_path: str) -> list:
    """擷取 PDF 中的表格"""
    tables = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            page_tables = page.extract_tables()
            tables.extend(page_tables)
    return tables
```

### Python：報告生成

```python
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Table
from reportlab.lib.styles import getSampleStyleSheet

def generate_report(data: dict, output_path: str):
    """生成 PDF 報告"""
    doc = SimpleDocTemplate(output_path, pagesize=A4)
    styles = getSampleStyleSheet()
    elements = []
    
    # 標題
    elements.append(Paragraph(data['title'], styles['Heading1']))
    
    # 內容
    for section in data['sections']:
        elements.append(Paragraph(section['heading'], styles['Heading2']))
        elements.append(Paragraph(section['content'], styles['Normal']))
    
    # 表格
    if 'table_data' in data:
        table = Table(data['table_data'])
        elements.append(table)
    
    doc.build(elements)
```

---

## 報告模板

### 標準報告結構

```markdown
# 報告標題

## 摘要
[執行摘要]

## 詳細內容
### 章節 1
[內容]

### 章節 2
[內容]

## 數據表格
| 欄位 1 | 欄位 2 | 欄位 3 |
|--------|--------|--------|
| 值 1   | 值 2   | 值 3   |

## 結論
[結論與建議]

---
生成日期: {date}
```

---

## 最佳實踐

### 1. 效能優化

```typescript
// 批次處理大量 PDF
async function batchProcess(files: string[], concurrency = 5) {
  const chunks = [];
  for (let i = 0; i < files.length; i += concurrency) {
    chunks.push(files.slice(i, i + concurrency));
  }
  
  for (const chunk of chunks) {
    await Promise.all(chunk.map(processPDF));
  }
}
```

### 2. 錯誤處理

```typescript
async function safePDFParse(pdfPath: string) {
  try {
    const pdfBytes = await fs.readFile(pdfPath);
    const pdf = await PDFDocument.load(pdfBytes);
    return pdf;
  } catch (error) {
    if (error.message.includes('encrypted')) {
      throw new Error('PDF is encrypted and requires a password');
    }
    throw new Error(`Failed to parse PDF: ${error.message}`);
  }
}
```

### 3. 記憶體管理

```python
# 處理大型 PDF 時使用串流
def process_large_pdf(pdf_path: str):
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            # 逐頁處理，避免載入整個檔案到記憶體
            yield process_page(page)
```

---

## 與專案整合

### 報告生成工作流程

```text
資料來源 → 資料處理 → 套用模板 → 生成 PDF → 輸出
    │          │          │          │
    └──────────┴──────────┴──────────┘
                  可配置
```

### 配置範例

```yaml
# project.yaml
reports:
  output_dir: reports/
  template_dir: templates/reports/
  default_format: A4
  margin: 20mm
```

---

## 相關檔案

- 文件處理：`.claude/skills/xlsx/SKILL.md`
- 文件協作：`.claude/skills/doc-coauthoring/SKILL.md`

---

**類型**: 文件處理 Skill
**來源**: [anthropics/skills](https://github.com/anthropics/skills) - pdf

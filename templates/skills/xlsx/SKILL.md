# Excel/XLSX Processing Skill

> Excel 處理專家。專精試算表資料處理、報表生成、資料分析。

**來源**: 整合自 [anthropics/skills](https://github.com/anthropics/skills) - xlsx

---

## 適用時機

當需要處理 Excel 檔案（讀取資料、生成報表、資料轉換）時，自動載入此 Skill。

---

## 核心能力

### 資料讀取

- 讀取 .xlsx/.xls 檔案
- 多工作表處理
- 格式識別（日期、數字、公式）
- 大型檔案串流讀取

### 報表生成

- 建立新 Excel 檔案
- 套用樣式與格式
- 圖表生成
- 公式設定

### 資料處理

- 資料清洗
- 資料轉換
- 資料驗證
- 批次處理

---

## 技術棧支援

### Node.js / TypeScript

| 套件 | 用途 |
|------|------|
| `xlsx` | 讀寫 Excel（輕量） |
| `exceljs` | 完整 Excel 操作（樣式、圖表） |
| `xlsx-stream-reader` | 大型檔案串流讀取 |

### Python

| 套件 | 用途 |
|------|------|
| `openpyxl` | 讀寫 .xlsx |
| `pandas` | 資料處理與分析 |
| `xlrd` | 讀取 .xls |
| `xlsxwriter` | 高效能寫入 |

---

## 使用模式

### Node.js：讀取 Excel

```typescript
import ExcelJS from 'exceljs';

async function readExcel(filePath: string) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  
  const data: Record<string, any[]> = {};
  
  workbook.eachSheet((sheet, sheetId) => {
    const rows: any[] = [];
    const headers: string[] = [];
    
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) {
        // 第一行為標題
        row.eachCell((cell) => {
          headers.push(String(cell.value));
        });
      } else {
        const rowData: Record<string, any> = {};
        row.eachCell((cell, colNumber) => {
          rowData[headers[colNumber - 1]] = cell.value;
        });
        rows.push(rowData);
      }
    });
    
    data[sheet.name] = rows;
  });
  
  return data;
}
```

### Node.js：生成報表

```typescript
import ExcelJS from 'exceljs';

async function generateReport(data: any[], outputPath: string) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Report');
  
  // 設定標題
  sheet.columns = [
    { header: 'ID', key: 'id', width: 10 },
    { header: 'Name', key: 'name', width: 30 },
    { header: 'Value', key: 'value', width: 15 },
    { header: 'Date', key: 'date', width: 15 }
  ];
  
  // 標題樣式
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  };
  
  // 新增資料
  data.forEach(item => {
    sheet.addRow(item);
  });
  
  // 自動篩選
  sheet.autoFilter = {
    from: 'A1',
    to: `D${data.length + 1}`
  };
  
  await workbook.xlsx.writeFile(outputPath);
}
```

### Python：使用 Pandas 處理

```python
import pandas as pd

def read_and_process(file_path: str) -> pd.DataFrame:
    """讀取並處理 Excel 資料"""
    # 讀取 Excel
    df = pd.read_excel(file_path, sheet_name='Sheet1')
    
    # 資料清洗
    df = df.dropna()  # 移除空值
    df = df.drop_duplicates()  # 移除重複
    
    # 資料轉換
    df['date'] = pd.to_datetime(df['date'])
    df['value'] = df['value'].astype(float)
    
    return df

def export_to_excel(df: pd.DataFrame, output_path: str):
    """匯出到 Excel"""
    with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name='Data', index=False)
        
        # 新增摘要工作表
        summary = df.describe()
        summary.to_excel(writer, sheet_name='Summary')
```

### Python：進階報表

```python
from openpyxl import Workbook
from openpyxl.chart import BarChart, Reference
from openpyxl.styles import Font, PatternFill

def create_chart_report(data: list, output_path: str):
    """建立帶圖表的報表"""
    wb = Workbook()
    ws = wb.active
    ws.title = "Sales Report"
    
    # 標題樣式
    header_font = Font(bold=True, color="FFFFFF")
    header_fill = PatternFill("solid", fgColor="4472C4")
    
    # 寫入資料
    headers = ['Month', 'Sales', 'Target']
    for col, header in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col, value=header)
        cell.font = header_font
        cell.fill = header_fill
    
    for row_idx, row_data in enumerate(data, 2):
        for col_idx, value in enumerate(row_data, 1):
            ws.cell(row=row_idx, column=col_idx, value=value)
    
    # 建立圖表
    chart = BarChart()
    chart.title = "Monthly Sales vs Target"
    chart.x_axis.title = "Month"
    chart.y_axis.title = "Amount"
    
    data_ref = Reference(ws, min_col=2, max_col=3, 
                         min_row=1, max_row=len(data) + 1)
    categories = Reference(ws, min_col=1, 
                          min_row=2, max_row=len(data) + 1)
    
    chart.add_data(data_ref, titles_from_data=True)
    chart.set_categories(categories)
    
    ws.add_chart(chart, "E2")
    
    wb.save(output_path)
```

---

## 最佳實踐

### 1. 大型檔案處理

```typescript
// 串流讀取大型 Excel
import { Readable } from 'stream';
import XlsxStreamReader from 'xlsx-stream-reader';

async function streamReadLargeExcel(filePath: string) {
  return new Promise((resolve, reject) => {
    const rows: any[] = [];
    const workBookReader = new XlsxStreamReader();
    
    workBookReader.on('worksheet', (workSheetReader) => {
      workSheetReader.on('row', (row) => {
        rows.push(row.values);
      });
      workSheetReader.process();
    });
    
    workBookReader.on('end', () => resolve(rows));
    workBookReader.on('error', reject);
    
    fs.createReadStream(filePath).pipe(workBookReader);
  });
}
```

### 2. 資料驗證

```typescript
function validateExcelData(data: any[]) {
  const errors: string[] = [];
  
  data.forEach((row, index) => {
    if (!row.id) {
      errors.push(`Row ${index + 1}: Missing ID`);
    }
    if (row.value && isNaN(Number(row.value))) {
      errors.push(`Row ${index + 1}: Invalid value format`);
    }
  });
  
  return errors;
}
```

### 3. 公式處理

```typescript
// 設定公式而非靜態值
sheet.getCell('E2').value = { formula: 'SUM(B2:D2)' };
sheet.getCell('E3').value = { formula: 'AVERAGE(B2:D10)' };
```

---

## 與專案整合

### 資料匯入/匯出工作流程

```text
上傳 Excel → 驗證格式 → 資料處理 → 儲存到資料庫
                                    ↓
                              生成處理報告
```

### 配置範例

```yaml
# project.yaml
excel:
  max_file_size: 50MB
  allowed_extensions: [.xlsx, .xls]
  date_format: YYYY-MM-DD
  number_format: "#,##0.00"
```

---

## 相關檔案

- PDF 處理：`.claude/skills/pdf/SKILL.md`
- 文件協作：`.claude/skills/doc-coauthoring/SKILL.md`

---

**類型**: 文件處理 Skill
**來源**: [anthropics/skills](https://github.com/anthropics/skills) - xlsx

# XLSX Skill - Excel 報表處理

全面的 Excel 試算表處理能力，包含創建、編輯、分析和公式管理 (.xlsx, .xlsm, .csv, .tsv)。

## 核心能力

**資料操作**：
- 創建新試算表，包含公式和格式
- 讀取和分析試算表資料
- 修改現有檔案，保留公式
- 執行資料分析和視覺化
- 重新計算公式，自動檢測錯誤

**關鍵要求**: "每個 Excel 模型必須零公式錯誤交付"，包含 #REF!, #DIV/0!, #VALUE!, #N/A, 和 #NAME? 錯誤。

## 工具選擇

**Pandas** 處理資料分析、批次操作和視覺化，提供強大的資料處理能力。

**Openpyxl** 管理複雜格式、公式和 Excel 特定功能，同時保留現有結構。

## 財務模型標準

**顏色編碼（業界標準）**：
- 藍色文字：使用者修改的硬編碼輸入
- 黑色文字：公式和計算
- 綠色文字：工作簿內鏈接
- 紅色文字：外部檔案鏈接
- 黃色背景：需要注意的關鍵假設

**數值格式**：
- 年份使用文字格式（"2024" 而非 "2,024"）
- 貨幣單位在標題中顯示（"營收 ($mm)"）
- 零值顯示為 "-"
- 百分比使用 0.0% 格式
- 負數使用括號，而非減號

## 關鍵公式指引

**永遠使用 Excel 公式，而非硬編碼值**。這確保試算表保持動態：

✓ 正確: `sheet['B10'] = '=SUM(B2:B9)'`
✗ 錯誤: 在 Python 中計算並硬編碼結果

**假設放置**: 將所有變數單獨儲存；在公式中引用它們，而非嵌入常數。

## 工作流程

1. 選擇適當工具（pandas 或 openpyxl）
2. 創建或載入工作簿
3. 添加/修改資料、公式、格式
4. 儲存檔案
5. **強制重新計算**: 執行 `python recalc.py output.xlsx`
6. 驗證無錯誤；修復任何發現的問題

## 公式驗證檢查清單

- 測試 2-3 個樣本引用的準確性
- 確認列映射（例如，列 64 = BL）
- 記住 Excel 使用 1-based 索引
- 檢查除零風險
- 驗證所有儲存格引用存在
- 使用正確的跨工作表語法（Sheet1!A1）

## 程式碼標準

撰寫簡潔的 Python 程式碼，無需不必要的註解。對於 Excel 檔案本身，為複雜公式添加註解，並使用特定引用（公司文件、Bloomberg、FactSet 等）記錄硬編碼值的來源。

---

## InsightHub Excel 報表指南

### 報表樣式標準

```python
# InsightHub 樣式配置
HEADER_FILL = PatternFill(start_color='4A90E2', end_color='4A90E2', fill_type='solid')
HEADER_FONT = Font(bold=True, color='FFFFFF')
NUMBER_FORMAT = '#,##0'
DATE_FORMAT = 'YYYY-MM-DD'
NULL_VALUE = '-'
```

### 查詢結果轉換範例

```python
import pandas as pd
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment

def export_query_result_to_excel(data: dict, output_path: str):
    """將查詢結果轉換為 InsightHub 格式的 Excel"""

    # 使用 pandas 處理資料
    df = pd.DataFrame(data['rows'], columns=data['columns'])

    # 創建工作簿
    wb = Workbook()
    ws = wb.active
    ws.title = "查詢結果"

    # 添加標題行
    for col_num, column in enumerate(df.columns, 1):
        cell = ws.cell(row=1, column=col_num)
        cell.value = column
        cell.fill = HEADER_FILL
        cell.font = HEADER_FONT
        cell.alignment = Alignment(horizontal='center')

    # 添加資料
    for row_num, row_data in enumerate(df.values, 2):
        for col_num, value in enumerate(row_data, 1):
            cell = ws.cell(row=row_num, column=col_num)
            cell.value = value if value is not None else NULL_VALUE

            # 數值格式化
            if isinstance(value, (int, float)):
                cell.number_format = NUMBER_FORMAT

    # 調整列寬
    for column in ws.columns:
        max_length = max(len(str(cell.value)) for cell in column)
        ws.column_dimensions[column[0].column_letter].width = min(max_length + 2, 50)

    # 儲存
    wb.save(output_path)

    # 重新計算公式（如果有）
    import subprocess
    subprocess.run(['python', '.claude/skills/xlsx/recalc.py', output_path])
```

### 報表模板

#### 1. 查詢結果報表

包含：
- 查詢資訊（連接、執行時間）
- 資料工作表
- 統計摘要工作表

#### 2. Dashboard 資料導出

包含：
- 多個工作表（按圖表分類）
- 圖表資料
- 計算欄位

#### 3. 審計日誌報表

包含：
- 時間戳記
- 用戶操作
- 變更記錄

### 最佳實踐

1. **使用公式**: 所有計算使用 Excel 公式
2. **資料驗證**: 使用 openpyxl 的資料驗證功能
3. **條件格式**: 高亮異常值
4. **凍結窗格**: 凍結標題行
5. **自動篩選**: 啟用篩選功能

### 錯誤處理

```python
def safe_export(data, output_path):
    try:
        export_query_result_to_excel(data, output_path)

        # 驗證檔案
        import openpyxl
        wb = openpyxl.load_workbook(output_path)

        # 檢查公式錯誤
        for sheet in wb.worksheets:
            for row in sheet.iter_rows():
                for cell in row:
                    if cell.value and isinstance(cell.value, str):
                        if any(err in cell.value for err in ['#REF!', '#DIV/0!', '#VALUE!', '#N/A', '#NAME?']):
                            raise ValueError(f"公式錯誤: {cell.coordinate} = {cell.value}")

        return True, output_path
    except Exception as e:
        return False, str(e)
```

## 相關檔案

- Python 重算腳本: `.claude/skills/xlsx/recalc.py`
- Command: `.claude/commands/export-excel.md` (待創建)

## 相關 Tickets

- TICKET-037: 查詢結果導出功能
- TICKET-035: Dashboard 報表生成

---

**Skill 來源**: Anthropic Skills - `xlsx`
**整合日期**: 2026-01-20
**維護者**: InsightHub Team

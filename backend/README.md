# VisionInsight Backend

开源经营与财务 BI 后端 API（FastAPI）。

## 快速开始

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate

pip install -r requirements.txt
copy .env.example .env

uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

启动后访问：

- 健康检查：http://127.0.0.1:8000/health
- Swagger 文档：http://127.0.0.1:8000/docs

## 导入模板 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/import/templates` | 列出模板，可按 `?domain=expense` 过滤 |
| GET | `/api/v1/import/templates/{code}` | 模板详情（含字段 schema） |
| GET | `/api/v1/import/templates/{code}/download` | 下载 CSV 空模板 |
| GET | `/api/v1/import/templates/{code}/download.xlsx` | 下载 Excel 空模板 |

可用模板 code：

- `tpl_expense_detail` — 费用明细
- `tpl_revenue_cost_detail` — 收入成本明细
- `tpl_fund_transaction` — 资金流水
- `tpl_budget` — 预算

CSV 格式：第 1 行英文 column key，第 2 行中文 label，第 3 行起为数据。

## 测试

```bash
cd backend
pytest tests/ -v
```

## 目录结构

```text
backend/
├── app/
│   ├── main.py
│   ├── config.py
│   ├── api/v1/
│   ├── services/
│   ├── schemas/
│   └── templates/definitions.py
├── tests/
└── requirements.txt
```

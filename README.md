# PG Dumper
![Status](https://img.shields.io/badge/status-active%20development-orange)

> **High-speed PostgreSQL Data Ingestion Desktop App**
> Paste → Preview → Validate → Dump into Postgres safely.

PG Dumper is a desktop application for importing raw data (CSV, JSON, Markdown tables, logs, etc.) into PostgreSQL **with live preview, schema validation, duplicate detection, and template-based workflows**.

Built for engineers who are tired of `psql \copy`, broken CSVs, and silent corruption.

---

# Why PG Dumper Exists

| Problem                  | PG Dumper Fix                |
| ------------------------ | ---------------------------- |
| Manual SQL imports       | Visual mapping + preview     |
| Silent schema mismatches | Live validation engine       |
| Broken CSV formats       | Auto-format detection        |
| Duplicate inserts        | Built-in duplicate detection |
| Repeated daily imports   | One-click templates          |
| CLI-only tooling         | Full desktop UI              |

---

# Core Workflow

```
Launch App
   ↓
Auto-Connect to Default DB
   ↓
Paste / Upload / Drag Data
   ↓
Auto-Detect Format
   ↓
Live Mapping & Validation
   ↓
Execute Dump → PostgreSQL
```

---

# UI Overview

```
Navigation Panel (Left)
├─ Connections
├─ Recent Dumps
├─ Templates
└─ Settings

Main Workspace (Right)
┌ Data Input Area
├ Table Selector
├ Mapping Preview
├ Live Row Preview
└ Execute Panel
```

---

# Data Input Methods

| Method      | Description                    |
| ----------- | ------------------------------ |
| Paste       | Ctrl+V directly into workspace |
| Drag & Drop | Drop files into window         |
| File Picker | Select CSV / JSON / TXT        |
| Templates   | Recall saved mappings          |

---

# Smart Validation Engine

PG Dumper validates **before inserting anything**:

| Validation          | Protects Against        |
| ------------------- | ----------------------- |
| Duplicate detection | Duplicate primary keys  |
| Type mismatch       | Wrong column types      |
| Schema mismatch     | Missing / extra columns |
| Format errors       | Broken CSV/JSON         |
| Row preview         | Human confirmation      |

---

# Template System

Save your import setup once:

• Column mappings
• Target table
• Validation rules
• Duplicate strategy
• File format

Then reuse it with **one click**.

Perfect for:

* Daily logs
* Batch user imports
* ETL pipelines
* Backfills

---

# Tech Stack

| Layer      | Tech                          |
| ---------- | ----------------------------- |
| Frontend   | React + TypeScript + Tailwind |
| Backend    | Rust (Tauri)                  |
| DB         | PostgreSQL                    |
| Packaging  | Tauri Desktop                 |
| Validation | Custom Type Inference Engine  |

---

# Installation (Dev)

```bash
git clone https://github.com/zakaria409/Postgres-dumper.git
cd Postgres-dumper

npm install
npm run tauri dev
```

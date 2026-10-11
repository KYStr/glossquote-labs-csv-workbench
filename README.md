# CSV 預覽與欄位匯出

## Current live release — 2026-10-11

[繁體中文](https://csv.glossquote.com/index.html) · [English](https://csv.glossquote.com/en/index.html)

Deployed source: [8bb5dae06600](https://github.com/KYStr/glossquote-labs-csv-workbench/commit/8bb5dae0660057f8b803d4e4410a8dbc8c9014f3); Cloudflare version `ebd109aa-323b-483e-acfc-9ee3e6468d2e`. This dated status supersedes older candidate-only or NOT_DEPLOYED notes below. Later documentation-only commits do not change the deployed assets.

Release verification passed: 18 public assets matched the reviewed build byte for byte across 40 HTTP response checks, including HTTPS, security headers, MIME, bilingual SEO, robots/sitemap, missing paths and configured redirects. Both language pages received scoped browser checks. Formula-risk blocking, protected-export confirmation and a real CSV download preserving 001 were checked.

The runtime retains its previously accepted offline test evidence; this release changes hosting configuration and documentation, not tool algorithms. Full Network/Storage inspection, physical devices, assistive technology and all remaining documented manual checks are still NOT_RUN. Live publication is not a claim of exhaustive certification or search-engine indexing.

已實作的本機工具：繁體中文與英文介面、嚴格 UTF-8 CSV 解析、按位置選欄、100 筆分頁及三種匯出。必要本機 gate 已通過；明確人工 NOT_RUN 見 [驗收紀錄](docs/VALIDATION.md)。來源公開與網站部署分開，這份工具尚待正式主機整合驗收。

給手上有小型CSV、只想查看內容並挑出幾個欄位的人：貼上文字或選擇一個UTF-8 CSV，確認表頭設定，勾選欄位，再預覽匯出副本。來源值永遠保留為字串，不猜日期、數字或公式。

- MVP：嚴格讀取逗號分隔UTF-8 CSV，分頁預覽、按原次序選欄、輸出CSV或有版本的原值JSON。
- 價值：001不變成1，大整數不失真，含逗號與換行的引號欄位可正確讀取；公式風險不會悄悄帶入CSV匯出。
- 難度：中高。狀態機、格式錯誤與匯出風險是主體。零runtime依賴，原生HTML/CSS/ESM，Node24+僅開發測試。
- 非目標：Excel/xlsx、Google Sheets、Big5/UTF16、編碼猜測、分隔符猜測、編輯儲存格、排序／篩列、公式運算、CSV合併、JSON匯入、雲端與巨型檔案。

資料留在本次頁面記憶體；下載是使用者明確操作。加前綴的保護CSV會改變部分值，不能宣稱對所有試算表都安全；原值JSON另保留完整字串供檢查。

使用 Node.js 24+，零 runtime／development 依賴，不需要 npm install。

```powershell
npm.cmd test
npm.cmd run check
npm.cmd run build
npm.cmd run dev
```

預覽綁定 `127.0.0.1:4184`，只提供 public。埠被占用時改用空閒 loopback 埠並印出網址，不終止其他程序。中文 `/index.html`、英文 `/en/index.html`。在 macOS／Linux 用 `npm` 代替 `npm.cmd`。請透過 HTTP 預覽，不直接開啟 file URL。

預設 build 是 noindex 預覽。正式網址候選的產物：

```powershell
npm.cmd run build -- --release
```

只產生 dist，不部署。Release 模式固定 `https://csv.glossquote.com`，包含兩語 canonical／hreflang／x-default、sitemap、robots、404、安全／MIME標頭。正式主機仍須驗證HTTPS、實際response headers、索引規則及首頁catalog。public來源保持noindex。

Worker 程式在初次頁面載入時以靜態 ESM 載入到記憶體；每份工作使用本機 Blob Worker，五秒逾時，完成／取消／清除時終止。改核心或Worker後，更新固定允許清單的生成程式並檢查：

```powershell
node scripts/worker-bundle.mjs
npm.cmd run check
```

check 會拒絕過期 Worker bundle、缺檔、危險 DOM／storage／運算網路 API、外部執行資源或雙語控制不一致。建置只複製審查過的靜態檔。

[產品](PRODUCT.md)、[技術](TECHNICAL.md)、[驗收案例](ACCEPTANCE.md)、[UX與SEO](UX-SEO.md)、[設計說明](docs/DESIGN-BRIEF.md)、[資料與安全](docs/PRIVACY-SECURITY.md)提供精確契約。部分原始藍圖仍記「尚未實作／未授權發布」；實際成果與來源授權以本README和VALIDATION為準，不能由舊文字推定沒有程式。

English: a local CSV viewer with strict parsing, column projection and protected CSV/original CSV/original JSON exports. Values remain strings. Original CSV is blocked when selected cells meet the conservative formula-risk predicate; JSON preserves original strings. The protected copy changes flagged strings and is not a universal spreadsheet-safety guarantee. See the validation report for actual browser coverage and manual items not run. No cloud processing, tracking, accounts or content persistence.

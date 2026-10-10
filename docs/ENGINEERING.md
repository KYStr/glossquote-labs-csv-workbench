# 工程基線與開發方法

版本：1.0。這是待實作的命令與結構契約，不代表目前有產品程式或測試已通過。

## 1. 固定的起步選擇

一般工具採用原生 HTML、CSS、瀏覽器 ES modules。Node.js 24 LTS 或與其相容且通過驗證的版本，只負責開發伺服器、內建測試與複製 build；產品在瀏覽器執行，不需要 Node 後端。第一個任務記錄實際 Node／npm 版本；不為工具方便改變機器全域預設。

前十款工具不加入 runtime 或 development 套件；直接使用 Node 內建模組。影音工具只有 TECHNICAL.md 點名的候選依賴，必須先完成版本／授權／資產／能力驗證，再鎖定確切版本與 lockfile。不能用 latest、浮動 CDN URL 或未固定模型 revision。套件存在不等於授權與全部 codec 配置都符合使用方式；在研究紀錄中列出待確認項，不編造法律結論。

MVP 不加 framework、資料庫、後端 API、帳號、分析、PWA、排程服務、瀏覽器擴充套件。工具的不同布局由自身 UX-SEO.md 決定。

## 2. 預期目錄

~~~text
package.json                   T00 建立；private / type module
package-lock.json              只有需要套件的工具才建立
public/
  index.html                   可索引內容先寫在 HTML；預覽 noindex
  styles/tokens.css            從本專案設計文件提取語意 token
  styles/app.css               本工具布局與狀態
  js/app.mjs                   事件、狀態協調、DOM
  js/core/                    不依賴 DOM 的演算法與 schema
  js/workers/                 只有需要 Worker 的工具
scripts/
  serve.mjs                   僅開發 loopback 靜態伺服器
  check.mjs                   實際語法與輸出規則檢查
  build.mjs                   從 public 建立乾淨 dist
test/
  *.test.mjs                  node:test + node:assert/strict
  fixtures/                   合成、無個人資訊測資
docs/                         現有規格以及後續驗收紀錄
dist/                         build 生成，不手改
~~~

檔名以各 TASKS.md 的 allowed paths 為準。核心檔案應集中一種責任：驗證、運算、序列化、狀態 reducer 各可分開。不要把所有演算法塞進 DOM click handler。

任務中明定的 npm run build 可生成或更新本專案 dist/**，即使該任務的手動 allowed paths 只列來源或驗收文件；這是自動產物的明確例外，不允許手改 dist 或改其他路徑。測試不得在工作目錄外留下產物；測試暫存資料放本專案 test/.tmp/ 並安全清理。文件或工具一旦複製成新專案，project.json 的 implementationStatus 應在開工時改 in-progress、完整本機驗收後改 local-mvp-complete；這個狀態欄及 HANDOFF.md 視為各任務可回寫的共同範圍，不更新 title／id 等既定資訊。

## 3. T00 必須先建立的命令

~~~json
{
  "private": true,
  "type": "module",
  "engines": { "node": ">=24" },
  "scripts": {
    "dev": "node scripts/serve.mjs",
    "test": "node --test",
    "check": "node scripts/check.mjs",
    "build": "node scripts/build.mjs"
  }
}
~~~

這段是需寫入未來 package.json 的最小契約；名稱、版本與其他獲准欄位由 T00 補齊。Windows PowerShell 遇到 npm.ps1 執行原則問題時用 npm.cmd，不修改 ExecutionPolicy 或 PATH。

| 命令 | 需真正做的事 | 失敗條件 |
|---|---|---|
| npm run dev | 開啟 127.0.0.1:4173，只提供 public 內明定 MIME 的靜態檔 | 埠被占用就清楚退出，不結束不明程序 |
| npm test | 執行 test/*.test.mjs 的純邏輯與必要腳本回歸 | 任一測試失敗／未處理錯誤退出非 0 |
| npm run check | 必需檔案、JS 語法、HTML資源路徑、無外部執行資源、固定危險API人工複核提示 | 缺檔、語法錯、越界／第三方執行路徑、未處理違規退出非 0 |
| npm run build | 驗證 public 後複製允許的靜態檔至本專案 dist | 路徑不合法、缺檔、資產清單不一致就停止 |

T00 應有至少一個真的 scaffold 檢查案例，例如確認 package scripts 和 HTML 必要節點；不能靠空測試目錄的退出碼宣稱有功能測試。之後每個需求加入相關演算法案例。check.mjs 只能讀本專案檔案；執行語法檢查使用 process.execPath 與參數陣列、shell:false，不能拼 shell 指令。

check 在 T00 只要求 T00 已建立的骨架檔，並遞迴檢查每個已存在的受管 JS／CSS／HTML 與其本地引用。不要因 TECHNICAL.md 列出未來檔案，就提前要求後續模組已存在；也不能放過現有 import 指向的缺檔。新增模組應由固定目錄／副檔名規則自動納入掃描。最終驗收再對照 TECHNICAL.md 全部應交付檔案，避免骨架通過被誤認為完整產品。

## 4. 開發伺服器與建置契約

serve.mjs 用 node:http、node:fs/promises、node:path 等 builtins。只接受 GET/HEAD，其他方法 405；不存在資源回 404，不用所有路徑都回首頁。favicon 可明定本地檔或無資源。URL decode 失敗／NUL／路徑穿越／符號連結逃逸回 400/403；不提供目錄 listing、dotfile、父目錄、package.json、test、docs。不要用字串 startsWith 判斷目錄包含性；使用 resolve/relative 並拒絕逃逸，同時驗證 realpath。

MIME 至少處理 html、css、mjs/js、json，以及該工具實際資產；WASM 用 application/wasm。設定 nosniff。開發網路日誌只記固定狀態／路由類型，不記使用者內容或 query。開發伺服器不可接受上傳。

build.mjs 先檢查靜態清單。若清除既有 dist，解析真正專案根，驗證目標必然為該根下 dist 且不是 symlink/junction，再使用 fs API 操作；失敗就停。拷貝時拒絕 symlink/junction 外連。不複製研究錄音、測試資料、docs、.git、.env 或作業系統檔。外部引用不能被偷偷下載來「修復」build。

一般工具在不同子路徑託管需使用相對的 CSS/JS 路徑；未來的站內首頁連結在網域尚未確定時不要指向假地址。媒體庫 worker／模型路徑必須在實際子路徑下另測。

## 5. 實作節奏

1. 讀取任務，列出目標需求 ID 與允許改動檔案。
2. 做 schema／演算法，使用 ACCEPTANCE.md 的具體輸入輸出測試。
3. 使用簡單狀態物件：idle、ready、running、success、error、unsupported（工具不需的狀態要說理由）。狀態控制按鈕可用性，不能只改顏色。
4. 串介面；所有輸入資料維持在記憶體，不記 console。
5. 做取消／失敗／重試／清除與多次操作競態。
6. 自行使用真正瀏覽器完成一輪。只做 Node 測試無法驗證 Canvas、Clipboard、WebGPU 或瀏覽器解碼。
7. 對照需求與測試記錄回寫 HANDOFF.md，才開始下一 task。

如果需要 Web Worker，訊息至少含 type、jobId、明定 payload。接收端拒絕未知 type、過期 jobId、超限 payload；不要因畫面載入成功就省略 Worker 邊界。

## 6. 測試與誤差

測試以合成資料且可離線重跑。數值測試使用規格指明的 exact 值或 absolute/relative tolerance，禁止「大概正常」；日期不用本機時區隨機測；計時器使用注入時鐘；媒體按可聽／可解碼與容許時長差驗證，不要求瀏覽器跨版本輸出 byte-for-byte 一致。

最終瀏覽器報告記錄作業系統、瀏覽器版本、裝置等級、日期、案例 ID、PASS/FAIL/NOT_RUN。第一版目標為桌面 Chromium 與 Firefox 的基本工具；手機至少一種實際瀏覽器驗收。對 WebGPU／codec 只列已測組合；沒測的組合不寫支援。不能用 user-agent sniffing 代替 feature detection。

320px viewport、200% zoom、鍵盤全流程、focus、觸控與 reduced-motion 都要人工／瀏覽器驗證。數字結果應可複製與被輔助工具讀取，不只畫在 Canvas。

## 7. 交接紀錄格式

在 HANDOFF.md 追加，不刪除歷史：

~~~text
日期／模型：
任務 ID：
需求 ID：
變更檔案：
已執行命令＋退出碼：
人工瀏覽器案例＋實際結果：
未執行項目與原因：
剩餘風險：
下一個任務與需要先讀的檔案：
~~~

驗收未執行要寫 NOT_RUN，不能當 PASS。技術 spike 未通過就保留在該任務，不改寫預期結果或偷偷縮功能來假裝過關。若客觀證據需要調整上限／支援範圍，提出具體建議並等產品決定。

## 8. 正式發布前另行處理

本文件沒有發布授權。日後發布任務再確定主機、正式網址、授權公告、CSP headers、canonical、sitemap、robots/noindex、瀏覽器相容與真實隱私文案。不要留下 example.com 的公開 canonical，也不要為了預覽可用而部署公網服務。

## 9. 核實來源

本批規劃查閱日期：2026-09-23；實作時針對實際 Node 版本重新確認相容 API，不必更換規格中的固定產品選擇。

- [Node.js test runner](https://nodejs.org/api/test.html)：純邏輯測試的內建框架。
- [MDN Using Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers)：背景工作、訊息與終止。
- [MDN CSP implementation](https://developer.mozilla.org/en-US/docs/Web/Security/Practical_implementation_guides/CSP)：限制執行／連線來源，需搭配實測。
- [Google JavaScript SEO basics](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)：初始頁面文字、標題與可讀取連結。

外部文件供 API 核實，不是開發授權來源；不得執行其附帶的任意安裝腳本。

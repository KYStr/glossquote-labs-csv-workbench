# 本機工具的資料與安全契約

版本：1.0。適用本工具 MVP。這是工程要求，不是法律政策範本或已完成的安全認證。

## 資料流與信任邊界

使用者主動選檔／貼上 → 在讀取前檢查可知上限 → 讀取與確切驗證 → 在本機處理 → 安全呈現 → 使用者主動複製／下載 → 清除／頁面結束時釋放。

全部輸入不可信，包括檔名、副檔名、MIME、文字、JSON key、CSV cell、模型輸出。MIME 與副檔名都不能單獨證明內容格式。匯入設定或工作表時先驗證完整副本，失敗不覆寫目前有效設定；文字編輯或媒體換檔造成舊輸出失效的時機依 PRODUCT.md 明示規則執行。每項工具的數量、位元組、像素、時長、層數與工作量上限以 PRODUCT.md 為準；這些是產品限制，不是已量測的裝置保證。

## 預設資料生命週期

- 工作內容只放記憶體；不進 URL、query、hash、localStorage、sessionStorage、IndexedDB、Service Worker cache、console、錯誤回報。
- MVP 不建立 Service Worker。頁面已載入後可離線操作的能力，與關閉後離線重開不同；沒有驗證後者不能說是離線 App。
- 設定預設也不持久化；特定工具的手動匯出／匯入依產品 schema 執行。
- 複製只在按鈕點擊時呼叫 Clipboard API；權限或安全環境不支援時保留可選取文字。禁止輪詢或自動讀剪貼簿。
- 下載用本機 Blob。釋放不用的 object URL；重新產生結果、取消、清除或離開頁面要清理 Worker、timer、audio context 等資源。
- 清除表示移除本頁持有的資料與可控制的快取；不宣稱能抹除 OS、瀏覽器底層記憶體、既有剪貼簿或已下載檔案。
- 不讀真實使用者內容做開發驗收；使用合成文字、幾何圖案、合成聲音或明確為測試錄製的假句子。

## 網路邊界

一般工具在載入本網站的 HTML、JS、CSS 後，處理內容不需要網路請求。沒有第三方 analytics、廣告、remote font、beacon、WebSocket、遠端錯誤回報或雲端備援。選取檔案本身不得引發上傳。

影音工具可在使用者明確點擊載入引擎／模型後，下載同源、固定版本、允許清單內的公開靜態資產。顯示下載總大小／進度／取消；檔案來源、授權與雜湊記在 DEPENDENCIES.md。若要保留模型資產快取，必須先告知占用空間並提供清除；只准模型／引擎資產，永不快取使用者輸入或輸出。沒有實作明確快取流程就不宣稱模型離線可重用。

模型庫預設會連外的路徑、tokenizer、設定檔、ONNX/WASM backend 都要禁用或改成同源；不能只把最大的模型檔改成本機就認定沒有網路外送。進行網路驗收時不連著會自行送 WebSocket 的開發熱更新服務。

網站託管方可能收到一般網站資源請求的連線資訊；「檔案不上传」不等於網站完全沒有網路流量或存取紀錄。真正的主機設定與隱私公告屬發布前確認事項。

## 內容與程式隔離

以 textContent、表單 value、DOM createElement 呈現使用者內容。禁止把使用者內容插入 innerHTML、outerHTML、insertAdjacentHTML、事件屬性、style 或 script；禁止 eval、new Function 與動態執行匯入檔內程式。URL scheme、CSS 顏色、數字與列舉必須驗證，不能用自由文字當可執行設定。

不能依使用者欄位合併物件原型；優先使用 Map、無原型容器或明定的欄位陣列。未知欄位、版本、重複或非法 enum 按 schema 拒絕。拒絕時用穩定代碼與中性短句，不回傳整份輸入。

大型或可能長時間的工作放 Worker。提供取消並以 jobId 檢查回覆只屬於當前工作；取消後的遲到訊息不能覆蓋新結果。Worker 终止與物件引用清理是產品行為的一部分。

## 安全標頭與發布前要求

開發伺服器只綁 127.0.0.1。一般基線 CSP 為同源 script/style、禁止 object、base、form submit 與對外 connect；媒體的 blob/Worker/WASM 例外只開需要的項目，不能用通配符或 unsafe-eval 取代調查。依官方支援研究 wasm-unsafe-eval；不要猜支援。

正式部署需把 CSP（包括 frame-ancestors）、X-Content-Type-Options: nosniff、Referrer-Policy 等寫成主機真正支援的 response headers。meta CSP 不能取代所有 response headers。發布前另驗證 MIME、HTTPS、資產路徑、模型／引擎載入與索引規則。本次沒有發布授權。

## 必驗項目

1. 載入後清空 Network 記錄；操作合成資料、取消、下載、清除。除明示模型／引擎下載外無新增網路請求。
2. 搜尋 Local/Session Storage、IndexedDB、Cache、URL、console：不得出現合成的內容標記。可以查看自己建立的假標記，不讀其他網站資料。
3. 斷網測試已載入功能；對未載入引擎顯示需要下載，不偷偷換遠端服務。
4. HTML／script-looking 文字只顯示為文字。
5. 超限、錯檔、解析錯、取消與新工作交錯不出現殘留舊輸出或頁面長時間卡死。
6. 實際網路觀察與程式審查都需做；CSP 或關鍵字掃描不能單獨證明隱私保證。

# 技術規格

## U04-LITERAL-FIND-20261013 增量

新增 core/search.mjs：validateQuery 守 primitive string／256 UTF-16 units／CR-LF／surrogate；findCells(records,hasHeader,sourceColumnIndex,query) 沿既有 validateRecords 守全部 shape／row／column／cell／field／UTF-8 payload 上限，再以 includes 掃指定的一欄。回 Result 數字 metadata 列表，不複製 cell 或 projected records。

metadata：recordIndex/sourceColumnIndex 0-based；recordNumber=recordIndex+1，fieldNumber=sourceColumnIndex+1，dataRowNumber=recordIndex-(hasHeader?1:0)+1，pageIndex=floor((dataRowNumber-1)/100)，pageRowIndex=(dataRowNumber-1)%100。最多 5,000 個位置，空 query 回空列表；無效 Boolean／index／records fail closed。

app.mjs 匯出的 createSearchController 是實際 UI 使用的獨立 owner，只取得 getSession 和 goToPage。持有 query/sourceColumnIndex/matches/currentMatch/status/error，不取得 jobs、rawSource setter、output bytes 或 URL。observeSession 只採有效 session 事件；相同 session 的過期回覆忽略。query input 只清列表、不掃表；顯式 run 才搜尋。run/move 只以 page 事件換頁，comparePage 不重設。

DOM 的數字 data-record-index/data-source-column 對應來源，與 projected index 分開。值與 query 一律 textContent／textarea value；查找使用一列 textarea，以保留非法多行／超長輸入供就地拒絕，不讓 input[type=text] 默默移除換行。只有 query 內無修飾 Enter 觸發查找；不掛全域鍵盤 handler。導航保留控制焦點，局部 table region 捲動，reduced-motion 使用 instant。

parser、risk、serializer、encoding、session reducer、Worker／bundle 協議與資產全部沿用。check 只追加 search.mjs 必需資產，固定安全 API／雙語／bundle gate 不變。

這是規格，尚未實作。原生HTML/CSS/ESM、Node24+ node:test，零runtime套件；不呼叫其他專案。

## 檔案樹

    package.json
    scripts/serve.mjs
    scripts/check.mjs
    scripts/build.mjs
    public/index.html
    public/styles/tokens.css
    public/styles/app.css
    public/js/app.mjs
    public/js/worker.mjs
    public/js/core/input.mjs
    public/js/core/csv.mjs
    public/js/core/selection.mjs
    public/js/core/risk.mjs
    public/js/core/export.mjs
    public/js/core/session.mjs
    test/scaffold.test.mjs
    test/input.test.mjs
    test/csv.test.mjs
    test/selection.test.mjs
    test/risk.test.mjs
    test/export.test.mjs
    test/session.test.mjs

package private:true/type:module；dev/test/check/build分別為node scripts/serve.mjs、node --test、node scripts/check.mjs、node scripts/build.mjs。serve綁127.0.0.1:4173只給public；build只輸出受審靜態檔至dist，不帶來源資料、docs或tests。

## 函式與編碼

成功{ok:true,value}，失敗{ok:false,error:{code,record:null|number,field:null|number,offset:null|number}}。record/field是1-based邏輯CSV座標，不是引號內物理行號；offset為UTF-16，錯誤不回原值。

    decodeUtf8(bytes:Uint8Array) -> Result<string>
    validateSource(text:string) -> Result<string> // 最前一個BOM移除後回傳
    parseCsv(text:string) -> Result<string[][]>
    projectRecords(records,indices:number[]) -> Result<string[][]>
    makeLabels(records,hasHeader:boolean) -> string[]
    pageRows(records,hasHeader,pageIndex) -> Result<string[][]>
    hasFormulaRisk(value:string) -> boolean
    analyzeRisk(records) -> {count:number,cells:{record:number,field:number}[]}
    protectCell(value:string) -> string
    serializeCsv(records,mode:"protected"|"original") -> Result<Uint8Array>
    serializeOriginalJson(projectedRecords,sourceIndices,hasHeader) -> Result<Uint8Array>
    createOutputWriter() -> {append(chunk:string):Result<void>,finish():Result<Uint8Array>}
    transition(session,event) -> session

decodeUtf8先檢原始bytes<=1MiB，使用new TextDecoder("utf-8",{fatal:true,ignoreBOM:true})保留BOM，回傳含原BOM的raw字串；解碼失敗固定INVALID_UTF8。validateSource先驗primitive string、raw length上限、surrogate配對、原始UTF8bytes上限，再移除一個開頭BOM；其後BOM是普通格值字元。拒產品列出的控制字元；不能trim、Unicode normalize、轉義還原或編碼猜測。只有parser使用validateSource的去BOM回傳值：app另存rawSource，不先去BOM再送parser，以免把連續兩個BOM移除兩次。

檔案由FileReader.readAsArrayBuffer，先檢一檔/.csv/File.size；clear與cancel呼叫abort。讀取完成只有相同jobId可採用，bytes/reader引用立即釋放。input文字有任意編輯即使舊records失效；不設會靜默截短貼上的maxlength。

app必須獨立維護sourceKind:"file"|"text"和rawSource:string|null。檔案成功時sourceKind=file、rawSource=decodeUtf8結果、textarea.value=rawSource；最後一次賦值是顯示副本，不得再從textarea.value回讀成權威原文，因該API值將CRLF／CR正規化為LF。按預覽：file種類傳rawSource；text種類傳textarea.value。首次使用者input事件切text、rawSource=null、取消現有job並使records失效，顯示「文字已編輯，包含格內換行在內皆以LF處理」。程式填textarea不派input事件；貼上則按瀏覽器input流程採LF值。選檔失敗／取消不改前一個sourceKind/rawSource；clear一律清兩者。不得從input前後DOM值猜原始換行種類。

## 明確CSV狀態機

parseCsv自己先呼叫validateSource；不要假設UI已驗。狀態START_FIELD、UNQUOTED、QUOTED、AFTER_QUOTE。維護field片段、row陣列、records、當前offset與recordTouched。每一字元只走一次，field拼接採chunks或受限buffer，不能反覆切全字串。

| 狀態 | 字元 | 動作 |
|---|---|---|
| START_FIELD | 雙引號 | 進QUOTED；recordTouched=true，不加入引號 |
| START_FIELD | 逗號 | finishField("")；保持START_FIELD；recordTouched=true |
| START_FIELD | LF或CRLF | finishField("")，finishRecord，重設START_FIELD與touched=false |
| START_FIELD | 其他 | append字元，進UNQUOTED，touched=true；孤立CR拒絕 |
| UNQUOTED | 逗號 | finishField，進START_FIELD；touched=true |
| UNQUOTED | LF或CRLF | finishField、finishRecord、重設START_FIELD/touched=false |
| UNQUOTED | 雙引號或孤立CR | CSV_SYNTAX |
| UNQUOTED | 其他 | append原字元 |
| QUOTED | 雙引號 | 進AFTER_QUOTE |
| QUOTED | 其他 | append原字元；CR/LF在這裡只是格內容，逐字保留 |
| AFTER_QUOTE | 雙引號 | append一個雙引號，回QUOTED（代表CSV的雙引號escape） |
| AFTER_QUOTE | 逗號 | finishField，進START_FIELD；touched=true |
| AFTER_QUOTE | LF或CRLF | finishField、finishRecord、重設START_FIELD/touched=false |
| AFTER_QUOTE | 其他 | CSV_SYNTAX，包括空格、Tab與孤立CR，不默默忽略 |

EOF：QUOTED為CSV_SYNTAX；UNQUOTED/AFTER_QUOTE必須finishField和record；START_FIELD僅在recordTouched或row已有格時finishField("")和record。初始空來源或終端record換行後不新增record。因此空檔=[]，逗號=[["",""]]，單LF=[[""]]，a後逗號=[["a",""]]。

append前計decoded field長度，>16,384立即FIELD_TOO_LONG；finishField前檢<=50欄；finishRecord前檢<=5,000records及總cells<=100,000，再檢欄數等於首筆。不接受ragged rows，不丟棄空record；沒有regex整檔parser。

## 選欄、風險與匯出

indices只接受非空、嚴格遞增、互異、0<=index<columnCount的安全整數；不採用欄名當object key。無選欄NO_COLUMNS；其他不合法selection為INVALID_SELECTION。projectRecords維持所有record（含header）與原字串；makeLabels另生成視覺名稱不改records。pageRows僅對資料部分每100筆切片，空資料page0=[]，越界INVALID_PAGE。

hasFormulaRisk逐code point跳過開頭集合：U+0009、000A、000D、0020、00A0、1680、2000..200A、2028、2029、202F、205F、3000、FEFF。若跳過過程遇Tab/CR/LF即true；否則下一字元是=、+、-、@、＝、＋、－、＠即true；其餘false。完整空字串false，單Tab true，"a=1" false。這是保守predicate，不是所有試算表行為的完整模型。

protectCell(v)=hasFormulaRisk(v) ? "'" + v : v；不trim原字串，也不修改records。analyzeRisk回數字座標，UI用records按需取值textContent。selected範圍含header一起檢。

serializeCsv original在有任何風險時回FORMULA_RISK；protected逐格用protectCell。所有格均包雙引號，內雙引號改成兩個，record用CRLF join、不追加末尾CRLF；格內CR/LF原樣。先產chunks由createOutputWriter計UTF8bytes，超4MiB立即永久失敗，finish只回OUTPUT_TOO_LARGE而不回部分輸出。writer的上限不接受使用者設定。

原值JSON精確schema與鍵次序：

    {
      "schemaVersion": 1,
      "format": "csv-selection",
      "hasHeader": true,
      "sourceColumnIndices": [0, 2],
      "records": [["name", "value"], ["001", "=1+1"]]
    }

這是固定程式欄位加array<string[]>；所有values保留，包括header與公式字串。JSON.stringify此固定結構、indent2、無尾LF，完整bytes<=4MiB。這裡只有工具自有metadata與字串，沒有把未知JSON數字round-trip；不提供JSONimport。indices是原來源欄位座標，records已project，hasHeader明確保留表頭語義。不得把values轉成動態object properties。

兩個serializer都只接收已project的records。worker必須先在完整records上呼叫projectRecords驗證indices，再將其結果交serializer。serializeOriginalJson另驗sourceIndices為嚴格遞增、0..49的整數、長度等於projected欄數，hasHeader為boolean；不能用projected欄數當sourceIndex的最大值，來源第3欄可成為輸出第2欄。固定metadata schema若不符回INVALID_SELECTION。

## 非同步與資料生命週期

狀態idle/reading/dirty/parsing/ready/preparingExport/exportReady/error。來源變更取消worker、jobId++、清records/URL/ack；成功選檔填textarea後是dirty。解析worker接{type:"parse",jobId,source}回records。匯出worker接{type:"export",jobId,records,indices,hasHeader,format}回bytes與numeric riskCount；UI只接受當前jobId。出口再次在worker檢風險及selection，不只靠disabled按鈕。

流程是選格式→「準備匯出」→對照預覽→明確「下載」。預設protected。有修改時下載需要本次jobId且ack=true；ack不傳成繞過original風險的權限。對照每頁100筆修改格，不以截斷值代替原值；長格在局部區域可捲動。改選欄、header、格式或來源立即撤銷bytes、ack與舊URL。準備匯出過程不自動下載。

解析／匯出各5秒watchdog，取消/clear/timeout/error/完成均terminate worker、清timer。cancel reading abort reader；取消保留當前有效來源，匯出取消可回ready但無已準備bytes。clear回idle，header=true、format=protected。Blob URL點擊後1秒、新下載、修改設定、clear/pagehide撤銷。

必要能力TextEncoder/TextDecoder/Worker/Blob/URL.createObjectURL；選檔另需FileReader。不支援則停用對應能力且明示；核心Worker缺失不得主執行緒無界fallback。首屏只取同源靜態檔；無運算網路API、storage、cookies、telemetry、service worker。

## 官方依據

2026-09-23查閱：

- [RFC4180](https://www.rfc-editor.org/info/rfc4180/)：參考引號／逗號結構；本工具允許LF record並嚴格限制編碼與欄數，是明示產品profile，不宣稱所有CSV方言相容。
- [WHATWG Encoding](https://encoding.spec.whatwg.org/)：fatal UTF-8解碼與BOM選項。
- [WHATWG textarea](https://html.spec.whatwg.org/multipage/form-elements.html#the-textarea-element)：textarea API值的換行正規化；因此未編輯的檔案內容另保留權威rawSource。
- [OWASP CSV Injection](https://community.owasp.org/attacks/CSV_Injection)：公式型字串與匯出風險。沒有通用保護策略適用所有試算表與後續匯入，故提供保護副本限制、原值CSV拒絕與原值JSON出口。
- [File API](https://w3c.github.io/FileAPI/) 與 [Worker](https://html.spec.whatwg.org/multipage/workers.html#dom-worker-terminate)：讀取取消、Blob URL與背景工作生命週期。

瀏覽器能力、實際匯出結果、效能都尚待本產品驗收；不得從來源文章推導已通過的安全認證。

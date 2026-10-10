# 驗收案例

這是規格，尚未實作。全部案例仍待執行；只用以下可本機生成的假字串／bytes。表內輸入字串採JS escape表示CR/LF；格值以array精確驗證。

| ID／類型 | 需求 | 輸入或步驟 | 精確預期 |
|---|---|---|---|
| CV-01 自動 | FR-05 | ""；"\n"；"\n\n" | 分別[]、[[""]]、[[""],[""]] |
| CV-02 自動 | FR-03,05 | "a,b\r\n1,2\r\n" | [["a","b"],["1","2"]]，無額外末列 |
| CV-03 自動 | FR-03 | '"a,b","c""d"' | [["a,b",'c"d']] |
| CV-04 自動 | FR-03 | '"a\r\nb",c\n"d\ne",f' | [["a\r\nb","c"],["d\ne","f"]]，格內換行原樣 |
| CV-05 自動 | FR-03,05 | "a,"；","；'""' | [["a",""]]；[["",""]]；[[""]] |
| CV-06 自動 | FR-03 | '"a" ,b'、'a"b,c'、'"a'、"a\rb"各別測 | 各CSV_SYNTAX，不trim／修復／部分輸出 |
| CV-07 自動 | FR-04 | "a,b\nc" | COLUMN_MISMATCH、record:2 |
| CV-08 自動 | FR-02 | bytes [0xC3,0x28] | INVALID_UTF8，不變成replacement字元 |
| CV-09 自動 | FR-02 | bytes [EF,BB,BF,61,2C,62]（hex）；另測兩組BOM接相同內容 | decodeUtf8後"\uFEFFa,b"；parse為[["a","b"]]。雙BOM解碼仍有兩個，parse只移除一個，首格為"\uFEFFa" |
| CV-10 自動 | FR-02 | "\uD800"；"a\u0000b" | 分別INVALID_UNICODE、UNSUPPORTED_CONTROL |
| CV-11 自動 | FR-04 | 一格"a".repeat(16384)，再以16385 | 前者成功，後者FIELD_TOO_LONG |
| CV-12 自動 | FR-04 | 50格"a"逗號join，再51格 | 前者成功，後者COLUMN_LIMIT |
| CV-13 自動 | FR-04 | 5000筆"a"用LFjoin，再5001筆 | 前者成功，後者ROW_LIMIT |
| CV-14 自動 | FR-04 | 每筆50格"a"，共2000筆；再加一筆 | 100000格成功；100050格CELL_LIMIT |
| CV-15 自動 | FR-02 | 用64筆各16383個"a"以LF連接，再第一格加1個a，再第二格加1個a | bytes依序1048575、1048576成功；1048577為INPUT_TOO_LARGE |
| CV-16 自動 | FR-06,07 | records=[["","x","x"],["001","02","03"]]；indices=[0,2] | project=[["","x"],["001","03"]]；labels能分辨第1/2/3欄，不改records |
| CV-17 自動 | FR-07 | indices=[]、[1,0]、[0,0]、[-1] | 依序NO_COLUMNS、INVALID_SELECTION、INVALID_SELECTION、INVALID_SELECTION |
| CV-18 自動 | FR-08 | "001,9007199254740993,false,2026-01-02" | 四格皆精確字串，不轉型 |
| CV-19 自動 | FR-09 | hasFormulaRisk各測"=1+1","+2","-12","@x","  =x","＝1","\ttext","\ntext" | 全true，包括保守負數與前導Tab/LF |
| CV-20 自動 | FR-09 | hasFormulaRisk各測"","001","a=1","'=-x","text\t" | 全false；非前導Tab不觸發本predicate |
| CV-21 自動 | FR-09,11 | records=[["=1+1","001"],["plain",'a"b']]；protected | UTF8解碼為 "\"'=1+1\",\"001\"\r\n\"plain\",\"a\"\"b\""，不加BOM/末CRLF；原records不變 |
| CV-22 自動 | FR-10 | 同CV-21；original | FORMULA_RISK，無bytes |
| CV-23 自動 | FR-10,11 | serializeOriginalJson([["001","=1+1"]],[0,2],false) | JSON.parse結果精確{schemaVersion:1,format:"csv-selection",hasHeader:false,sourceColumnIndices:[0,2],records:[["001","=1+1"]]}；字串未加前綴 |
| CV-24 自動 | FR-09 | records=[["=header","safe"],["value","text"]]；選[1]再選[0] | 前者風險0、原值CSV允許；後者風險1、原值CSV拒絕，表頭也檢查 |
| CV-25 自動 | FR-11 | createOutputWriter追加總4194304 ASCII bytes；再追加1 byte再finish | 邊界成功；超限append及finish皆OUTPUT_TOO_LARGE，無部分輸出 |
| CV-26 自動 | FR-07 | header+201筆data，page0/1/2；headerOnly | pages長100/100/1；headerOnly page0=[]但可匯出header |
| CV-27 瀏覽器 | FR-08 | 單格"<img src=x onerror=alert(1)>"；另一格"=1+1" | 都只顯示文字；無HTML執行、公式計算、image request |
| CV-28 瀏覽器 | FR-09,10 | 預覽CV-21、準備protected、未勾確認→勾確認→改選欄 | 起初下載停用，確認後可下載；改選欄立即使bytes/ack失效；original有風險始終不可用 |
| CV-29 瀏覽器 | FR-12 | 延遲FileReader/worker harness：讀取中取消、解析中clear、匯出中改來源 | reader abort或worker terminate；無遲到結果；clear全部空、header=true、format=protected |
| CV-30 瀏覽器 | FR-01,02 | 本機合成test.csv為TextEncoder("a,b\n001,02")；再選test.xlsx與1MiB+1的.csv | 首者可填來源再預覽；後兩者FILE_TYPE／INPUT_TOO_LARGE，在讀檔前拒絕 |
| CV-31 瀏覽器 | FR-11, FR-13 | 完成載入後離線，parse/export；檢Network/Storage；下載後clear | 無處理請求與storage/cookie/IDB；檔名符合格式。clear前來源只在頁面記憶體；clear後textarea/rawSource/records/輸出全部空且Blob URL撤銷 |
| CV-32 瀏覽器 | FR-12, FR-13 | 禁Worker；另使worker不回覆 | UNSUPPORTED／5秒後TIMEOUT；不走雲端 |
| CV-33 瀏覽器 | FR-06,07,09 | 僅鍵盤選檔、預覽、選欄、換頁、準備、確認、下載 | label/焦點完整、無陷阱；風險與狀態不只顏色 |
| CV-34 瀏覽器 | FR-07 | 320px及200%頁面縮放、50欄長值 | 所有控制可達；表格／值只局部捲動，頁面不雙向捲動；每頁<=100筆data DOM |
| CV-35 瀏覽器 | FR-01,03 | 用TextEncoder合成檔案source='"a\r\nb",c'，選檔後不編輯，預覽並匯出original；再在文字最後追加d並重新預覽 | 未編輯時rawSource仍含CRLF，首格值"a\r\nb"，匯出bytes含格內CRLF。首次input後sourceKind=text、rawSource=null，首格變"a\nb"、第二格"cd"，有LF提示；舊prepared bytes已失效 |
| CV-36 瀏覽器 | FR-03 | 貼上含quoted CRLF的文字'"a\r\nb",c' | textarea.value與解析首格採"a\nb"，以LF限制文案說明，不能宣稱保留剪貼簿原始CRLF |

T00建立後才執行npm test、npm run check、npm run build；Git環境另git diff --check。瀏覽器流程用npm run dev，驗完停止服務。記錄版本與逐案結果；可用TextEncoder在測試程式建立bytes，不讀私人檔案、不下載資料集。不要把CSV用Office打開的結果當作本工具內原值已變；試算表下游行為是已揭露限制。

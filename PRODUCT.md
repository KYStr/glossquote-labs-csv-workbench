# 產品規格

原始 MVP 契約與本輪增量規格；實際版本狀態與驗收見 HANDOFF。

## 需求

| ID | 固定行為與預設 |
|---|---|
| FR-01 | 一個CSV文字textarea，可手動貼上；另可明確選取一個副檔名.csv（大小寫不拘）的檔案。檔案解碼的rawSource獨立保存在記憶體作權威來源，textarea只是可編輯的顯示副本；未編輯前解析一律讀rawSource。MIME不當真實格式證據，不接受URL、拖入資料夾或多檔。選檔成功取代來源，失敗／取消保留原文字及來源種類但使舊預覽失效。按「預覽CSV」才解析。 |
| FR-02 | 檔案先以File.size限制1,048,576 bytes；貼上與解碼結果也以UTF-8 bytes限制1MiB，先拒絕UTF-16 length>1,048,576。UTF-8 fatal decoding，接受且移除開頭一個BOM；不猜Big5／UTF16、不替換壞bytes。拒未配對surrogate、U+0000..0008、000B、000C、000E..001F；允許Tab/CR/LF。 |
| FR-03 | 分隔固定逗號、引號固定雙引號；record換行接受CRLF或LF，quoted field內CR/LF按實際解析來源保留；quote外孤立CR拒絕。未編輯的檔案rawSource完整保留換行。textarea的API值會統一換行為LF，因此貼上路徑與檔案讀入後首次文字編輯都以LF正規化的textarea.value成為新來源，格內換行也成LF；介面明示此限制。不用split(",")／split("\n")代替parser，不trim、不轉數字／布林／日期。 |
| FR-04 | 最大5,000筆records（含可能表頭）、50欄、100,000 cells（含表頭）、每格解碼值16,384個UTF-16單位。所有records欄數必須等於第一筆；不補空、不截斷、不略過壞列。超限或語法錯就拒整份結果。 |
| FR-05 | 空來源為0筆、空狀態；終端一個record換行不額外產生空列；顯式空record仍是一格空字串。例"a,b\n"只有一筆，"\n"有一筆[""]，", "有兩欄""與" "。 |
| FR-06 | 「第一列是欄位名稱」預設true；表頭值本身仍保留。沒有表頭時label顯示第1欄等；空表頭顯示「未命名（第n欄）」；同名表頭顯示原文加欄位置，不改原值。切換表頭設定重設全選、頁碼與匯出確認。 |
| FR-07 | 欄位依來源index識別，預設全選，勾選只決定保留與否，不改順序、不排序。至少選1欄才可匯出。表格每頁100筆資料列，表頭不計資料列；總頁數與上一頁／下一頁可見；沒有資料列但有表頭時顯示「只有欄位名稱」。 |
| FR-08 | 每次選欄／表頭／來源變更都重算選取範圍風險並使已準備匯出失效。所有值仍是字串，包含"001"、長整數、"false"。HTML、公式、URL都只作文字顯示，不建立可點連結或運算。 |
| FR-09 | 預設匯出類型為「CSV保護副本」。有公式風險的格（含表頭）會加一個ASCII單引號U+0027，其他格不變；匯出前顯示確切修改格數與分頁原值／匯出值對照，使用者須勾選「我了解保護副本會改變這些值」才下載。無風險時不需要此核取。此措施不是跨所有試算表的安全保證。 |
| FR-10 | 「CSV原值」只在所選格全部無本規格風險時可用；有風險即停用且無繞過按鈕。「JSON原值」永遠保留所選原始字串，使用固定schemaVersion:1 schema，提供原值出口；不支援重新匯入。 |
| FR-11 | CSV全欄雙引號、內引號加倍，record分隔CRLF、無最後CRLF、UTF-8無BOM；格內原本CR/LF不改。固定名selected-protected.csv或selected-original.csv。JSON以兩空格、LF、無尾LF、UTF-8無BOM，固定selected-original.json。任何輸出最多4,194,304 bytes，超限全拒。 |
| FR-12 | 解析和匯出序列化使用worker，單工作、5秒watchdog。可取消；jobId防過期。選檔讀取用可abort的FileReader。clear終止worker、abort reader、撤銷Blob URL、清所有資料與勾選、回預設表頭true與CSV保護副本。 |
| FR-13 | 工作資料只在記憶體；不傳外部、無storage/URL/log、無telemetry/service worker。離頁不主動保存。缺必要API則明確不支援，無雲端fallback。 |

## 公式風險的產品定義

用TECHNICAL的明確predicate保守標示：跳過指定前導空白後以=、+、-、@或相應全形符號開始，或前導空白中含Tab/CR/LF。負數如"-12"也算風險；這是明示的保守限制，不猜是否真正公式。檢查選取的表頭和資料格，未選欄不影響該次匯出。

CSV匯出中的欄位引號僅為CSV結構escaping，不能當作公式防護。保護副本會在原字串最前面加單引號，不移除前導空白；原值JSON不加此字元。使用者另開／另存CSV的應用可能有不同處理，頁面應提示檢查結果。

錯誤碼固定：FILE_TYPE、INPUT_TOO_LARGE、INVALID_UTF8、INVALID_UNICODE、UNSUPPORTED_CONTROL、CSV_SYNTAX、COLUMN_MISMATCH、ROW_LIMIT、COLUMN_LIMIT、CELL_LIMIT、FIELD_TOO_LONG、NO_COLUMNS、FORMULA_RISK、OUTPUT_TOO_LARGE、UNSUPPORTED、TIMEOUT、READ_FAILED、WORKER_FAILED。錯誤可帶數字record/field/offset，不含來源值、檔名或raw exception。

CSV原始bytes的引號風格與record換行可能改變；「原值」只承諾格值字串與所選欄／record次序，不是byte-for-byte原檔複製。clear不刪除已下載檔案，也不承諾記憶體物理抹除。

若必須保留檔案內quoted CRLF或孤立CR，請選檔後直接預覽並匯出，不編輯文字副本。首次input事件清除file rawSource引用，改用textarea.value；所有後續操作都以新文字來源為準，不把舊file rawSource混回結果。

## U04-LITERAL-FIND-20261013：跨頁字面定位

FR-14：預覽後選擇一個目前保留的來源欄，顯式查找全部資料頁。以原字串 case-sensitive String.includes 比對，不 trim、normalize、轉型或使用 regex；每格最多計一次。空 query 為 idle，空格有效。最多 256 UTF-16 units，拒絕 CR/LF 或未配對 surrogate；就地錯誤不截短輸入，不使 CSV／匯出失效。

FR-15：符合格依原 record 次序，以來源欄 index 識別。排除啟用中的表頭；顯示資料第 n 筆、來源第 m 欄、邏輯 CSV 第 r 筆。首次查找跳首格，上／下一個不循環，DOM 仍為每頁最多 100 筆。文字標記和輪廓識別目前格；UI 位置欄不加入資料或匯出。

FR-16：查找只定位，不篩選。query／查找欄／清除只清匹配，保留 CSV 頁碼和全部原匯出狀態；match 導航只用既有 page 事件。來源／讀取／解析／clear 清全部查找；選欄／表頭按原失效契約，再清 match、將查找欄設為剩餘首欄，query 可保留並要求重新查找。格式變更和準備匯出保留查找；busy 禁用查找／導航，不取消 Worker。手動換頁保留 cursor，非所在頁不高亮其他格。

新增固定就地錯誤碼 SEARCH_TOO_LONG、INVALID_SEARCH_QUERY；只回限制，不回顯輸入。原 FR-01..13、風險／bytes／rawSource 契約仍全部有效。本輪不加入排序、編輯、資料篩選、匹配列匯出、多欄查找或新 CSV 方言。

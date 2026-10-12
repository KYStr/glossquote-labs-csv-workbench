# CSV Workbench — 2026-10-10 驗收

必要本機 gate：PASS。人工未驗依本次使用者允許保留明確 NOT_RUN。這不是所有平台或独立安全認證。源碼發布、候選產物與網站上線是三種不同狀態；此任務未部署網站。

環境：Node v24.14.0、npm 11.9.0、Chromium Chrome/154.0.0.0、Windows NT 10.0.26200.0。零依賴、沒有安裝套件、沒有讀取部署憑證。

## 命令

| 命令 | exit | 結果 |
| --- | --- | --- |
| npm.cmd test | 0 | 42 tests／42 PASS，0 skipped |
| npm.cmd run check | 0 | ESM、static references、runtime API／外部資源、bundle一致性、兩語控制及內容 |
| npm.cmd run build | 0 | 18個允許靜態檔，noindex預覽 |
| npm.cmd run build -- --release | 0 | 19個候選靜態檔；雙語SEO、安全標頭及MIME設定 |
| git diff --check -- tool-projects/04-csv-workbench | 0 | 主repo工具範圍；untracked新檔另於發布副本staged diff檢查 |
| 專用 verify-artifacts.mjs | 0 | 真dist／SEO／allowlist、loopback53757的MIME、nosniff、CSP及實際404 |

測試預覽4184，fixture5184，完成階段後均停止；沒有終止他人程序。原始日誌、合成fixture、瀏覽器harness及截图保留在內部專用證據目錄，不列入網站或公開來源的工作資料。

## 個案

| 案例 | 結果 | 證據與範圍 |
| --- | --- | --- |
| CV-01..07 | PASS | 狀態機、EOF、quoted CRLF、double quote、孤立CR拒絕、ragged列 |
| CV-08..10 | PASS | fatal UTF-8、單BOM移除、surrogate、控制字元 |
| CV-11..15 | PASS | field／column／record／cell／1MiB精確邊界，含multibyte |
| CV-16..18 | PASS | index投影、重複空label、selection拒絕、字串不轉型 |
| CV-19..24 | PASS | 公式predicate、全形／前導空白／負數、selected header、原值阻擋、保護／JSON精確輸出 |
| CV-25..26 | PASS | 4MiB writer邊界／永久拒絕；100/100/1與header-only |
| CV-27 | PASS | 真DOM只顯示HTML與公式文字，無img節點／新增image request |
| CV-28 | PASS | ack前disabled、後enabled；選欄撤销bytes／ack；original持續阻擋 |
| CV-29 | PASS | Node可控延遲adapter＋真瀏覽器harness；reader abort、Worker terminate、clear／來源變更不採遲到read／parse／export |
| CV-30 | PASS | 原生FileReader與實際picker；.csv可預覽，.xlsx／1MiB+1在讀前拒絕並保留原來源 |
| CV-31 | PASS＋部分NOT_RUN | 無新增HTTP與自身origin storage／cookie／IDB／Cache；清除引用與Blob撤銷。4184停止後已載入英文頁native parse／JSON（274bytes）成功、clear空、console errors空。實際下載落盤NOT_RUN；沒有測關頁後離線重開或全OS斷網 |
| CV-32 | PASS | Worker缺失無fallback；真五秒watchdog TIMEOUT／terminate |
| CV-33 | PASS＋部分NOT_RUN | Enter／Space／Tab的預覽、選欄、分頁、準備／ack／下載焦點及checkbox重建焦點。OS原生picker純鍵盤、真下載落盤、screen reader NOT_RUN |
| CV-34 | PASS＋部分NOT_RUN | 兩語320 CSS px frame（扣scrollbar client305）；50欄201筆，資料與修改格皆100/100/1，page scrollWidth305，table獨立scrollWidth24866；200%文字32px仍client／scroll305。真正200%瀏覽器zoom NOT_RUN：工具調用未改變實際宽度，不能稱PASS |
| CV-35 | PASS＋落盤NOT_RUN | 真選檔textarea副本LF但rawSource／首格／export bytes保留CRLF；首次input移除rawSource且改LF／舊輸出失效。Blob MIME／anchor固定檔名／一秒URL撤銷通過，anchor由harness攔截 |
| CV-36 | PASS | 真textarea input路徑quoted CRLF→LF與限制文案 |

所有資料都是本機生成的假字串或bytes。harness使用真正瀏覽器DOM、FileReader和Blob Worker；延遲／能力缺失案例明確使用adapter，沒有冒充真實裝置速度或下載落盤。320px/no-JS檢查在專用fixture中允許同源frame，產品正常伺服器與release headers仍是 frame-ancestors none。

## 未驗與風險

- NOT_RUN：Firefox、真正手機／觸控、screen reader、OS下載儲存流程、真正200% browser zoom、下游Excel／LibreOffice等試算表、正式HTTPS與主機headers／DNS／兩語live homepage。
- 保護副本不是跨所有試算表的安全保證；負數也會被保守標記。所有輸出仍需在下游確認匯入型別及公式處理。
- 貼上／首次編輯採textarea的LF值；未編輯檔案才保留原本格內CR／LF。原值CSV不是原始bytes複製。
- 所有限制都是產品硬上限，不是每台装置五秒內完成的效能保證。
- 靜態網站初次載入有正常資源流量；處理本身沒有網路請求。沒有service worker或關閉頁面後離線重開保證。

## 持久環境

guard before／after-local均PASS，以下值一致；没有自動修復或改寫持久環境。

| Scope | Registry type | PATH length | Ephemeral | PATH SHA256 | Environment-key SHA256 |
| --- | --- | --- | --- | --- | --- |
| HKCU | ExpandString | 834 | 0 | 3efe0b0eba15a12d5555fb191a204ce0048f87381d73108bac1d6d5d05b67ffb | 3a36b632b9e0143f2ff2b9e1c5b964e89bf192a4a3aa3ebc93ea8d0314ee7e5a |
| HKLM | String | 1227 | 0 | 52d7cb0c3e02b67714f1b0caefc8f92d5d2c365bb2513dc537d42207d8b56eb8 | a0f49688069fd5a21146e94fd22764caedcd3ffbe25dc60c716a6a398673ac82 |

正式release由主對話獨立驗收與整合。未修改首頁、其他工具、根Git index、Cloudflare/DNS或GlossGate。
# U04-LITERAL-FIND-20261013 — 增量驗收（2026-10-13）

新版狀態 **AWAITING_PRIMARY / EXTERNAL_REVIEW_PENDING**；沒有沿用舊版外部通過。本 owner 只實作、驗收及更新公開來源，不部署或改首頁。既有 2026-10-11 live release 與下方舊證據保留為歷史。

- Node 24.14.0；focused 29/29 PASS，exit 0。settled npm.cmd test **61/61 PASS**，0 skipped；check、build、build -- --release 全 exit 0；preview19檔／release20檔。git diff --check exit0，但主repo的工具仍untracked，因此另以獨立發布 copy 的 staged diff --check 與逐檔 baseline 審查核對新增檔。
- offline search tests／實際 controller 包含 U04-01..13：exact F201 坐標、重名／projection、header、query Unicode／上限／invalid、不可變 rawSource／risk／ack／bytes／job identity、busy／stale reply。U04-13 純函式測精確1MiB/5,000 records/100,000 cells，5000個metadata上限。
- 真瀏覽器：Chrome extension 桌面及 Codex in-app Chromium，Windows。F201 dataRow1/100/101/201，page1/1/2/3、資料DOM100/100/1；同名第3欄150/CSV151/page2。手動離開目前結果頁無誤貼高亮；來源index與投影index分開，選欄／source edit清匹配並依原契約使匯出失效。
- 真瀏覽器另核對字面 .／[x]／.*／foo、大小寫／空格／Unicode composition、256/257不截短／多行拒絕、HTML無img/dialog、header-off／header-only／空來源／no-columns。這些是原生UI操作，不是Node mock。
- 真瀏覽器邊界檔1,048,576 bytes／5,000 records／100,000 cells：第1欄needle找到4,999格；第20欄lastmatch定位dataRow4,999／CSV5,000／page50，DOM99列。未見明顯長時間阻塞；沒有宣稱手機或效能benchmark。
- nativeFileReader選CRLF檔：textarea顯示LF，table pre仍a CRLF b，b定位dataRow1/CSV2；查找後下載原值36bytes完全符合預期，首次真的textarea input才改text/LF並清查找。
- 原生下載落盤：英文original搜尋前／四格跨頁／257錯誤／clear後各5,349bytes，均202records，SHA256同為5fe2a412b0e72d0033f6f0923828d1e8c0a47568d9e2072dc17451ad919bc0b8。另CRLF original36bytes SHA256 dc33215f1379a6eef0dc96e80be5bbdc54e8a9f64217e9aa15455fe1b8cdbe40；繁中protected41bytes SHA256 b44907c4df41a398c81b5dfe5914277ab278c78f7b5229c9b56f4adde818a6f6，原生確認前download停用，確認後search不撤回ack、original仍停用。副本bytes逐一核对固定預期，不讀其它下載資料。
- 兩語真320CSSpx長欄名重排：含scrollbar client305，scrollWidth305；table-local client222/scroll886，外層不溢出。Enter查找、Home/ArrowDown選欄、Tab至Next／table-region、Next保留焦點；CSV textarea Enter插入換行並按既有input契約清查找。沒有全頁鍵盤handler，Ctrl+F由瀏覽器處理；原生Ctrl+F面板本輪未另外驗。
- 真200%browser page zoom、實體裝置／触控、Firefox、AT/screen reader、完整Network/Storage稽核、下游試算表 **NOT_RUN**，不得以320viewport冒充zoom。靜態危險API、外部resource與bundle一致性gate仍PASS；query在記憶體、無新增request/storage程式路徑。沒有重新聲稱已做全面隱私稽核。
- Chrome download事件未回路徑；改由工具本身在in-app Chromium原生下載並核對上述bytes。Chrome內部下載頁被瀏覽器URL安全政策拒絕，沒有繞過／讀browser profile／改設定。
- Windows guard before與after-local紀錄比較完整Environment指紋，後续來源發布後再次核對，最終結果以HANDOFF／環境JSON為準。未讀部署憑證、未改持久設定。原始本輪證據只寫 .runs/04-csv-workbench-outcome-2026-10-13/；browser-evidence.json、native-downloads.json、native-more-downloads.json、final-gates.json與兩語截圖。

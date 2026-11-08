# 只读数据立方体与 GitHub 展示

当前界面支持全球 Level 8 编号和地图选择，已生成的在线预览以只读 PNG 呈现；未准备分区不会套用其他分区数据。浏览者不需要连接内网 NAS，页面无写入 NAS 的操作。源文件继续保存在现有存储中；本次未部署 NAS 服务或更改群晖设置。

已接入 8 个变量、140 张土壤/高程/土地覆盖预览、47,485 张逐日土壤水分预览及 47,485 张 GloFAS 流量日切片：砂粒、黏粒和有机碳各 7 层，根区有效储水量与高程各一层，土地覆盖五期；覆盖北京、桂林、贵港、广州、韶关五个关联分区。空间范围是本地分区，不是累计上游流域。

土壤与 DEM 是静态资料；土地覆盖可切换 **2000、2005、2010、2015、2020**，采用 NatCap / University of Minnesota 对 GLC_FCS30D 按年拼接、重采样至 1 角秒的 COG 派生版。每期有自己的地图与图例，未插值其他年份。层叠视图用于浏览深度维度，不是三维地质模型。

表层土壤水分接入 **2000-01-01 至 2025-12-31，共 9,497 天**，来源 ScienceDB V3（DOI: 10.57760/sciencedb.30546），保留原生 0.1° 网格。它是 ERA5-Land 0–7 cm 与 SMAP L4 表层 0–5 cm 的融合产品，不能当作 HWSD 深度层。五个试点可选择年份、日期及逐日播放；26 个年度资源按需加载，流域均值按源像元与原始流域相交的测地面积加权。缺测保留为空，灰色显示。

GloFAS 流量使用已下载 v5.0 的 `avg_dis`（时间平均河流流量，m³/s）。源月包标签为 2000–2025 年，实际原始 `valid_time` 为 **2000-01-02 至 2026-01-01，共 9,497 天**。网页按真实日历年加载 27 个资源包；2026 年只有 1 月 1 日。日期不前移，不推断文件未提供的平均时段边界。流量层保留原生 0.05° 像元及网格范围，使用现成 PNG 原字节；未重采样、求流域平均或总和，也未确定出口格点。没有将这套下载产品解释为用户自行模拟的流量或实测站点流量。[产品主页](https://global-flood.emergency.copernicus.eu/)

后端的全球逐日立方体通过已验证的原始年度 ZIP 和日期索引读取，区域导出可物化为 Zarr。土地利用采用 `time`，土壤水分采用独立的 `soil_moisture_time`，GloFAS 切片保留 `valid_time`；这些时间轴不会互相填充。全球登记完成不等于所有流域都已生成网页 PNG：除现有五个试点外，页面仍明确显示待提取，可导出请求。当前公开静态网站不会直接启动内网计算。

原始边界和真实HydroRIVERS河网可独立叠加。全球河网概览展示主要河道，现有案例另有详细河段；范围与阈值保留在资产来源信息中。

## 数据与展示

- `scripts/build_cube_previews.py` 只读源目录，生成 `dist/assets/cube-previews.js`，内容为 PNG 与展示元数据。
- `scripts/build_moisture_all_years.py` 调用年度生成器，生成 `assets/cube-moisture-catalog.js` 与 `assets/cube-moisture/2000.js` 至 `2025.js`。原始包已有官方 MD5 验证；完整日文件读取核验 CRC，条带前缀读取则记录实际读取范围和哈希，并逐年抽查首日与完整 CRC 读取一致，两类验收范围明确区分。年度进程锁和已完成审计支持恢复，不重复写同一年。
- `dist/cube-viewer.js` 提供全球分区选择、变量、深度、日期、时序曲线、图层、缩放和平面/层叠切换。
- `scripts/build_discharge_previews.py --source <已验收切片目录>` 校验共享盘年度包 SHA-256，仅封装已有 GloFAS PNG 与公开展示元数据，生成 `assets/cube-discharge-catalog.js` 和 `assets/cube-discharge/2000.js` 至 `2026.js`。验证每张 PNG 的原生尺寸及编码前后字节相等。NetCDF 数值切片与原始文件不进入公开仓库，私有路径不进入展示资源。
- 发布前可运行 `scripts/optimize_preview_pngs.py` 无损压缩嵌入的 PNG；每张改写图像均解码并逐字节核对 RGBA 像素，尺寸、日期和数值不变，审计写入 `qa/preview-png-lossless-audit.json`。
- 原有预览长边 96 格，连续值映射为 12 级色阶；土地覆盖保留官方35类原始编码与RGB。GloFAS 使用原生窗口尺寸及 11 档固定色阶，下界依次为 0、0.1、1、5、10、50、100、500、1000、5000、10000 m³/s，最高档为 ≥10000；面外透明、缺测灰色、负值红色。显示切片不能用于还原精确数值或替代原始数据计算。
- 土壤采用最近邻土壤单元关联与既有 SHARE 加权属性；土地覆盖为预览采样；高程为均值重采样。原始文件保持不变，立方体目录已补全五期土地利用与全球逐日土壤水分。
- 预览图及现有公开研究结果可以被查看、保存。只读保护的是不允许修改源文件，并不承诺防止别人保存网页内容。

完整数值导出工具 `scripts/export_cube_viewer.py` 只写入被忽略的 `qa/private-cube/`，不进入公开静态资源。

## 后续 NAS 预览服务（可选，当前未部署）

`services/cube_preview.py` 是独立只读服务：只允许固定配置的流域与变量，返回 PNG；无原始文件、数值数组、任意范围请求及写操作接口。它不影响当前 GitHub 网页展示。

环境变量：

| 名称 | 内容 |
|---|---|
| `HYDRO_CUBE_ROOT` | 现有 `data/cube` 目录；本机可以是共享盘路径 |
| `CUBE_BASINS_FILE` | 允许展示的原始流域 GeoJSON，本地私有配置 |
| `CUBE_PREVIEW_TOKEN` | 至少16字符的私有随机访问码；不写进网页或仓库 |
| `CUBE_ALLOWED_ORIGINS` | 允许访问的网页源，逗号分隔，精确到协议与主机 |
| `CUBE_BIND` / `CUBE_PORT` | 默认仅监听本机 `127.0.0.1:8767` |

Docker 配置在 `services/compose.yaml`，数据目录以只读方式挂载。若在群晖或其他服务器运行，需要容器对数据有读取权限；JSON 清单中的旧路径会重映射到容器 `/data`。对外部署还需 HTTPS 反向代理与合适的访问控制。本次没有开启公网隧道或开放 SMB。

## 界面参考

- [Open Data Cube Explorer](https://github.com/opendatacube/datacube-explorer)
- [Digital Earth Africa Map](https://docs.digitalearthafrica.org/en/latest/platform_tools/deafrica_map.html)
- [Swiss Data Cube Viewer](https://www.swissdatacube.org/viewer/)

借鉴目录—地图—维度浏览的组织方式，本界面使用独立实现。

# DEM 与年度植被升级（2026-11-25）

现有 5 个试点和 98 个案例流域，共 103 个 HYBAS_ID，使用新版高程及年度植被切片。全球源产品可用不等于全球栅格已全部下载；其他分区按需提取。

| 变量 | 旧资料 | 当前资料 | 本次本地覆盖 |
|---|---|---|---|
| 高程 | GEBCO 2026，15 角秒，赤道附近约 463 m | FABDEM V1-2，1 角秒，赤道附近约 31 m | 103 个原始流域边界 |
| 植被覆盖度 | AVHRR 1982–2016 净变化，0.05° | MOD44B Collection 6.1，标称 250 m | 103 流域 × 2000–2025 年，共 2678 个五波段 GeoTIFF |
| 土地覆盖 | GLC_FCS30D NatCap 1 角秒派生版，五期 | 保留同一分类数据，改为年份层叠与滑条 | 2000、2005、2010、2015、2020；不插值 |

分辨率指像元间距，不是高程误差或分类准确率。FABDEM 是去除森林、建筑影响的地形产品，不代表经过水文强制处理。

## 数据与显示

- 数值数据保存在既有 HydroTransfer 共享盘的 `data/cube/upgrades/20261125/`：`dem/<HYBAS_ID>.tif`、`vegetation/<year>/<HYBAS_ID>.tif`。
- DEM 保留原生 1 角秒、半像元偏移网格及 Float32 高程。通过 GEE 社区目录读取相同 V1-2，并使用已下载的 Bristol 官方分幅交叉核验重叠像元。
- MOD44B 保留原生 MODIS 正弦网格（像元间距 231.656358 m，产品标称 250 m）、三组分百分比、Quality 与 Cloud 位字段。原始 QA 未筛除，不强制把三组分归一化为 100%。范围外及源缺测为 255。
- 年份为产品名义年，年度区间从 3 月开始，不等同于 1 月至 12 月。源索引及毫秒时间戳存于每份 sidecar 和 `source_catalog.json`。
- 2024 年起存在官方已报告的处理连续性问题，混合景观的跨年变化应结合 [NASA 说明](https://landweb.modaps.eosdis.nasa.gov/displayissue?id=1406) 解释。
- 网页仅发布显示图像，按流域加载 79 张新预览（1 张 DEM、26 年 × 3 组分），不发布科学数值 GeoTIFF。最长边 384 像素，连续量以面积平均重投影供显示；显示网格不增加数据精度。DEM 图例使用当前流域真实高程最小值、最大值取整，植被固定 0–100%。灰色为缺测。
- 土地覆盖默认五层年份叠图；植被在 26 年中显示所选年份附近七层，滑条可遍历全部年份。土壤仍按深度层叠。
- 新源单独登记为 `dem_fabdem_ready.json`、`vegetation_mod44b_ready.json`。`cube.json` 的 `preferred_basin_sources` 指明现有流域优先源。旧的全球 GEBCO、AVHRR 产品保留用于回退或历史对照，不将局部覆盖声明为全球下载完成。

## 来源及许可

FABDEM V1-2：[Bristol 数据及引用信息](https://doi.org/10.5523/bris.s5hqmjcdj8yo2ibzi9b4ew3sn)，Hawker 等 / Neal 等；[GEE 社区镜像说明](https://gee-community-catalog.org/projects/fabdem/)。本次裁剪、重投影及着色属于派生处理，FABDEM 数据和高程预览沿用 [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/)，限非商业使用并保留署名及相同许可。

MOD44B.061：[NASA LP DAAC 产品 DOI](https://doi.org/10.5067/MODIS/MOD44B.061)。网页植被图为该产品三组分的显示派生图，未进行分类精度或时间一致性修正。

## 复现与验证

共享盘版本目录的 `scripts/` 保存计划、下载、预览、登记及验证脚本；每个 GeoTIFF 另有 `.tif.json`，记录 SHA-256、原生网格、有效像元及源时间。`validation.json` 汇总全部文件的范围、掩膜、数值和官方 DEM 样本交叉校验。网页资源包另有 SHA-256，载入时核对流域编号与完整性。

下载脚本可断点续传：同版本目录执行 `acquire.py dem-gee --workers 5`、`acquire.py vegetation --workers 8`。全部数据可用后执行 `build_previews.py` 与 `finalize.py`。这些脚本依赖现有已授权 GEE 项目；不包含凭据。

旧 `services/cube_preview.py` 与历史案例生成器仍用于旧源流程；重新生成本次网页升级资源应使用版本目录的 `build_previews.py`，避免将旧预览当作新版高程。

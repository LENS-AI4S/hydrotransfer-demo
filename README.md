# HydroTransfer

全球流域参数移植与洪水模拟研究展示网页。

**在线界面：[打开数据立方体](https://lens-ai4s.github.io/hydrotransfer-demo/#data)**

- 全球 HydroBASINS Level 8：190,675 个分区，支持上下游高亮。
- 五个试点的真实研究成果：11条来源候选、535条证据、145条关联，6项MODIS共232个逐日帧。
- 数据立方体：全球分区选择、7变量、7个土壤深度、120张静态与175张逐日土壤湿度预览；支持平面/层叠和分层播放。
- 来源候选不是已确认的独立洪水次数，证据采用待核定。参数移植模拟仍为演示。

## 数据立方体

网页使用预生成的PNG，不要求访客连接内网NAS。原始COG/Zarr和完整立方体数组没有放入本仓库；网页没有修改NAS数据的操作。浏览内容和预览图片可以被保存。

土壤与DEM为静态资料，土地覆盖只有2020年。层叠视图用于浏览土壤深度，不是三维地质模型。土壤湿度已接入现有试点的真实日序列，全球源覆盖与在线切片范围分别展示。详见 [数据立方体说明](docs/DATA_CUBE.md)。

## 代码与部署

`cube-viewer.js`：立方体界面；`research-results.js`：多模态成果；`app-hydrobasins.js`：地图、选择与导航；`hydro-topology.js`：上下游关系。`services/` 是可选的只读预览服务代码，当前没有远程部署。

GitHub Pages 从 `main` 分支根目录自动发布；更新此分支后，GitHub执行Pages构建与部署。无需运行NAS服务即可查看当前网页。本仓库是展示工程，科学处理工程另行维护。

本地可用 `python -m http.server 8000` 打开预览。

## 来源

HydroBASINS v1c、Natural Earth、HWSD v2.2、GLC_FCS30D 2020（NatCap年度COG派生版）和GEBCO 2026。数据版本、限制、单位及界面参考见 [说明文档](docs/DATA_CUBE.md)。来源数据遵循各提供方许可；预览不替代正式计算用的原始数据。

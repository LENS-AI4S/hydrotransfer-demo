# 只读数据立方体与 GitHub 展示

当前界面支持全球 Level 8 编号和地图选择，已生成的在线预览以只读 PNG 呈现；未准备分区不会套用其他分区数据。浏览者不需要连接内网 NAS，页面无写入 NAS 的操作。源文件继续保存在现有存储中；本次未部署 NAS 服务或更改群晖设置。

已接入 7 个变量、120 张静态预览及175张逐日土壤水分预览：砂粒、黏粒和有机碳各 7 层，根区有效储水量、土地覆盖、高程各一层，覆盖北京、桂林、贵港、广州、韶关五个关联分区。空间范围是本地分区，不是累计上游流域。

土壤与 DEM 是静态资料；土地覆盖只有 2020 年。层叠视图用于浏览深度维度，不是三维地质模型或时间序列。表层土壤水分已接入2024-04-01至2024-05-05的35日窗口，保留0.1°源网格；NAS完整存量覆盖2000–2025。日期超出在线窗口时明确提示未生成切片。

原始边界和真实HydroRIVERS河网可独立叠加。全球河网概览展示主要河道，现有案例另有详细河段；范围与阈值保留在资产来源信息中。

## 数据与展示

- `scripts/build_cube_previews.py` 只读源目录，生成 `dist/assets/cube-previews.js`，内容为 PNG 与展示元数据。
- `dist/cube-viewer.js` 提供全球分区选择、变量、深度、日期、时序曲线、图层、缩放和平面/层叠切换。
- 预览长边 96 格，连续值映射为 12 级色阶；土地覆盖保留官方35类原始编码与RGB。超出图例范围的值截断显示；灰色为无有效值。预览不能替代原始网格精度或用于定量模型计算。
- 土壤采用最近邻土壤单元关联与既有 SHARE 加权属性；土地覆盖为预览采样；高程为均值重采样。原始全球多分辨率立方体未更改。
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

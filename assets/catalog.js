window.HYDRO_CATALOG = [
  {
    "id": "hydrobasins-l08",
    "name": "HydroBASINS v1c · Level 8",
    "title": "全球统一子流域分区",
    "category": "流域边界",
    "resolution": "15角秒源网格 · Pfafstetter Level 8",
    "coverage": "全球陆地，南极洲除外",
    "description": "已接入190,675个分区和原始上下游关系；五试点结果按HYBAS_ID关联。",
    "url": "https://www.hydrosheds.org/products/hydrobasins",
    "status": "边界、拓扑与五试点已接入"
  },
  {
    "id": "era5-land",
    "name": "ERA5-Land",
    "title": "降水与气象驱动",
    "category": "气象驱动",
    "resolution": "0.1° · 小时",
    "coverage": "全球陆地",
    "description": "气象来源已梳理；完整日尺度驱动及流域提取尚待接入。",
    "url": "https://cds.climate.copernicus.eu/datasets/reanalysis-era5-land?tab=overview",
    "status": "来源已梳理"
  },
  {
    "id": "gebco-2026",
    "name": "GEBCO 2026",
    "title": "全球地形高程",
    "category": "地形",
    "resolution": "15角秒",
    "coverage": "全球陆海地形",
    "description": "全球8幅原生高程已处理并验收；未进行水文校正，按流域物化待按需执行。",
    "url": "https://www.gebco.net/data-products/gridded-bathymetry-data",
    "status": "全球资产已就绪"
  },
  {
    "id": "hwsd-v22",
    "name": "HWSD v2.2",
    "title": "土壤分层属性",
    "category": "土壤",
    "resolution": "30角秒 · 7层",
    "coverage": "全球土壤",
    "description": "土壤空间网格、7层属性查找表及原始组分表已处理；具体流域提取待按需执行。",
    "url": "https://data.apps.fao.org/catalog/iso/ff5c613c-75bb-46a9-a162-bc728059b465",
    "status": "全球资产已就绪"
  },
  {
    "id": "glc-fcs30d-2020",
    "name": "GLC_FCS30D 2020",
    "title": "土地覆盖分类",
    "category": "土地覆盖",
    "resolution": "NatCap 1角秒派生网格",
    "coverage": "2020年全球",
    "description": "已处理全球2020年土地覆盖；采用NatCap年度COG派生版，保留分类编码。",
    "url": "https://zenodo.org/records/8239305",
    "status": "全球资产已就绪"
  },
  {
    "id": "glofas",
    "name": "GloFAS v5",
    "title": "模型流量过程",
    "category": "水文序列",
    "resolution": "日尺度 · 2018—2024资料",
    "coverage": "五试点候选格点",
    "description": "已接入五试点实际日流量曲线与高流量候选；模型出口仍待核定，北京映射不代表所选完整流域。",
    "url": "https://global-flood.emergency.copernicus.eu/",
    "status": "五试点处理成果已接入"
  },
  {
    "id": "soil-moisture",
    "name": "ERA5-Land / SMAP 土壤水分",
    "title": "已有土壤水分目录",
    "category": "土壤水分",
    "resolution": "以既有产品元数据为准",
    "coverage": "已有2000—2025年资料目录",
    "description": "已登记外部数据目录，没有重复下载；流域与时间对齐尚待接入。",
    "url": "https://nsidc.org/data/smap",
    "status": "已有目录已登记"
  }
];

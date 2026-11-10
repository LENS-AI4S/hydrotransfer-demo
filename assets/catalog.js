window.HYDRO_CATALOG = [
  {
    "id": "hydrobasins-l08",
    "name": "HydroBASINS v1c · Level 8",
    "title": "全球统一子流域分区",
    "category": "流域边界",
    "resolution": "15角秒源网格 · Pfafstetter Level 8",
    "coverage": "全球陆地，南极洲除外",
    "description": "已接入190,675个分区和原始上下游关系；本批100项光学完成案例按原HYBAS_ID关联，98个流域提供原始边界。",
    "url": "https://www.hydrosheds.org/products/hydrobasins",
    "status": "全球边界与拓扑已接入"
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
    "description": "全球高程资产已就绪；原五试点与新增98个案例流域已有只读高程预览，未进行水文校正。",
    "url": "https://www.gebco.net/data-products/gridded-bathymetry-data",
    "status": "全球资产及案例预览已接入"
  },
  {
    "id": "hwsd-v22",
    "name": "HWSD v2.2",
    "title": "土壤分层属性",
    "category": "土壤",
    "resolution": "30角秒 · 7层",
    "coverage": "全球土壤",
    "description": "全球土壤单元、7层属性与组分表已处理；原五试点及新增98流域可浏览砂粒、黏粒、有机碳与根区有效储水量。",
    "url": "https://data.apps.fao.org/catalog/iso/ff5c613c-75bb-46a9-a162-bc728059b465",
    "status": "7层土壤预览已接入"
  },
  {
    "id": "glc-fcs30d-2020",
    "name": "GLC_FCS30D · 五期土地覆盖",
    "title": "土地覆盖分类",
    "category": "土地覆盖",
    "resolution": "NatCap 1角秒派生网格",
    "coverage": "全球 · 2000、2005、2010、2015、2020年",
    "description": "采用NatCap年度COG派生版；原五试点及新增98个案例流域均有五期预览，使用官方35类编码和RGB，不插值年份。",
    "url": "https://zenodo.org/records/8239305",
    "status": "五期预览已接入"
  },
  {
    "id": "glofas",
    "name": "GloFAS v5.0 · avg_dis",
    "title": "原生格点日流量",
    "category": "水文序列",
    "resolution": "0.05° · 每日 · m³/s",
    "coverage": "原生时间戳2000-01-02至2026-01-01",
    "description": "五试点保留完整时序；新增98个流域提供案例观测窗口切片。保持原生格点与valid_time，不计算流域平均、总和或认定出口。分来源证据另见研究结果。",
    "url": "https://global-flood.emergency.copernicus.eu/",
    "status": "日流量切片已接入"
  },
  {
    "id": "soil-moisture",
    "name": "ERA5-Land / SMAP L4 · V3",
    "title": "表层土壤湿度",
    "category": "土壤水分",
    "resolution": "0.1° · 每日 · m³/m³",
    "coverage": "全球资料2000-01-01至2025-12-31",
    "description": "五试点已有26年逐日预览；新增98个流域已有案例观测窗口切片。均值按原始网格与流域相交面积加权；不作为HWSD七层土壤水分。",
    "url": "https://doi.org/10.57760/sciencedb.30546",
    "status": "日湿度切片已接入"
  },
  {
    "id": "hydrorivers-v10",
    "name": "HydroRIVERS v1.0",
    "title": "真实河网与河段关系",
    "category": "河网",
    "resolution": "原生矢量河段",
    "coverage": "全球公开河网",
    "description": "地图提供主要河道；新增98个案例流域另有详细河段预览，保留HYRIV_ID与NEXT_DOWN，线条仅为展示进行裁剪与概化。",
    "url": "https://www.hydrosheds.org/products/hydrorivers",
    "status": "河网已接入"
  }
];

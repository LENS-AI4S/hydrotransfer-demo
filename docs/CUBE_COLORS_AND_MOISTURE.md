# 立方体图例与土壤水分

## 分类颜色与连续色标

土地覆盖按 GLC_FCS30D 官方用户指南第二页的35个原始分类编码与RGB绘制，未再合并为任意的十类颜色。耕地、林地、水体及不透水面遵循该产品自身图例；灌溉耕地与雨养耕地的颜色不同。35个RGB已逐项与下载的官方PDF文字表核对。

来源：[GLC_FCS30D 官方用户指南](https://zenodo.org/records/15063683/files/GLC_FCS30D%20UserGuides.pdf)，产品原始数据：[Zenodo](https://zenodo.org/records/8239305)。

当前土壤变量是连续数值属性，不是WRB土类。砂粒采用ColorBrewer YlOrBr、黏粒采用Oranges、有机碳采用YlGn、根区储水量与表层土壤水分采用YlGnBu；从9个原始锚点插值得到12级显示色阶。图例标明数值范围和单位，不将其称为HWSD统一官方分类配色。高程采用GMT geo陆地颜色锚点，按当前0–3000m显示范围重标度。

来源：[ColorBrewer 作者维护色表](https://github.com/axismaps/colorbrewer)、[GMT geo](https://github.com/GenericMappingTools/gmt/blob/master/share/cpt/gmt/geo.cpt)。

## 真实土壤水分时序

本机读取了既有NAS的ScienceDB V3数据。完整本地存量为2000–2025年的26个年度ZIP。原始每日文件是WGS84 0.1°、1800×3600、单波段GeoTIFF，日期来自YYYYMMDD文件名；原始文件未修改。

论文和数据记录：[Wang等，2026](https://essd.copernicus.org/articles/18/1061/2026/)、[ScienceDB DOI](https://doi.org/10.57760/sciencedb.30546)。产品为表层体积土壤水分，单位m³/m³，融合ERA5-Land 0–7cm与SMAP L4表层0–5cm资料。它不对应HWSD的七个土壤层，也没有在本次展示中强行对齐为同一高分辨率网格。

在线窗口覆盖2000-01-01至2025-12-31，共9,497个实际日期、五个已处理分区、47,485张真实日切片。26个年度资源按需加载；其他全球分区仍需提取。每个流域日均值按原始0.1°源像元与流域面相交的WGS84测地面积加权，剔除缺测；不使用放大后的显示像元求均值。有效面积占比一同保存。源网格大小可能超过部分流域尺度，预览不提供更细的空间分辨能力。

`scripts/build_soil_moisture_previews.py`只读取源ZIP；原始年度包已有官方MD5校验，完整日文件读取核验CRC，条带前缀读取记录实际读取范围与SHA-256，并逐年抽查首日与完整CRC读取一致。前端`assets/cube-moisture-catalog.js`及`assets/cube-moisture/2000.js`至`2025.js`保存逐日预览和流域均值，由年份、日期、滑块和播放控件联动展示，不对缺测日插值。发布前的PNG压缩逐像素验证RGBA和尺寸一致，不改变数值与日期。

## 全球选择与已有切片

立方体可接受任意有效的原生Level8编号，并在全球地图选择。已有预览目录仅表示已经生成的在线结果；未处理分区不会代用某个城市的数据。其边界和河网可以单独浏览，并可导出当前分区、变量、层位或日期的只读切片请求。导出请求不代表已执行计算，也不写入NAS。

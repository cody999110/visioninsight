import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { geoMercator, geoPath } from "d3-geo";
import * as topojson from "topojson-client";
import { regionSalesData as mockRegionSalesData } from "@/data/mockData";
import { api } from "@/lib/api";
import { useDataSource } from "@/contexts/DataSourceContext";
import { Badge } from "@/components/ui/badge";
import DataEmptyState from "@/components/dashboard/DataEmptyState";

interface ProvinceFeature {
  type: string;
  id: string;
  properties: { name: string; 地名: string };
  geometry: any;
}

const nameMap: Record<string, string> = {
  "广东省": "广东", "浙江省": "浙江", "江苏省": "江苏", "上海市": "上海",
  "北京市": "北京", "山东省": "山东", "四川省": "四川", "福建省": "福建",
  "湖北省": "湖北", "湖南省": "湖南", "河南省": "河南", "安徽省": "安徽",
  "河北省": "河北", "辽宁省": "辽宁", "陕西省": "陕西", "重庆市": "重庆",
  "天津市": "天津", "江西省": "江西", "广西壮族自治区": "广西", "云南省": "云南",
  "贵州省": "贵州", "山西省": "山西", "吉林省": "吉林", "黑龙江省": "黑龙江",
  "内蒙古自治区": "内蒙古", "新疆维吾尔自治区": "新疆", "甘肃省": "甘肃",
  "海南省": "海南", "宁夏回族自治区": "宁夏", "青海省": "青海",
  "西藏自治区": "西藏", "台湾省": "台湾", "香港特别行政区": "香港",
  "澳门特别行政区": "澳门",
};

const getColor = (value: number, max: number) => {
  const ratio = value / max;
  if (ratio > 0.7) return "hsl(262, 70%, 35%)";
  if (ratio > 0.5) return "hsl(262, 60%, 45%)";
  if (ratio > 0.35) return "hsl(262, 55%, 55%)";
  if (ratio > 0.2) return "hsl(262, 45%, 65%)";
  if (ratio > 0.1) return "hsl(262, 35%, 78%)";
  if (ratio > 0.03) return "hsl(262, 25%, 88%)";
  return "hsl(262, 15%, 93%)";
};

const ChinaMapChart = () => {
  const navigate = useNavigate();
  const { isDemo, datasetFor, currentCompany } = useDataSource();
  const datasetId = datasetFor("revenue");

  const { data } = useQuery({
    queryKey: ["dashboard", "region-sales", datasetId],
    queryFn: () => api.getRegionSales(datasetId),
    enabled: !!datasetId,
  });

  const live = !isDemo && data?.is_live_data && Object.keys(data.regions).length > 0;
  const regionSalesData = live ? data.regions : mockRegionSalesData;

  const [hoveredProvince, setHoveredProvince] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [geoData, setGeoData] = useState<ProvinceFeature[] | null>(null);
  const maxSales = Math.max(...Object.values(regionSalesData), 1);

  useEffect(() => {
    fetch("/data/cn-atlas.json")
      .then((res) => res.json())
      .then((topoData) => {
        const provinces = topojson.feature(topoData, topoData.objects.provinces) as any;
        setGeoData(provinces.features);
      })
      .catch(console.error);
  }, []);

  const projection = useMemo(
    () => geoMercator().center([104, 35]).scale(580).translate([320, 260]),
    [],
  );

  const pathGenerator = useMemo(() => geoPath().projection(projection), [projection]);

  if (!isDemo && !live) {
    return (
      <div className="glass-card p-5">
        <h3 className="font-display text-base font-semibold text-foreground mb-2">区域销售分布</h3>
        <DataEmptyState company={currentCompany?.name ?? "当前公司"} domain="revenue" domainLabel="收入" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.5 }}
      className="glass-card p-5 cursor-pointer hover:shadow-lg transition-shadow"
      onClick={() => navigate("/revenue-analysis")}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="font-display text-base font-semibold text-foreground">区域销售分布</h3>
          {live && currentCompany?.name ? (
            <Badge variant="secondary" className="text-[10px] truncate max-w-[140px]">{currentCompany.name}</Badge>
          ) : null}
        </div>
      </div>

      <div className="relative w-full" style={{ paddingBottom: "80%" }}>
        {!geoData ? (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">加载地图中...</div>
        ) : (
          <svg viewBox="0 0 640 520" className="absolute inset-0 w-full h-full">
            {geoData.map((feature, i) => {
              const shortName = nameMap[feature.properties?.地名 || feature.properties?.name || ""] ||
                (feature.properties?.地名 || "").replace(/省|市|自治区|特别行政区|壮族|回族|维吾尔/g, "");
              const sales = regionSalesData[shortName] || 0;
              const d = pathGenerator(feature.geometry as any);
              if (!d) return null;
              return (
                <path
                  key={feature.id || i}
                  d={d}
                  fill={getColor(sales, maxSales)}
                  stroke="hsl(0, 0%, 96%)"
                  strokeWidth={0.5}
                  onMouseEnter={() => setHoveredProvince(shortName)}
                  onMouseLeave={() => setHoveredProvince(null)}
                />
              );
            })}
          </svg>
        )}

        {hoveredProvince && (
          <div className="absolute bg-card border border-border rounded-lg px-3 py-2 text-xs z-10 pointer-events-none shadow-lg" style={{ left: 12, top: 12 }}>
            <div className="font-semibold text-foreground">{hoveredProvince}</div>
            <div className="text-muted-foreground mt-0.5">
              销售额: ¥{(regionSalesData[hoveredProvince] || 0).toLocaleString()}万
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default ChinaMapChart;

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet.markercluster";
import { Shop } from "../api/client";

interface Props {
  shops: Shop[];
  onSelectShop: (shop: Shop) => void;
  center: [number, number];
  userLocation: [number, number] | null;
}

export default function MapView({ shops, onSelectShop, center, userLocation }: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);

  // 初始化地图（默认使用 OpenStreetMap 瓦片，无需 API Key，方便本地直接运行）
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center,
      zoom: 14,
      zoomControl: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    L.control.zoom({ position: "bottomright" }).addTo(map);

    const cluster = L.markerClusterGroup({
      // 需求文档 4.3.B：Zoom < 14 时聚合展示
      disableClusteringAtZoom: 17,
      maxClusterRadius: 60,
    });
    map.addLayer(cluster);

    mapRef.current = map;
    clusterRef.current = cluster;

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 地图中心变化时飞过去（例如定位成功后）
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.flyTo(center, mapRef.current.getZoom() < 13 ? 14 : mapRef.current.getZoom());
    }
  }, [center]);

  // 渲染用户当前位置点
  useEffect(() => {
    if (!mapRef.current) return;
    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
      userMarkerRef.current = null;
    }
    if (userLocation) {
      const icon = L.divIcon({
        className: "",
        html: `<div style="width:16px;height:16px;border-radius:50%;background:#2b8bf2;border:3px solid white;box-shadow:0 0 0 3px rgba(43,139,242,0.25)"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
      userMarkerRef.current = L.marker(userLocation, { icon, zIndexOffset: 1000 }).addTo(
        mapRef.current
      );
    }
  }, [userLocation]);

  // 渲染店铺 Marker：灰色=未打卡，橙色=已打卡（需求文档 3.2 店铺渲染规则）
  useEffect(() => {
    const cluster = clusterRef.current;
    if (!cluster) return;
    cluster.clearLayers();

    shops.forEach((shop) => {
      const icon = L.divIcon({
        className: "",
        html: `<div class="shop-marker ${shop.is_checked_in ? "checked-in" : ""}"></div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 26],
      });
      const marker = L.marker([shop.latitude, shop.longitude], { icon });
      marker.on("click", () => onSelectShop(shop));
      marker.bindTooltip(shop.name, { direction: "top", offset: [0, -24] });
      cluster.addLayer(marker);
    });
  }, [shops, onSelectShop]);

  return <div ref={containerRef} className="map-container" />;
}

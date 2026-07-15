import { useCallback, useEffect, useState } from "react";
import MapView from "./components/MapView";
import CategoryTabs from "./components/CategoryTabs";
import AuthModal from "./components/AuthModal";
import CheckInModal from "./components/CheckInModal";
import ShopDetailPanel from "./components/ShopDetailPanel";
import ProfileOverlay from "./components/ProfileOverlay";
import { api, getToken, setToken, Shop, ShopDetail, User } from "./api/client";

const DEFAULT_CENTER: [number, number] = [31.2304, 121.4737]; // 上海（无定位权限时的默认城市）

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const [category, setCategory] = useState("all");
  const [keyword, setKeyword] = useState("");
  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedShopId, setSelectedShopId] = useState<number | null>(null);
  const [checkInTarget, setCheckInTarget] = useState<ShopDetail | Shop | null>(null);

  const [mapCenter, setMapCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [detailRefreshKey, setDetailRefreshKey] = useState(0);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  };

  // 尝试恢复登录态
  useEffect(() => {
    if (getToken()) {
      api.me().then(setUser).catch(() => setToken(null));
    }
  }, []);

  // 请求地理定位，成功后自动定位城市/地图中心（需求文档 3.1 核心业务流程）
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserLocation(loc);
        setMapCenter(loc);
      },
      () => {
        // 定位失败则保留默认城市中心，不打断使用
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  const loadShops = useCallback(() => {
    api.listShops({ category, keyword: keyword || undefined }).then(setShops);
  }, [category, keyword]);

  useEffect(() => {
    loadShops();
  }, [loadShops]);

  const handleSelectShop = useCallback((shop: Shop) => {
    setSelectedShopId(shop.id);
  }, []);

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setProfileOpen(false);
  };

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="brand">
          足迹地图<span className="accent-dot">.</span>
        </div>

        <div className="search-pill">
          <span style={{ color: "var(--color-medium-grey)" }}>⌕</span>
          <input
            placeholder="搜索店铺名称..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>

        <div className="spacer" />

        {user ? (
          <>
            <button className="btn btn-ghost" onClick={() => setProfileOpen(true)}>
              {user.nickname || user.username}
            </button>
            <button className="btn btn-ghost" onClick={handleLogout}>
              退出
            </button>
          </>
        ) : (
          <button className="btn btn-primary" onClick={() => setAuthOpen(true)}>
            登录 / 注册
          </button>
        )}
      </div>

      <CategoryTabs active={category} onChange={setCategory} />

      <div className="main-area">
        <MapView
          shops={shops}
          onSelectShop={handleSelectShop}
          center={mapCenter}
          userLocation={userLocation}
        />

        {selectedShopId && (
          <ShopDetailPanel
            shopId={selectedShopId}
            isLoggedIn={!!user}
            refreshKey={detailRefreshKey}
            onClose={() => setSelectedShopId(null)}
            onRequestLogin={() => setAuthOpen(true)}
            onRequestCheckIn={(shop) => setCheckInTarget(shop)}
          />
        )}
      </div>

      {authOpen && (
        <AuthModal onClose={() => setAuthOpen(false)} onLoggedIn={(u) => setUser(u)} />
      )}

      {checkInTarget && (
        <CheckInModal
          shop={checkInTarget}
          userLocation={userLocation}
          onClose={() => setCheckInTarget(null)}
          onSuccess={() => {
            setCheckInTarget(null);
            showToast("打卡成功！");
            loadShops();
            setDetailRefreshKey((k) => k + 1);
          }}
        />
      )}

      {profileOpen && user && (
        <ProfileOverlay user={user} onClose={() => setProfileOpen(false)} />
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

import { useEffect, useState } from "react";
import { api, resolveAssetUrl, ShopDetail } from "../api/client";
import { categoryLabel } from "../constants";

interface Props {
  shopId: number;
  isLoggedIn: boolean;
  onClose: () => void;
  onRequestCheckIn: (shop: ShopDetail) => void;
  onRequestLogin: () => void;
  refreshKey: number;
}

export default function ShopDetailPanel({
  shopId,
  isLoggedIn,
  onClose,
  onRequestCheckIn,
  onRequestLogin,
  refreshKey,
}: Props) {
  const [shop, setShop] = useState<ShopDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .getShop(shopId)
      .then(setShop)
      .finally(() => setLoading(false));
  }, [shopId, refreshKey]);

  return (
    <div className="side-panel panel">
      <button className="btn btn-ghost" style={{ float: "right", padding: "6px 12px" }} onClick={onClose}>
        关闭
      </button>

      {loading || !shop ? (
        <div style={{ padding: "40px 0", textAlign: "center", color: "var(--color-medium-grey)" }}>
          加载中...
        </div>
      ) : (
        <>
          <div className="category-badge">{categoryLabel(shop.category)}</div>
          <h2 className="shop-title">{shop.name}</h2>
          <p className="shop-meta">{shop.address || "暂无详细地址"}</p>

          <div style={{ marginBottom: 8 }}>
            <span className="stat-chip">
              <span className="num">{shop.check_in_count}</span>
              <span className="label">人已打卡</span>
            </span>
          </div>

          <button
            className={`btn ${shop.is_checked_in ? "btn-outline-accent" : "btn-primary"}`}
            style={{ width: "100%" }}
            onClick={() => {
              if (!isLoggedIn) {
                onRequestLogin();
                return;
              }
              onRequestCheckIn(shop);
            }}
            disabled={shop.is_checked_in}
          >
            {shop.is_checked_in ? "✓ 已打卡" : "去打卡"}
          </button>

          <hr className="divider" />

          <div className="field-label" style={{ margin: "0 0 10px 0" }}>
            最新打卡 ({shop.recent_check_ins.length})
          </div>

          {shop.recent_check_ins.length === 0 ? (
            <div className="empty-state" style={{ padding: "24px 0" }}>
              还没有人打卡，快来抢占第一个吧
            </div>
          ) : (
            shop.recent_check_ins.map((c) => (
              <div className="checkin-item" key={c.id}>
                <div className="checkin-avatar">{(c.username || "U").slice(0, 1)}</div>
                <div className="checkin-body">
                  <div className="checkin-name">
                    {c.username}
                    {c.rating ? ` · ${"★".repeat(c.rating)}` : ""}
                  </div>
                  {c.comment && <div className="checkin-comment">{c.comment}</div>}
                  {c.images && c.images.length > 0 && (
                    <div className="checkin-images">
                      {c.images.slice(0, 6).map((url, i) => (
                        <img key={i} src={resolveAssetUrl(url)} alt="" />
                      ))}
                    </div>
                  )}
                  <div className="checkin-time">{new Date(c.created_at).toLocaleString("zh-CN")}</div>
                </div>
              </div>
            ))
          )}
        </>
      )}
    </div>
  );
}

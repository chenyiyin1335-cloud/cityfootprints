import { useEffect, useState } from "react";
import { api, CheckIn, User, UserStats } from "../api/client";
import { categoryLabel } from "../constants";

interface Props {
  user: User;
  onClose: () => void;
}

export default function ProfileOverlay({ user, onClose }: Props) {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [history, setHistory] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    Promise.all([api.myStats(), api.myCheckIns()])
      .then(([s, h]) => {
        setStats(s);
        setHistory(h);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const remove = async (id: number) => {
    if (!confirm("确定删除这条打卡记录吗？")) return;
    await api.deleteCheckIn(id);
    load();
  };

  return (
    <div className="profile-overlay">
      <div className="profile-header">
        <h2 className="modal-title" style={{ margin: 0 }}>
          {user.nickname || user.username} 的足迹
        </h2>
        <button className="btn btn-ghost" onClick={onClose}>
          返回地图
        </button>
      </div>

      {loading ? (
        <div className="empty-state">加载中...</div>
      ) : (
        <>
          <div className="stats-grid">
            <div className="stats-card">
              <div className="value">{stats?.total_check_ins ?? 0}</div>
              <div className="label">打卡总数</div>
            </div>
            <div className="stats-card">
              <div className="value">{stats?.city_count ?? 0}</div>
              <div className="label">覆盖城市</div>
            </div>
            <div className="stats-card">
              <div className="value">{categoryLabel(stats?.favorite_category)}</div>
              <div className="label">最爱分类</div>
            </div>
          </div>

          <div className="field-label" style={{ margin: "0 0 12px 0" }}>
            打卡记录
          </div>

          <div className="history-list">
            {history.length === 0 ? (
              <div className="empty-state">还没有打卡记录，去地图上探索店铺吧</div>
            ) : (
              history.map((c) => (
                <div className="history-item" key={c.id}>
                  <div className="history-shop">
                    <div className="name">{c.shop_name}</div>
                    {c.comment && <div className="comment">{c.comment}</div>}
                    <div className="checkin-time">{new Date(c.created_at).toLocaleString("zh-CN")}</div>
                  </div>
                  <button className="icon-btn-delete" onClick={() => remove(c.id)}>
                    删除
                  </button>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

import { useState } from "react";
import { api, ApiError, setToken, User } from "../api/client";

interface Props {
  onClose: () => void;
  onLoggedIn: (user: User) => void;
}

export default function AuthModal({ onClose, onLoggedIn }: Props) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(null);
    if (!username || !password) {
      setError("请输入用户名和密码");
      return;
    }
    setLoading(true);
    try {
      const res =
        mode === "login"
          ? await api.login(username, password)
          : await api.register(username, password, nickname || undefined);
      setToken(res.access_token);
      onLoggedIn(res.user);
      onClose();
    } catch (e) {
      const msg = e instanceof ApiError ? String(e.detail) : "操作失败，请稍后重试";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box panel" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">{mode === "login" ? "欢迎回来" : "创建账号"}</h2>

        <label className="field-label">用户名</label>
        <input
          className="field-input"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="请输入用户名"
        />

        {mode === "register" && (
          <>
            <label className="field-label">昵称（选填）</label>
            <input
              className="field-input"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="展示给其他用户看的名字"
            />
          </>
        )}

        <label className="field-label">密码</label>
        <input
          className="field-input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="至少 6 位"
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />

        {error && <div className="error-text">{error}</div>}

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>
            取消
          </button>
          <button className="btn btn-primary" onClick={submit} disabled={loading}>
            {loading ? "处理中..." : mode === "login" ? "登录" : "注册"}
          </button>
        </div>

        <p style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: "var(--color-medium-grey)" }}>
          {mode === "login" ? "还没有账号？" : "已经有账号？"}
          <a
            style={{ color: "var(--color-accent)", cursor: "pointer", marginLeft: 6 }}
            onClick={() => setMode(mode === "login" ? "register" : "login")}
          >
            {mode === "login" ? "去注册" : "去登录"}
          </a>
        </p>
      </div>
    </div>
  );
}

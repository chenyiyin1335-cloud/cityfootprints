import { api } from "../api/client"
import { api, ApiError, resolveAssetUrl, Shop } from "../api/client";

interface Props {
  shop: Shop;
  userLocation: [number, number] | null;
  maxDistanceMeters?: number;
  onClose: () => void;
  onSuccess: () => void;
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dPhi = toRad(lat2 - lat1);
  const dLambda = toRad(lng2 - lng1);
  const a =
    Math.sin(dPhi / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLambda / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const MAX_IMAGES = 9;

export default function CheckInModal({
  shop,
  userLocation,
  maxDistanceMeters = 50,
  onClose,
  onSuccess,
}: Props) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const distance = useMemo(() => {
    if (!userLocation) return null;
    return haversine(userLocation[0], userLocation[1], shop.latitude, shop.longitude);
  }, [userLocation, shop]);

  const canCheckIn = distance !== null && distance <= maxDistanceMeters;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const remaining = MAX_IMAGES - images.length;
    const toUpload = Array.from(files).slice(0, remaining);
    setUploading(true);
    setError(null);
    try {
      for (const file of toUpload) {
        const res = await api.uploadImage(file);
        setImages((prev) => [...prev, res.url]);
      }
    } catch {
      setError("图片上传失败，请重试");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const removeImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const submit = async () => {
    if (!userLocation) {
      setError("无法获取您的当前位置，请授权定位后重试");
      return;
    }
    if (!canCheckIn) {
      setError("距离店铺过远，无法打卡");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.checkIn({
        shop_id: shop.id,
        lat: userLocation[0],
        lng: userLocation[1],
        images,
        rating,
        comment: comment || undefined,
      });
      onSuccess();
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? typeof e.detail === "object"
            ? e.detail.message
            : String(e.detail)
          : "打卡失败，请稍后重试";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box panel" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">打卡 · {shop.name}</h2>

        {distance !== null ? (
          <div className={`distance-hint ${canCheckIn ? "ok" : "far"}`}>
            {canCheckIn
              ? `您距离店铺约 ${distance.toFixed(0)} 米，可以打卡`
              : `您距离店铺约 ${distance.toFixed(0)} 米，需在 ${maxDistanceMeters} 米范围内才能打卡`}
          </div>
        ) : (
          <div className="distance-hint far">正在获取您的位置...</div>
        )}

        <label className="field-label">评分</label>
        <div className="rating-stars">
          {[1, 2, 3, 4, 5].map((n) => (
            <span
              key={n}
              className={`star ${n <= rating ? "filled" : ""}`}
              onClick={() => setRating(n)}
            >
              ★
            </span>
          ))}
        </div>

        <label className="field-label">评价（选填，最多 500 字）</label>
        <textarea
          className="field-textarea"
          maxLength={500}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="分享一下这次打卡的体验吧"
        />

        <label className="field-label">照片（最多 {MAX_IMAGES} 张）</label>
        <div className="upload-grid">
          {images.map((url, idx) => (
            <div className="upload-slot" key={url}>
              <img src={resolveAssetUrl(url)} alt="" />
              <div className="remove-btn" onClick={() => removeImage(idx)}>
                ×
              </div>
            </div>
          ))}
          {images.length < MAX_IMAGES && (
            <label className="upload-slot">
              {uploading ? "..." : "+"}
              <input
                type="file"
                accept="image/*"
                multiple
                style={{ display: "none" }}
                onChange={handleFileSelect}
                disabled={uploading}
              />
            </label>
          )}
        </div>

        {error && <div className="error-text">{error}</div>}

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>
            取消
          </button>
          <button
            className="btn btn-primary"
            onClick={submit}
            disabled={!canCheckIn || submitting}
          >
            {submitting ? "提交中..." : "确认打卡"}
          </button>
        </div>
      </div>
    </div>
  );
}

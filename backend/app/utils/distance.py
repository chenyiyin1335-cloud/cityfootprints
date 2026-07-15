"""
LBS 距离校验工具
按需求文档 4.3.A：打卡时校验用户当前位置与店铺坐标的距离（Haversine 公式）。
"""
import math


def haversine_distance_meters(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """计算两个经纬度坐标之间的球面距离，单位：米"""
    R = 6371000.0  # 地球平均半径（米）
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lng2 - lng1)

    a = (
        math.sin(d_phi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

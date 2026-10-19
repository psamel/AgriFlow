# AgriFlow C Engine ctypes Interface
import ctypes
import os
import threading
from typing import Dict, Any, List, Optional, Tuple

# Locate agriflow shared library (.dll on Windows, .so on Linux)
_BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_DLL_PATH = os.path.join(_BASE_DIR, "bin", "agriflow.dll")
if not os.path.exists(_DLL_PATH):
    _DLL_PATH = os.path.join(_BASE_DIR, "bin", "agriflow.so")

if not os.path.exists(_DLL_PATH):
    raise FileNotFoundError(f"AgriFlow shared library not found at: {_DLL_PATH}")

_lib = ctypes.CDLL(_DLL_PATH)

# Synchronization lock for C engine thread safety
_lock = threading.Lock()

MAX_PLOTS = 25000

# C Structures
class CPlot(ctypes.Structure):
    _fields_ = [
        ("plotId", ctypes.c_int),
        ("x", ctypes.c_double),
        ("y", ctypes.c_double),
        ("soilMoisture", ctypes.c_double),
        ("rainForecastMM", ctypes.c_double),
        ("daysSinceIrrigation", ctypes.c_int),
        ("active", ctypes.c_int),
    ]

class CApiScheduleItem(ctypes.Structure):
    _fields_ = [
        ("plotId", ctypes.c_int),
        ("x", ctypes.c_double),
        ("y", ctypes.c_double),
        ("soilMoisture", ctypes.c_double),
        ("rainForecastMM", ctypes.c_double),
        ("daysSinceIrrigation", ctypes.c_int),
        ("urgencyScore", ctypes.c_double),
        ("waterAllocated", ctypes.c_double),
        ("served", ctypes.c_int),
    ]

class CScheduleSummary(ctypes.Structure):
    _fields_ = [
        ("totalMatched", ctypes.c_int),
        ("plotsServed", ctypes.c_int),
        ("plotsUnserved", ctypes.c_int),
        ("initialBudget", ctypes.c_double),
        ("waterAllocated", ctypes.c_double),
        ("remainingBudget", ctypes.c_double),
    ]

class CApiSystemStats(ctypes.Structure):
    _fields_ = [
        ("totalPlots", ctypes.c_int),
        ("activePlots", ctypes.c_int),
        ("inactivePlots", ctypes.c_int),
        ("avgMoisture", ctypes.c_double),
        ("needsAttentionCount", ctypes.c_int),
        ("qtNodeCount", ctypes.c_int),
        ("qtLeafCount", ctypes.c_int),
        ("qtMaxDepth", ctypes.c_int),
        ("qtPlotsIndexed", ctypes.c_int),
        ("hashCount", ctypes.c_int),
        ("hashLongestChain", ctypes.c_int),
        ("hashLoadFactor", ctypes.c_double),
    ]

# C Function Signatures
_lib.api_init.argtypes = []
_lib.api_init.restype = None

_lib.api_reset.argtypes = []
_lib.api_reset.restype = None

_lib.api_cleanup.argtypes = []
_lib.api_cleanup.restype = None

_lib.api_load_samples.argtypes = [ctypes.c_int, ctypes.c_uint]
_lib.api_load_samples.restype = ctypes.c_int

_lib.api_add_plot.argtypes = [
    ctypes.c_int, ctypes.c_double, ctypes.c_double,
    ctypes.c_double, ctypes.c_double, ctypes.c_int,
    ctypes.c_char_p, ctypes.c_int
]
_lib.api_add_plot.restype = ctypes.c_int

_lib.api_get_plot_by_id.argtypes = [
    ctypes.c_int, ctypes.POINTER(CPlot), ctypes.POINTER(ctypes.c_double)
]
_lib.api_get_plot_by_id.restype = ctypes.c_int

_lib.api_get_all_plots.argtypes = [
    ctypes.POINTER(CPlot), ctypes.POINTER(ctypes.c_double), ctypes.c_int, ctypes.POINTER(ctypes.c_int)
]
_lib.api_get_all_plots.restype = ctypes.c_int

_lib.api_delete_plot.argtypes = [ctypes.c_int]
_lib.api_delete_plot.restype = ctypes.c_int

_lib.api_range_query.argtypes = [
    ctypes.c_double, ctypes.c_double, ctypes.c_double, ctypes.c_double,
    ctypes.POINTER(CPlot), ctypes.POINTER(ctypes.c_double), ctypes.c_int, ctypes.POINTER(ctypes.c_int),
    ctypes.c_char_p, ctypes.c_int
]
_lib.api_range_query.restype = ctypes.c_int

_lib.api_update_sensor.argtypes = [
    ctypes.c_int, ctypes.c_double, ctypes.c_double,
    ctypes.POINTER(ctypes.c_double), ctypes.POINTER(ctypes.c_double),
    ctypes.c_char_p, ctypes.c_int
]
_lib.api_update_sensor.restype = ctypes.c_int

_lib.api_schedule_irrigation.argtypes = [
    ctypes.c_double, ctypes.c_double, ctypes.c_double, ctypes.c_double,
    ctypes.c_double,
    ctypes.POINTER(CApiScheduleItem), ctypes.c_int, ctypes.POINTER(ctypes.c_int),
    ctypes.POINTER(CScheduleSummary),
    ctypes.c_char_p, ctypes.c_int
]
_lib.api_schedule_irrigation.restype = ctypes.c_int

_lib.api_get_system_stats.argtypes = [ctypes.POINTER(CApiSystemStats)]
_lib.api_get_system_stats.restype = None

_lib.api_setup_walkthrough.argtypes = []
_lib.api_setup_walkthrough.restype = None

# Initial engine setup
with _lock:
    _lib.api_init()

def _plot_to_dict(p: CPlot, score: Optional[float] = None) -> Dict[str, Any]:
    res = {
        "plotId": p.plotId,
        "x": round(p.x, 2),
        "y": round(p.y, 2),
        "soilMoisture": round(p.soilMoisture, 2),
        "rainForecastMM": round(p.rainForecastMM, 2),
        "daysSinceIrrigation": p.daysSinceIrrigation,
        "active": bool(p.active),
    }
    if score is not None:
        res["urgencyScore"] = round(score, 2)
    else:
        res["urgencyScore"] = round(p.soilMoisture + (p.rainForecastMM * 0.5) - (p.daysSinceIrrigation * 2.0), 2)
    return res

# Python Wrapper Functions
def engine_init():
    with _lock:
        _lib.api_init()

def engine_reset():
    with _lock:
        _lib.api_reset()

def engine_load_samples(count: int, seed: int = 42) -> int:
    with _lock:
        return _lib.api_load_samples(count, seed)

def engine_add_plot(plot_id: int, x: float, y: float, moisture: float, rain: float, days_overdue: int) -> Tuple[bool, str]:
    err_buf = ctypes.create_string_buffer(256)
    with _lock:
        res = _lib.api_add_plot(plot_id, x, y, moisture, rain, days_overdue, err_buf, len(err_buf))
    return (res == 1, err_buf.value.decode('utf-8', errors='ignore'))

def engine_get_plot_by_id(plot_id: int) -> Optional[Dict[str, Any]]:
    plot = CPlot()
    score = ctypes.c_double()
    with _lock:
        res = _lib.api_get_plot_by_id(plot_id, ctypes.byref(plot), ctypes.byref(score))
    if res == 1:
        return _plot_to_dict(plot, score.value)
    return None

def engine_get_all_plots(max_plots: int = 1000) -> List[Dict[str, Any]]:
    plots_arr = (CPlot * max_plots)()
    scores_arr = (ctypes.c_double * max_plots)()
    count = ctypes.c_int(0)
    with _lock:
        _lib.api_get_all_plots(plots_arr, scores_arr, max_plots, ctypes.byref(count))
    return [_plot_to_dict(plots_arr[i], scores_arr[i]) for i in range(count.value)]

def engine_delete_plot(plot_id: int) -> bool:
    with _lock:
        res = _lib.api_delete_plot(plot_id)
    return res == 1

def engine_range_query(x_min: float, y_min: float, x_max: float, y_max: float, max_plots: int = 1000) -> Tuple[List[Dict[str, Any]], str]:
    plots_arr = (CPlot * max_plots)()
    scores_arr = (ctypes.c_double * max_plots)()
    count = ctypes.c_int(0)
    err_buf = ctypes.create_string_buffer(256)
    with _lock:
        res = _lib.api_range_query(x_min, y_min, x_max, y_max, plots_arr, scores_arr, max_plots, ctypes.byref(count), err_buf, len(err_buf))
    if res == 0:
        return [], err_buf.value.decode('utf-8', errors='ignore')
    return [_plot_to_dict(plots_arr[i], scores_arr[i]) for i in range(count.value)], ""

def engine_update_sensor(plot_id: int, moisture: float, rain: float) -> Tuple[bool, Optional[float], Optional[float], str]:
    old_score = ctypes.c_double()
    new_score = ctypes.c_double()
    err_buf = ctypes.create_string_buffer(256)
    with _lock:
        res = _lib.api_update_sensor(plot_id, moisture, rain, ctypes.byref(old_score), ctypes.byref(new_score), err_buf, len(err_buf))
    if res == 1:
        return True, round(old_score.value, 2), round(new_score.value, 2), ""
    return False, None, None, err_buf.value.decode('utf-8', errors='ignore')

def engine_schedule_irrigation(x_min: float, y_min: float, x_max: float, y_max: float, water_budget: float, max_items: int = 1000) -> Tuple[Optional[Dict[str, Any]], str]:
    items_arr = (CApiScheduleItem * max_items)()
    item_count = ctypes.c_int(0)
    summary = CScheduleSummary()
    err_buf = ctypes.create_string_buffer(256)
    with _lock:
        res = _lib.api_schedule_irrigation(
            x_min, y_min, x_max, y_max, water_budget,
            items_arr, max_items, ctypes.byref(item_count),
            ctypes.byref(summary),
            err_buf, len(err_buf)
        )
    if res == 0:
        return None, err_buf.value.decode('utf-8', errors='ignore')

    items = []
    for i in range(item_count.value):
        it = items_arr[i]
        items.append({
            "rank": i + 1,
            "plotId": it.plotId,
            "x": round(it.x, 2),
            "y": round(it.y, 2),
            "soilMoisture": round(it.soilMoisture, 2),
            "rainForecastMM": round(it.rainForecastMM, 2),
            "daysSinceIrrigation": it.daysSinceIrrigation,
            "urgencyScore": round(it.urgencyScore, 2),
            "waterAllocated": round(it.waterAllocated, 2),
            "served": bool(it.served)
        })

    result = {
        "summary": {
            "totalMatched": summary.totalMatched,
            "plotsServed": summary.plotsServed,
            "plotsUnserved": summary.plotsUnserved,
            "initialBudget": round(summary.initialBudget, 2),
            "waterAllocated": round(summary.waterAllocated, 2),
            "remainingBudget": round(summary.remainingBudget, 2)
        },
        "items": items
    }
    return result, ""

def engine_get_system_stats() -> Dict[str, Any]:
    stats = CApiSystemStats()
    with _lock:
        _lib.api_get_system_stats(ctypes.byref(stats))
    return {
        "plots": {
            "total": stats.totalPlots,
            "active": stats.activePlots,
            "inactive": stats.inactivePlots,
            "avgMoisture": round(stats.avgMoisture, 2),
            "needsAttention": stats.needsAttentionCount
        },
        "quadTree": {
            "nodeCount": stats.qtNodeCount,
            "leafCount": stats.qtLeafCount,
            "branchCount": stats.qtNodeCount - stats.qtLeafCount,
            "maxDepth": stats.qtMaxDepth,
            "plotsIndexed": stats.qtPlotsIndexed
        },
        "hashMap": {
            "bucketSize": 4099,
            "count": stats.hashCount,
            "longestChain": stats.hashLongestChain,
            "loadFactor": round(stats.hashLoadFactor, 4)
        },
        "minHeap": {
            "type": "Binary Min-Heap",
            "rule": "Lower score = higher priority",
            "waterPerPlot": 10.0
        }
    }

def engine_setup_walkthrough():
    with _lock:
        _lib.api_setup_walkthrough()

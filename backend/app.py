# AgriFlow Flask REST API
import os
import time
from datetime import datetime
from flask import Flask, jsonify, request
from flask_cors import CORS
import backend.agriflow_core as core

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# In-memory recent activity log for user actions
recent_activity = []

def log_activity(action: str, details: str):
    recent_activity.insert(0, {
        "id": int(time.time() * 1000),
        "timestamp": datetime.now().strftime("%H:%M:%S"),
        "action": action,
        "details": details
    })
    if len(recent_activity) > 30:
        recent_activity.pop()

# Initial seed data for first launch
def initialize_default_dataset():
    stats = core.engine_get_system_stats()
    if stats["plots"]["active"] == 0:
        added = core.engine_load_samples(35, seed=42)
        log_activity("System Initialized", f"Loaded {added} simulated sugarcane plots across 100x100 field")

initialize_default_dataset()

# Health Check
@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({
        "status": "healthy",
        "service": "AgriFlow Backend C Engine API",
        "academicContext": "KJS-AGR-01 Sugarcane Irrigation Advisory System",
        "timestamp": datetime.now().isoformat()
    })

# Overview Dashboard Metrics
@app.route("/api/overview", methods=["GET"])
def get_overview():
    stats = core.engine_get_system_stats()
    all_plots = core.engine_get_all_plots(max_plots=25000)

    # Moisture distribution buckets: [0-20), [20-40), [40-60), [60-80), [80-100]
    buckets = [
        {"range": "0-20%", "label": "Severe (<20%)", "count": 0},
        {"range": "20-40%", "label": "Low (20-40%)", "count": 0},
        {"range": "40-60%", "label": "Moderate (40-60%)", "count": 0},
        {"range": "60-80%", "label": "Adequate (60-80%)", "count": 0},
        {"range": "80-100%", "label": "High (>80%)", "count": 0},
    ]
    for p in all_plots:
        m = p["soilMoisture"]
        if m < 20.0:
            buckets[0]["count"] += 1
        elif m < 40.0:
            buckets[1]["count"] += 1
        elif m < 60.0:
            buckets[2]["count"] += 1
        elif m < 80.0:
            buckets[3]["count"] += 1
        else:
            buckets[4]["count"] += 1

    # Top 5 highest priority plots (lowest urgency score)
    sorted_plots = sorted(all_plots, key=lambda x: (x["urgencyScore"], x["plotId"]))
    top_priority = sorted_plots[:5]

    return jsonify({
        "stats": stats,
        "moistureDistribution": buckets,
        "topPriorityPlots": top_priority,
        "recentActivity": recent_activity[:8],
        "defaultWaterBudget": 100.0
    })

# Plot Management: List Plots
@app.route("/api/plots", methods=["GET"])
def get_plots():
    limit = request.args.get("limit", default=1000, type=int)
    plots = core.engine_get_all_plots(max_plots=limit)
    return jsonify({
        "count": len(plots),
        "plots": plots
    })

# Plot Management: Add Plot
@app.route("/api/plots", methods=["POST"])
def add_plot():
    data = request.get_json() or {}
    try:
        plot_id = int(data.get("plotId"))
        x = float(data.get("x"))
        y = float(data.get("y"))
        moisture = float(data.get("soilMoisture"))
        rain = float(data.get("rainForecastMM", 0.0))
        days = int(data.get("daysSinceIrrigation", 0))
    except (ValueError, TypeError) as e:
        return jsonify({"error": f"Invalid input format: {str(e)}"}), 400

    success, err_msg = core.engine_add_plot(plot_id, x, y, moisture, rain, days)
    if not success:
        return jsonify({"error": err_msg}), 400

    plot = core.engine_get_plot_by_id(plot_id)
    log_activity("Plot Added", f"Plot #{plot_id} at ({x:.1f}, {y:.1f}) with moisture {moisture:.1f}%")
    return jsonify({
        "message": f"Plot {plot_id} successfully registered in plot pool, Quad-Tree, and Hash Map.",
        "plot": plot
    }), 201

# Plot Management: Lookup Plot by ID
@app.route("/api/plots/<int:plot_id>", methods=["GET"])
def get_plot_by_id(plot_id: int):
    plot = core.engine_get_plot_by_id(plot_id)
    if not plot:
        return jsonify({"error": f"Plot ID {plot_id} not found in Hash Map or is deleted."}), 404
    return jsonify({"plot": plot})

# Plot Management: Delete Plot
@app.route("/api/plots/<int:plot_id>", methods=["DELETE"])
def delete_plot(plot_id: int):
    success = core.engine_delete_plot(plot_id)
    if not success:
        return jsonify({"error": f"Cannot delete: Plot ID {plot_id} does not exist or already inactive."}), 404
    log_activity("Plot Deleted", f"Plot #{plot_id} marked inactive and removed from Hash Map")
    return jsonify({"message": f"Plot {plot_id} successfully deleted."})

# Key-Value Index: Apply Sensor Reading
@app.route("/api/sensor-reading", methods=["POST"])
def update_sensor():
    data = request.get_json() or {}
    try:
        plot_id = int(data.get("plotId"))
        moisture = float(data.get("soilMoisture"))
        rain = float(data.get("rainForecastMM", 0.0))
    except (ValueError, TypeError) as e:
        return jsonify({"error": f"Invalid sensor readings format: {str(e)}"}), 400

    success, old_score, new_score, err_msg = core.engine_update_sensor(plot_id, moisture, rain)
    if not success:
        return jsonify({"error": err_msg}), 400

    plot = core.engine_get_plot_by_id(plot_id)
    log_activity("Sensor Reading Applied", f"Plot #{plot_id}: Moisture {moisture:.1f}%, Score {old_score:.2f} -> {new_score:.2f}")
    return jsonify({
        "message": f"Sensor update applied in O(1) via Hash Map to central plot pool.",
        "plotId": plot_id,
        "oldUrgencyScore": old_score,
        "newUrgencyScore": new_score,
        "plot": plot
    })

# Spatial Index: Quad-Tree Range Query
@app.route("/api/spatial-query", methods=["POST"])
def spatial_query():
    data = request.get_json() or {}
    try:
        x_min = float(data.get("xMin", 0.0))
        y_min = float(data.get("yMin", 0.0))
        x_max = float(data.get("xMax", 100.0))
        y_max = float(data.get("yMax", 100.0))
    except (ValueError, TypeError) as e:
        return jsonify({"error": f"Invalid zone coordinates: {str(e)}"}), 400

    plots, err_msg = core.engine_range_query(x_min, y_min, x_max, y_max)
    if err_msg:
        return jsonify({"error": err_msg}), 400

    log_activity("Spatial Range Query", f"Zone [{x_min:.1f}, {y_min:.1f}] to [{x_max:.1f}, {y_max:.1f}] -> {len(plots)} plots matched")
    return jsonify({
        "zone": {"xMin": x_min, "yMin": y_min, "xMax": x_max, "yMax": y_max},
        "matchedCount": len(plots),
        "plots": plots
    })

# Priority Queue: Min-Heap Irrigation Scheduler
@app.route("/api/schedule", methods=["POST"])
def schedule_irrigation():
    data = request.get_json() or {}
    try:
        x_min = float(data.get("xMin", 0.0))
        y_min = float(data.get("yMin", 0.0))
        x_max = float(data.get("xMax", 100.0))
        y_max = float(data.get("yMax", 100.0))
        budget = float(data.get("waterBudget", 100.0))
    except (ValueError, TypeError) as e:
        return jsonify({"error": f"Invalid parameters: {str(e)}"}), 400

    result, err_msg = core.engine_schedule_irrigation(x_min, y_min, x_max, y_max, budget)
    if err_msg:
        return jsonify({"error": err_msg}), 400

    summary = result["summary"]
    log_activity("Schedule Generated", f"Zone [{x_min:.0f}, {y_min:.0f}]-[{x_max:.0f}, {y_max:.0f}], Budget {budget:.0f}u -> Served {summary['plotsServed']}/{summary['totalMatched']} plots")
    return jsonify(result)

# Telemetry: Data Structure Statistics
@app.route("/api/statistics", methods=["GET"])
def get_statistics():
    stats = core.engine_get_system_stats()
    return jsonify(stats)

# Dataset Reset and Seeding
@app.route("/api/reset", methods=["POST"])
def reset_dataset():
    core.engine_reset()
    log_activity("System Reset", "Cleared all plots and re-initialized Quad-Tree and Hash Map")
    return jsonify({"message": "Dataset successfully cleared and re-initialized."})

@app.route("/api/seed", methods=["POST"])
def seed_dataset():
    data = request.get_json() or {}
    count = int(data.get("count", 35))
    seed = int(data.get("seed", 42))
    added = core.engine_load_samples(count, seed)
    log_activity("Sample Data Loaded", f"Generated {added} synthetic sugarcane plots (Seed: {seed})")
    return jsonify({
        "message": f"Successfully loaded {added} plots into system.",
        "count": added
    })

# Walkthrough Demo Execution
@app.route("/api/walkthrough/run", methods=["POST"])
def run_walkthrough():
    # Setup isolated 6-plot testbed
    core.engine_setup_walkthrough()

    # Step 1: Initial query & schedule for zone [0,0] to [50,50], budget = 30.0
    zone = {"xMin": 0.0, "yMin": 0.0, "xMax": 50.0, "yMax": 50.0}
    budget = 30.0

    step1_query_plots, _ = core.engine_range_query(0.0, 0.0, 50.0, 50.0)
    step1_schedule, _ = core.engine_schedule_irrigation(0.0, 0.0, 50.0, 50.0, budget)

    # Step 2: Live sensor update on P2 (plotId 1042): moisture 42.0 -> 15.0, rain 0.0
    p2_before = core.engine_get_plot_by_id(1042)
    ok, p2_old_score, p2_new_score, _ = core.engine_update_sensor(1042, 15.0, 0.0)
    p2_after = core.engine_get_plot_by_id(1042)

    # Step 3: Regenerate schedule with updated score
    step3_schedule, _ = core.engine_schedule_irrigation(0.0, 0.0, 50.0, 50.0, budget)

    all_plots = core.engine_get_all_plots(max_plots=10)

    log_activity("Walkthrough Demo", "Executed 6-plot academic walkthrough experiment")

    return jsonify({
        "allPlots": all_plots,
        "zone": zone,
        "budget": budget,
        "step1": {
            "title": "Initial Spatial Query & Urgency Scheduling",
            "matchedPlots": step1_query_plots,
            "schedule": step1_schedule,
            "expectedOrder": [1001, 1003, 1042],
            "description": "Quad-Tree prunes out-of-zone plots P4, P5, P6. P1 (score 8.00) and P3 (score 19.00) rank ahead of P2 (score 40.00)."
        },
        "step2": {
            "title": "Live Sensor Reading Arrives for P2 (Plot 1042)",
            "plotBefore": p2_before,
            "plotAfter": p2_after,
            "oldScore": p2_old_score,
            "newScore": p2_new_score,
            "description": "Afternoon heat drops soil moisture from 42.0% to 15.0%. Sensor reading applied via Hash Map in O(1) time. Urgency score recalculates to 13.00."
        },
        "step3": {
            "title": "Regenerated Irrigation Schedule",
            "schedule": step3_schedule,
            "expectedOrder": [1001, 1042, 1003],
            "description": "Min-Heap re-sifts items. P2 (score 13.00) now jumps ahead of P3 (score 19.00) to claim priority rank #2!"
        }
    })

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)

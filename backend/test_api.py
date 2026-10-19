# Automated Test Suite for AgriFlow Flask API
import unittest
import json
from backend.app import app
import backend.agriflow_core as core

class TestAgriFlowAPI(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()
        core.engine_reset()

    def test_01_health_check(self):
        resp = self.client.get("/api/health")
        self.assertEqual(resp.status_code, 200)
        data = resp.get_json()
        self.assertEqual(data["status"], "healthy")

    def test_02_seed_and_overview(self):
        resp = self.client.post("/api/seed", json={"count": 20, "seed": 99})
        self.assertEqual(resp.status_code, 200)
        
        resp = self.client.get("/api/overview")
        self.assertEqual(resp.status_code, 200)
        data = resp.get_json()
        self.assertEqual(data["stats"]["plots"]["active"], 20)
        self.assertEqual(len(data["moistureDistribution"]), 5)

    def test_03_plot_crud_and_duplicate_prevention(self):
        # Add new plot
        new_plot = {
            "plotId": 8001,
            "x": 25.5,
            "y": 45.0,
            "soilMoisture": 22.0,
            "rainForecastMM": 0.0,
            "daysSinceIrrigation": 4
        }
        resp = self.client.post("/api/plots", json=new_plot)
        self.assertEqual(resp.status_code, 201)
        data = resp.get_json()
        self.assertEqual(data["plot"]["plotId"], 8001)
        # Urgency: 22.0 + 0 - (4 * 2) = 14.0
        self.assertAlmostEqual(data["plot"]["urgencyScore"], 14.0, places=1)

        # Duplicate ID should be rejected
        resp_dup = self.client.post("/api/plots", json=new_plot)
        self.assertEqual(resp_dup.status_code, 400)
        self.assertIn("already exists", resp_dup.get_json()["error"])

        # Lookup by ID
        resp_get = self.client.get("/api/plots/8001")
        self.assertEqual(resp_get.status_code, 200)
        self.assertEqual(resp_get.get_json()["plot"]["plotId"], 8001)

        # Delete plot
        resp_del = self.client.delete("/api/plots/8001")
        self.assertEqual(resp_del.status_code, 200)

        # Lookup deleted plot should return 404
        resp_get_after = self.client.get("/api/plots/8001")
        self.assertEqual(resp_get_after.status_code, 404)

    def test_04_sensor_reading_update(self):
        core.engine_add_plot(9001, 10.0, 10.0, 50.0, 10.0, 1) # score: 50 + 5 - 2 = 53.0
        resp = self.client.post("/api/sensor-reading", json={
            "plotId": 9001,
            "soilMoisture": 12.0,
            "rainForecastMM": 0.0
        })
        self.assertEqual(resp.status_code, 200)
        data = resp.get_json()
        self.assertAlmostEqual(data["oldUrgencyScore"], 53.0, places=1)
        # new score: 12.0 + 0 - 2 = 10.0
        self.assertAlmostEqual(data["newUrgencyScore"], 10.0, places=1)

    def test_05_quadtree_spatial_query(self):
        core.engine_add_plot(101, 10.0, 10.0, 30.0, 0.0, 2)
        core.engine_add_plot(102, 20.0, 20.0, 30.0, 0.0, 2)
        core.engine_add_plot(103, 80.0, 80.0, 30.0, 0.0, 2)

        resp = self.client.post("/api/spatial-query", json={
            "xMin": 0.0, "yMin": 0.0, "xMax": 50.0, "yMax": 50.0
        })
        self.assertEqual(resp.status_code, 200)
        data = resp.get_json()
        matched_ids = [p["plotId"] for p in data["plots"]]
        self.assertIn(101, matched_ids)
        self.assertIn(102, matched_ids)
        self.assertNotIn(103, matched_ids)

    def test_06_minheap_irrigation_scheduler(self):
        # 3 plots inside zone with different urgency scores
        core.engine_add_plot(201, 10.0, 10.0, 50.0, 0.0, 0) # score 50
        core.engine_add_plot(202, 20.0, 20.0, 10.0, 0.0, 0) # score 10 (highest priority)
        core.engine_add_plot(203, 30.0, 30.0, 30.0, 0.0, 0) # score 30

        # Water budget = 20 units (can only serve 2 plots, 10 units each)
        resp = self.client.post("/api/schedule", json={
            "xMin": 0.0, "yMin": 0.0, "xMax": 50.0, "yMax": 50.0,
            "waterBudget": 20.0
        })
        self.assertEqual(resp.status_code, 200)
        data = resp.get_json()
        items = data["items"]
        summary = data["summary"]

        self.assertEqual(summary["totalMatched"], 3)
        self.assertEqual(summary["plotsServed"], 2)
        self.assertEqual(summary["plotsUnserved"], 1)
        self.assertAlmostEqual(summary["remainingBudget"], 0.0)

        # Min-heap priority order check: 202 (score 10) -> 203 (score 30) -> 201 (score 50)
        self.assertEqual(items[0]["plotId"], 202)
        self.assertTrue(items[0]["served"])
        self.assertEqual(items[1]["plotId"], 203)
        self.assertTrue(items[1]["served"])
        self.assertEqual(items[2]["plotId"], 201)
        self.assertFalse(items[2]["served"])

    def test_07_academic_walkthrough_run(self):
        resp = self.client.post("/api/walkthrough/run")
        self.assertEqual(resp.status_code, 200)
        data = resp.get_json()
        
        step1_ids = [it["plotId"] for it in data["step1"]["schedule"]["items"]]
        self.assertEqual(step1_ids, [1001, 1003, 1042])
        self.assertAlmostEqual(data["step2"]["oldScore"], 40.0, places=1)
        self.assertAlmostEqual(data["step2"]["newScore"], 13.0, places=1)

        step3_ids = [it["plotId"] for it in data["step3"]["schedule"]["items"]]
        self.assertEqual(step3_ids, [1001, 1042, 1003])

    def test_08_statistics(self):
        core.engine_add_plot(501, 12.0, 12.0, 25.0, 0.0, 3)
        resp = self.client.get("/api/statistics")
        self.assertEqual(resp.status_code, 200)
        data = resp.get_json()
        self.assertIn("quadTree", data)
        self.assertIn("hashMap", data)
        self.assertIn("minHeap", data)
        self.assertIn("plots", data)
        self.assertGreater(data["quadTree"]["plotsIndexed"], 0)
        self.assertGreater(data["hashMap"]["count"], 0)

if __name__ == "__main__":
    unittest.main()

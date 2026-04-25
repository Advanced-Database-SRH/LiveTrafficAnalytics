import cv2
import numpy as np
from vidgear.gears import CamGear
from ultralytics import YOLO
import time
import json
import redis

# --- Redis Connection ---
r = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

# --- CONFIGURATION ---
stream = CamGear(source="https://www.youtube.com/watch?v=dfVK7ld38Ys", stream_mode=True).start()
model = YOLO("yolov8n")
tracker_data = {}
BUFFER = 100
last_snapshot_time = time.time()

def get_heading(p1, p2):
    return round(np.degrees(np.arctan2(p2[1] - p1[1], p2[0] - p1[0])), 1)

def get_side(x, y, w, h):
    if x < BUFFER: return "Left"
    if x > w - BUFFER: return "Right"
    if y < BUFFER: return "Top"
    if y > h - BUFFER: return "Bottom"
    return "Center"

try:
    while True:
        frame = stream.read()
        if frame is None: break
        frame = cv2.resize(frame, (1280, 720))
        h, w = frame.shape[:2]

        # results = model.track(frame, persist=True, verbose=False, conf=0.15, iou=0.4)
        results = model.track(
            frame,
            persist=True,
            verbose=False,
            conf=0.15,
            iou=0.4,
            classes=[2, 3, 5, 7]   # car, motorcycle, bus, truck
        )
        boxes = results[0].boxes
        if boxes.id is None: continue

        active_ids = boxes.id.cpu().tolist()
        for vid, box, cls_idx in zip(active_ids, boxes.xyxy.cpu().tolist(), boxes.cls.cpu().tolist()):
            cx, cy = (box[0]+box[2])/2, (box[1]+box[3])/2

            if vid not in tracker_data:
                tracker_data[vid] = {
                    'cls': model.names[int(cls_idx)], 'ent_angle': None,
                    'path': [(cx, cy)], 'ent_time': time.strftime("%H:%M:%S")
                }
            else:
                tracker_data[vid]['path'].append((cx, cy))
                if tracker_data[vid]['ent_angle'] is None and len(tracker_data[vid]['path']) > 5:
                    dist = np.sqrt((cx - tracker_data[vid]['path'][0][0])**2 + (cy - tracker_data[vid]['path'][0][1])**2)
                    if dist > 50:
                        tracker_data[vid]['ent_angle'] = get_heading(tracker_data[vid]['path'][0], (cx, cy))

        for vid in list(tracker_data.keys()):
            if vid not in active_ids:
                data = tracker_data[vid]
                if data['ent_angle'] is not None and len(data['path']) > 15:
                    last_p = data['path'][-1]
                    is_at_edge = (last_p[0] < BUFFER or last_p[0] > w-BUFFER or last_p[1] < BUFFER or last_p[1] > h-BUFFER)
                    if is_at_edge:
                        ext_angle = get_heading(data['path'][-7], last_p)
                        exit_time = time.strftime('%H:%M:%S')

                        # --- Build the event record ---
                        event = {
                            "vehicle_id": int(vid),
                            "class": data['cls'],
                            "entry_angle": data['ent_angle'],
                            "entry_time": data['ent_time'],
                            "exit_angle": ext_angle,
                            "exit_time": exit_time,
                            "timestamp": time.time()
                        }

                        # --- Store in Redis ---
                        # 1. Push to a list (full history log)
                        r.lpush("traffic:events", json.dumps(event))
                        r.ltrim("traffic:events", 0, 999)  # keep last 1000 events

                        # 2. Store latest state per vehicle class (hash)
                        r.hset(f"traffic:latest:{data['cls']}", mapping={
                            "entry_angle": data['ent_angle'],
                            "exit_angle": ext_angle,
                            "exit_time": exit_time
                        })

                        # 3. Increment vehicle count by class
                        r.incr(f"traffic:count:{data['cls']}")

                        print(f"[REDIS ✓] Cat: {data['cls']} | Ent: ({data['ent_angle']}°) at {data['ent_time']} | Ext: ({ext_angle}°) at {exit_time}")

                del tracker_data[vid]

except KeyboardInterrupt:
    stream.stop()
finally:
    stream.stop()
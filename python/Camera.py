import cv2
import numpy as np
from vidgear.gears import CamGear
from ultralytics import YOLO
import time
import json
import redis
import os

script_dir = os.path.dirname(os.path.abspath(__file__))

tracker_path = os.path.join(script_dir, "custom_tracker.yaml")

# --- Redis Connection ---
r = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)
r_img = redis.Redis(host='localhost', port=6379, db=0, decode_responses=False)

# --- CONFIGURATION ---
options={"STREAM_RESOLUTION": "720p"}
stream = CamGear(source="https://www.youtube.com/watch?v=1EiC9bvVGnk", stream_mode=True, logging=False, **options).start()

model = YOLO("yolo26n.pt") 
tracker_data = {}
BUFFER = 100

def get_heading(p1, p2):
    return round(np.degrees(np.arctan2(p1[1] - p2[1], p2[0] - p1[0])), 1)

def get_side(x, y, w, h):
    if x < BUFFER: return "Left"
    if x > w - BUFFER: return "Right"
    if y < BUFFER: return "Top"
    if y > h - BUFFER: return "Bottom"
    return "Center"

def predict_exit_side(angle):
    if angle is None: 
        return "Center"
    if -45 <= angle <= 45: return "Right"
    elif 45 < angle < 135: return "Top"
    elif angle >= 135 or angle <= -135: return "Left"
    elif -135 < angle < -45: return "Bottom"
    return "Center"

frame_count = 0 

try:
    while True:
        frame = stream.read()
        if frame is None: break
        # Processes every other frame (halves processing load).
        frame_count += 1
        if frame_count % 4 != 0:
            continue

        
        h, w = frame.shape[:2]
        current_time = time.time()

        results = model.track(
            frame,
            persist=True,
            #tracker="bytetrack.yaml", 
            tracker=tracker_path,
            verbose=False,
            conf=0.15,
            iou=0.4,
            classes=[2, 3, 5, 7]
        )
        
        annotated_frame = results[0].plot(conf=False)
        display_frame = cv2.resize(annotated_frame, (0, 0), fx=0.5, fy=0.5)
        cv2.imshow("Live Traffic Stream", display_frame)
        
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

        boxes = results[0].boxes
        
        if boxes.id is not None:
            active_ids = boxes.id.cpu().tolist()
            
            for vid, box, cls_idx in zip(active_ids, boxes.xyxy.cpu().tolist(), boxes.cls.cpu().tolist()):
                cx, cy = (box[0]+box[2])/2, (box[1]+box[3])/2

                if vid not in tracker_data:
                    tracker_data[vid] = {
                        'cls': model.names[int(cls_idx)], 
                        'ent_angle': None,
                        'ent_side': get_side(cx, cy, w, h), 
                        'path': [(cx, cy)], 
                        'ent_time': time.strftime("%H:%M:%S"),
                        'missing_frames': 0  # Initialize grace period timer
                    }
                else:
                    tracker_data[vid]['path'].append((cx, cy))
                    tracker_data[vid]['missing_frames'] = 0 
                    
                    if tracker_data[vid]['ent_angle'] is None and len(tracker_data[vid]['path']) > 3:
                        dist_sq = (cx - tracker_data[vid]['path'][0][0])**2 + (cy - tracker_data[vid]['path'][0][1])**2
                        if dist_sq > 100: #(10 pixels of movement)
                            tracker_data[vid]['ent_angle'] = get_heading(tracker_data[vid]['path'][0], (cx, cy))
        else:
            active_ids = [] # Screen is empty!

        # --- Grace Period & Exit Logic ---
        for vid in list(tracker_data.keys()):
            if vid not in active_ids:
                tracker_data[vid]['missing_frames'] += 1
                
                # Increased to 60 frames (approx 2 seconds) to outlast ByteTrack's internal memory
                if tracker_data[vid]['missing_frames'] > 60:
                    data = tracker_data[vid]
                    path_len = len(data['path'])
                    has_angle = data['ent_angle'] is not None
                    last_p = data['path'][-1]

                    if has_angle and path_len > 5:
                        ext_angle = get_heading(data['path'][-min(7, path_len-1)], last_p) 
                        exit_side = predict_exit_side(ext_angle) # Predict where it went!
                        exit_time = time.strftime('%H:%M:%S')
                        current_sec = int(current_time)
                        
                        latest_frame_key = f"traffic:frame:{current_sec}_vid{vid}"
                        
                        success, buffer = cv2.imencode('.jpg', frame)
                        if success:
                            frame_bytes = buffer.tobytes()
                            r_img.setex(latest_frame_key, 3600, frame_bytes)
                            r_img.set("traffic:frame:latest", frame_bytes) 

                        event = {
                            "vehicle_id": int(vid),
                            "class": data['cls'],
                            "entry_side": data['ent_side'],                  
                            "entry_angle": data['ent_angle'],
                            "entry_time": data['ent_time'],
                            "exit_side": exit_side, 
                            "exit_angle": ext_angle,
                            "exit_time": exit_time,
                            "timestamp": current_time,
                            "linked_frame": latest_frame_key                 
                        }

                        try:
                            pipe = r.pipeline()
                            pipe.lpush("traffic:events", json.dumps(event))
                            pipe.ltrim("traffic:events", 0, 999) 
                            pipe.hset(f"traffic:latest:{data['cls']}", mapping={
                                "entry_angle": data['ent_angle'],
                                "exit_angle": ext_angle,
                                "exit_time": exit_time
                            })
                            pipe.incr(f"traffic:count:{data['cls']}")
                            pipe.execute()
                            print(f"[REDIS ✓] SAVED: ID: {vid} | Cat: {data['cls']} | Ent: {data['ent_side']} ({data['ent_angle']}°) | Ext: {exit_side} ({ext_angle}°)")
                        except redis.exceptions.ConnectionError:
                            print("[ERROR] Could not connect to Redis!")

                    # The grace period has completely expired, safe to delete
                    del tracker_data[vid]

except KeyboardInterrupt:
    pass
finally:
    stream.stop()
    cv2.destroyAllWindows()
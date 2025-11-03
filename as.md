---
marp: true
theme: default
class: lead
paginate: true
backgroundColor: #ffffff
color: #000000
style: |
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;700&family=Space+Grotesk:wght@300;400;500;600;700&display=swap');
  
  section {
    background: #ffffff;
    font-family: 'Space Grotesk', 'SF Pro Display', -apple-system, system-ui, sans-serif;
    font-weight: 400;
    padding: 2em;
  }
  h1 { 
    color: #000000; 
    font-size: 2.2em; 
    margin-bottom: 0.5em; 
    font-weight: 700;
    letter-spacing: -0.02em;
  }
  h2 { 
    color: #666666; 
    font-size: 1.4em; 
    margin-bottom: 0.8em; 
    font-weight: 500;
  }
  h3 { 
    color: #000000; 
    font-size: 1.2em; 
    font-weight: 600;
  }
  li { 
    margin: 0.4em 0; 
    font-size: 1.1em; 
    color: #333333;
    line-height: 1.4;
  }
  code { 
    background: #f5f5f5; 
    color: #000000;
    padding: 0.2em 0.4em; 
    border-radius: 4px; 
    font-family: 'JetBrains Mono', 'SF Mono', Consolas, monospace;
    font-size: 0.85em;
    border: 1px solid #e0e0e0;
  }
  pre {
    background: #f8f8f8;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 1em;
    font-family: 'JetBrains Mono', 'SF Mono', Consolas, monospace;
    font-size: 0.75em;
    overflow-x: auto;
  }
  .columns { display: flex; gap: 2em; align-items: flex-start; }
  .col { flex: 1; }
  strong { font-weight: 600; color: #000000; }
  footer { color: #999999; font-size: 0.8em; }
  .center { text-align: center; }
  .vcenter {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 70vh;
  text-align: center;
  }
---

# Centralised system for mapping and navigation

## With Basic SLAM Processing

**Current: Camera → Stream → Computer → 3D mapping-keypoint's generation**

---

# What This Does

## Basic Idea

- ESP32-CAM sends video over WiFi
- Computer receives the stream
- OpenCV processes frames
- ORB-SLAM creates 3D maps
- Multiple cameras can connect to same system

---

# ESP32-CAM Code Setup

## Camera Configuration

```cpp
// Main settings for the camera
config.frame_size = FRAMESIZE_VGA;
config.pixel_format = PIXFORMAT_JPEG;
config.jpeg_quality = 20;  // Lower = better quality
config.fb_count = 2;       // Double buffer
config.xclk_freq_hz = 20000000; // 20MHz stable

if (psramFound()) {
  config.frame_size = FRAMESIZE_QVGA;
  config.fb_count = 2;
  config.jpeg_quality = 32;    
}
```

---

# WiFi Setup

```cpp
// WiFi credentials
const char* WIFI_SSID = "this_statement_is_false";
const char* WIFI_PASSWORD = "cbcool999";

void setup() {
  // Connect to WiFi
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  while (WiFi.status() != WL_CONNECTED) { 
    delay(500); 
    Serial.print("."); 
  }
  
  Serial.printf("IP: %s\n", WiFi.localIP().toString().c_str());
}
```

---

# Stream Handler Code

```cpp
static esp_err_t stream_handler(httpd_req_t *req) {
  httpd_resp_set_type(req, "multipart/x-mixed-replace;boundary=frame");
  
  char part_buf[64];
  while (true) {
    camera_fb_t * fb = esp_camera_fb_get();
    if (!fb) return ESP_FAIL;
    
    // Send frame header
    int hlen = snprintf(part_buf, sizeof(part_buf), 
                       "\r\n--frame\r\nContent-Type: image/jpeg\r\n"
                       "Content-Length: %u\r\n\r\n", fb->len);
    
    httpd_resp_send_chunk(req, part_buf, hlen);
    httpd_resp_send_chunk(req, (const char *)fb->buf, fb->len);
    
    esp_camera_fb_return(fb);
  }
}
```

---

# HTTP Server Setup

```cpp
void start_server() {
  httpd_config_t config = HTTPD_DEFAULT_CONFIG();
  config.server_port = 80;
  
  if (httpd_start(&httpd, &config) == ESP_OK) {
    httpd_uri_t jpg_uri = {
      .uri="/jpg", .method=HTTP_GET, 
      .handler=jpg_handler, .user_ctx=NULL
    };
    httpd_uri_t str_uri = {
      .uri="/stream", .method=HTTP_GET, 
      .handler=stream_handler, .user_ctx=NULL
    };
    httpd_register_uri_handler(httpd, &jpg_uri);
    httpd_register_uri_handler(httpd, &str_uri);
  }
}
```

---

# Python Client Code

```python
import cv2
from python_orb_slam3 import ORBExtractor
cap = cv2.VideoCapture("http://10.116.59.64/stream")
orb_extractor = ORBExtractor()
while True:
    ret, frame = cap.read()
    if not ret:
        print("Failed to grab frame")
        break
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    keypoints, descriptors = orb_extractor.detectAndCompute(gray)
    frame_with_keypoints = cv2.drawKeypoints(
        frame, keypoints, None, color=(0, 255, 0), flags=0
    )
    cv2.imshow('ESP32-CAM Keypoints', frame_with_keypoints)
    if cv2.waitKey(1) & 0xFF == 27:  
        break
cap.release()
cv2.destroyAllWindows()
```

---

# How The Stream Works

## Simple Process

1. ESP32-CAM captures frames continuously
2. Converts to JPEG format
3. Sends as HTTP multipart stream
4. Python script reads with OpenCV
5. ORB extracts features from each frame
6. Display keypoints in real-time

---

# Stream Endpoints
**Single Photo:**
- `http://10.116.59.64/jpg`
- Returns one JPEG image
- Good for testing connection

**Video Stream:**
- `http://10.116.59.64/stream`
- Continuous MJPEG stream
- Use this for SLAM processing
---

# Centralised System Overview

## Multiple Cameras Setup

- Each ESP32-CAM gets its own IP address
- One computer connects to all camera streams
- Process all video feeds at the same time
- Build larger maps using multiple viewpoints

---

# Camera Settings Explained

## Key Parameters

- `FRAMESIZE_VGA`: 640x480 resolution
- `jpeg_quality = 20`: Good balance speed/quality
- `fb_count = 2`: Two frame buffers for smooth streaming  
- `CAMERA_FB_IN_PSRAM`: Use extra memory if available

**Lower quality = faster streaming**
**Higher resolution = more detail but slower**

---

# Common Issues

## Troubleshooting

- **No video**: Check WiFi connection and IP address
- **Slow stream**: Reduce frame size or increase JPEG quality number
- **Poor quality**: Lower JPEG quality number (10-15)
- **Crashes**: Make sure PSRAM is enabled in Arduino IDE
- **Can't connect**: Check firewall and network settings

---

# What ORB Does

## Feature Detection

- Finds corner points in image
- Creates descriptors for each point
- Tracks same points across frames
- Estimates camera movement
- Builds 3D point cloud over time

**ORB = Oriented FAST and Rotated BRIEF**

---

# Simple Applications

## What You Can Build

- **Room mapping**: Walk around with camera, get 3D model
- **Object tracking**: Follow moving objects
- **Navigation**: Robot knows where it is
- **Inspection**: Check structures with drone camera
- **Security**: Monitor areas with multiple cameras

---

# Hardware Requirements

## What You Need

**ESP32-CAM:**
- AI Thinker module recommended
- PSRAM enabled
**Computer:**
- OpenCV installed
- python-orb-slam3 library
- Decent CPU for processing

---

# Next Steps

## Improvements

- Add more ESP32-CAM modules
- Save 3D maps to files
- Use better SLAM algorithms
- Add real-time visualization
- Connect multiple computers

---
<div class="vcenter">
Thank You
</div>
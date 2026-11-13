# Enterprise Sales & Support CRM – Server Deployment & Run Guide
## सर्वर पर प्रोजेक्ट चलाने की सम्पूर्ण गाइड (Start to End Commands)

यह गाइड आपको प्रोजेक्ट को अपने प्रोडक्शन सर्वर (Ubuntu/Linux VPS या Cloud Server) पर शुरू से अंत तक सफलतापूर्वक डिप्लॉय और रन करने के सभी आवश्यक स्टेप्स और कमांड्स प्रदान करती है।

---

## 1. पोर्ट और डेटाबेस की जानकारी (Configuration Summary)

- **Frontend Port:** `3025`
- **Backend Port:** `5010`
- **Backend Health Check:** `http://localhost:5010/health`
- **Backend API URL:** `http://localhost:5010/api/v1`
- **Frontend URL:** `http://localhost:3025`
- **Database:** Microsoft SQL Server 2022 (Remote Host: `72.61.250.183:1433`, Database: `sales_crm`)
  > **Note:** जो `.env` अभी प्रोजेक्ट में सेट है, वही सर्वर पर सीधे काम करेगी क्योंकि डेटाबेस पहले से ही रिमोट सर्वर पर लाइव चल रहा है।

---

## 2. सर्वर पर प्री-रिक्वायरमेंट्स (Server Prerequisites)

सर्वर पर लॉगिन करके (SSH के ज़रिये) यह सुनिश्चित करें कि Node.js 20+, Redis और PM2 इनस्टॉल हैं:

### Step 1: सर्वर पैकेज अपडेट करें और Node.js 20 (LTS) इनस्टॉल करें (Ubuntu / Debian)
```bash
# सर्वर पैकेज अपडेट करें
sudo apt update && sudo apt upgrade -y

# Node.js 20.x LTS रिपॉजिटरी जोड़ें और इनस्टॉल करें
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git build-essential

# Node और npm वर्शन चेक करें
node -v   # v20.x.x होना चाहिए
npm -v    # 10.x.x होना चाहिए
```

### Step 2: Redis इनस्टॉल और स्टार्ट करें
```bash
# Redis इनस्टॉल करें
sudo apt install -y redis-server

# Redis सर्विस स्टार्ट और इनेबल करें
sudo systemctl enable redis-server
sudo systemctl start redis-server

# चेक करें कि Redis चल रहा है
redis-cli ping
# रिप्लाई: PONG
```

### Step 3: PM2 (Process Manager) ग्लोबली इनस्टॉल करें
```bash
sudo npm install -g pm2
```

---

## 3. प्रोजेक्ट सेटअप और बिल्ड (Step-by-Step Commands)

### Step 4: प्रोजेक्ट डायरेक्टरी में जाएं
```bash
cd /path/to/sales-support-crm
# या उदाहरण के लिए:
# cd /var/www/sales-support-crm
```

### Step 5: Backend डिपेंडेंसीज इनस्टॉल और बिल्ड करें
```bash
cd backend

# डिपेंडेंसीज इनस्टॉल करें
npm install

# TypeScript कोड कंपाइल (Build) करें
npm run build

# बिल्ड चेक करें (dist फोल्डर बन गया होगा)
ls -la dist/

cd ..
```

### Step 6: Frontend डिपेंडेंसीज इनस्टॉल और बिल्ड करें
```bash
cd frontend

# डिपेंडेंसीज इनस्टॉल करें
npm install

# Next.js प्रोडक्शन बिल्ड बनाएं
npm run build

cd ..
```

---

## 4. सर्वर पर प्रोजेक्ट स्टार्ट करें (PM2 के ज़रिये)

प्रोजेक्ट के रूट में पहले से ही `ecosystem.config.js` तैयार है। यह एक ही कमांड में Backend (Port 5010) और Frontend (Port 3025) दोनों को बैकग्राउंड में स्टार्ट कर देगा:

### Step 7: PM2 से Backend और Frontend स्टार्ट करें
```bash
# प्रोजेक्ट के रूट फोल्डर से चलाएं:
pm2 start ecosystem.config.js
```

### Step 8: स्टेटस और लॉग्स चेक करें
```bash
# चल रहे ऐप्स का स्टेटस देखें:
pm2 status

# लाइव लॉग्स देखने के लिए:
pm2 logs

# सिर्फ backend के लॉग्स देखने के लिए:
pm2 logs crm-backend

# सिर्फ frontend के लॉग्स देखने के लिए:
pm2 logs crm-frontend
```

### Step 9: सर्वर रीबूट होने पर ऑटो-स्टार्ट इनेबल करें
```bash
# चालू ऐप्स की लिस्ट सेव करें
pm2 save

# सिस्टम बूट स्टार्टअप सर्विस रजिस्टर करें
pm2 startup
# (जो कमांड टर्मिनल पर आउटपुट में आए, उसे कॉपी करके पेस्ट और रन करें)
```

---

## 5. सर्वर पर API और Frontend टेस्ट करने के कमांड्स

### Backend Health Check:
```bash
curl http://localhost:5010/health
# आउटपुट: {"status":"healthy","timestamp":"...","service":"Sales & Support CRM API","version":"1.0.0"}
```

### Admin Login Test:
```bash
curl -X POST http://localhost:5010/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@crm.com","password":"Admin@123456"}'
# आउटपुट: {"success":true,"message":"Login successful","data":{...}}
```

### Frontend Check:
```bash
curl -I http://localhost:3025
# आउटपुट: HTTP/1.1 200 OK (या 307 Redirect to /dashboard or /login)
```

---

## 6. PM2 मैनेजमेंट कमांड्स (रोज़मर्रा के उपयोग के लिए)

| काम | कमांड |
| :--- | :--- |
| **स्टेटस देखना** | `pm2 status` |
| **सभी रीस्टार्ट करना** | `pm2 restart all` |
| **सिर्फ Backend रीस्टार्ट** | `pm2 restart crm-backend` |
| **सिर्फ Frontend रीस्टार्ट** | `pm2 restart crm-frontend` |
| **लॉग्स देखना** | `pm2 logs` |
| **लॉग्स साफ़ करना** | `pm2 flush` |
| **सभी स्टॉप करना** | `pm2 stop all` |
| **रिसोर्स मॉनिटर (CPU/RAM)** | `pm2 monit` |

---

## 7. Nginx रिवर्स प्रॉक्सी सेटअप (वैकल्पिक - डोमेन या पोर्ट 80/443 के लिए)

अगर आप चाहते हैं कि यूज़र को ब्राउज़र में `:3025` न डालना पड़े और वह सीधे डोमेन या सर्वर IP पर खुले, तो Nginx कॉन्फ़िगर करें:

```bash
sudo apt install -y nginx
sudo nano /etc/nginx/sites-available/crm
```

फाइल में नीचे दिया गया कॉन्फ़िगरेशन पेस्ट करें:
```nginx
server {
    listen 80;
    server_name your-server-ip-or-domain;

    # Frontend (Next.js Port 3025)
    location / {
        proxy_pass http://127.0.0.1:3025;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API (Express Port 5010)
    location /api/ {
        proxy_pass http://127.0.0.1:5010;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Socket.IO Real-time Events
    location /socket.io/ {
        proxy_pass http://127.0.0.1:5010;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

Nginx इनेबल और रीलोड करें:
```bash
sudo ln -s /etc/nginx/sites-available/crm /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 8. सारांश (Summary)

1. **Frontend Port:** `3025`
2. **Backend Port:** `5010`
3. **Database:** रिमोट MS SQL Server (`72.61.250.183:1433`) - पहले से पूरी तरह कनेक्टेड और टेस्टेड है।
4. **Login Credentials:** `admin@crm.com` / `Admin@123456`
5. सर्वर पर सिर्फ `cd backend && npm install && npm run build` और `cd ../frontend && npm install && npm run build` चलाकर `pm2 start ecosystem.config.js` चलाना है।


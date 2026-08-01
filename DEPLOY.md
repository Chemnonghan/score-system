# วิธี Deploy ขึ้นอินเทอร์เน็ตผ่าน GitHub (ฟรี)

ทำให้นักเรียนเข้าเว็บได้จากมือถือ/คอมที่ไหนก็ได้ ไม่ต้องอยู่ใน Wi-Fi โรงเรียน โดยใช้ GitHub + Render (มีแผนฟรี)

ผมเตรียมไฟล์ที่จำเป็นให้แล้ว: `Procfile`, `render.yaml`, `.gitignore` และปรับ `app.py`/`requirements.txt` ให้รันบนเซิร์ฟเวอร์จริงได้ (ใช้ waitress แทน dev server ของ Flask)

**สำคัญ:** ก่อนเริ่ม ให้ลบโฟลเดอร์ `.git` ที่อยู่ในโฟลเดอร์ `score-system` ทิ้งก่อน (ถ้ามองไม่เห็น ให้เปิด "แสดงไฟล์ที่ซ่อนอยู่" ใน File Explorer) เพราะเป็นไฟล์ค้างจากการเตรียมงานที่ยังไม่สมบูรณ์

## สิ่งที่ต้องมี

- บัญชี GitHub (สมัครฟรีที่ github.com)
- บัญชี Render (สมัครฟรีที่ render.com ใช้ "Sign up with GitHub" ได้เลย)
- ติดตั้ง Git บนเครื่อง: https://git-scm.com/downloads

## ขั้นตอนที่ 1: อัปโค้ดขึ้น GitHub

เปิด Command Prompt / Terminal แล้ว `cd` เข้าไปที่โฟลเดอร์ `score-system` จากนั้นรันทีละคำสั่ง:

```
git init
git add -A
git commit -m "ระบบแจ้งคะแนนผลการสอบนักเรียน"
```

จากนั้นไปที่ https://github.com/new สร้าง repository ใหม่ (เช่นชื่อ `score-system`) **ไม่ต้อง** ติ๊ก "Add README" หรือไฟล์ใดๆ ในหน้าเว็บ (เรามีไฟล์อยู่แล้ว) กด Create

หน้าที่ได้จะมีคำสั่งให้คัดลอก ให้รันต่อ (แทน `<your-username>` และ `<repo-name>` ด้วยของจริงจากหน้า GitHub):

```
git branch -M main
git remote add origin https://github.com/<your-username>/<repo-name>.git
git push -u origin main
```

ระบบจะถามชื่อผู้ใช้/รหัสผ่าน GitHub (หรือ token) — ทำตามที่ GitHub แนะนำ

## ขั้นตอนที่ 2: Deploy บน Render

1. ไปที่ https://render.com แล้วล็อกอินด้วยบัญชี GitHub
2. กด **New +** → **Web Service**
3. เลือก repository `score-system` ที่เพิ่ง push ขึ้นไป (ถ้าไม่เห็น ให้กด "Configure account" เพื่ออนุญาตให้ Render เข้าถึง repo นี้)
4. Render จะอ่านค่าในไฟล์ `render.yaml` ให้อัตโนมัติ ถ้าไม่ auto-detect ให้กรอกเองดังนี้:
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `waitress-serve --host=0.0.0.0 --port=$PORT app:app`
   - **Plan:** Free
5. กด **Create Web Service** แล้วรอ 2-5 นาที
6. เมื่อเสร็จจะได้ลิงก์ประมาณ `https://score-system-xxxx.onrender.com` — ส่งลิงก์นี้ให้นักเรียนใช้ได้เลย

## เรื่องสำคัญ: การอัปเดตคะแนนหลัง Deploy

แผนฟรีของ Render **ไม่เก็บไฟล์ฐานข้อมูลถาวร** ระหว่างการ deploy ใหม่แต่ละครั้ง ดังนั้นวิธีอัปเดตคะแนนคือ:

1. นำเข้าคะแนนใหม่ในเครื่องตัวเองก่อน ตามขั้นตอนใน `README.md` (รัน `python import_scores.py ... --replace`) จะได้ไฟล์ `data/scores.db` อัปเดตแล้ว
2. คอมมิตและ push ไฟล์นี้ขึ้น GitHub:
   ```
   git add data/scores.db
   git commit -m "อัปเดตคะแนน"
   git push
   ```
3. Render จะ deploy เวอร์ชันใหม่ให้อัตโนมัติภายในไม่กี่นาที (ดูสถานะได้ในหน้า Render dashboard)

ทำแบบนี้ทุกครั้งที่มีคะแนนสอบชุดใหม่ที่ต้องการประกาศ

## หากไม่อยากยุ่งกับ Render

ยังสามารถรันแบบเดิมในเครื่อง (`python app.py`) แล้วเปิดให้เข้าผ่าน Wi-Fi โรงเรียนได้ตามที่อธิบายไว้ใน `README.md` โดยไม่ต้องผ่านขั้นตอนข้างต้นเลย

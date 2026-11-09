/**
 * ตั้งค่าการเชื่อมต่อ (แก้ไฟล์นี้หลัง deploy Google Apps Script)
 *
 * API_URL          : URL เว็บแอป GAS ที่ลงท้ายด้วย /exec
 *                    ถ้าเว้นว่าง ระบบจะทำงานใน "โหมดทดลอง" เก็บข้อมูลในเบราว์เซอร์เท่านั้น
 * GOOGLE_CLIENT_ID : OAuth Client ID (ประเภท Web application) สำหรับปุ่ม "ลงชื่อเข้าใช้ด้วย Google"
 *                    ต้องตรงกับค่า GOOGLE_CLIENT_ID ใน gas/Code.gs
 *                    ถ้าเว้นว่าง จะใช้การกรอกชื่อ/อีเมลแบบง่าย (ไม่ยืนยันตัวตน)
 */
window.APP_CONFIG = {
  API_URL: 'https://script.google.com/macros/s/AKfycbysRjKQRPTQpbYyx7FsT1nC_xu7DcklmGWS8xckbdZ3ByG5_6RvpaLPg_1ewjsB04zgnQ/exec',
  GOOGLE_CLIENT_ID: '',
  ALLOWED_DOMAIN_HINT: '' // เช่น 'dltv.ac.th' เพื่อให้หน้าเลือกบัญชีแสดงเฉพาะโดเมนนี้ (ไม่บังคับ)
};

/**
 * Thai → English phrase dictionary used by the DOM auto-translator
 * (src/components/AutoTranslate.tsx).
 *
 * The app's UI is authored in Thai. When the user switches to English we walk
 * the rendered text nodes and swap any Thai phrase found here for its English
 * equivalent. Longer phrases are matched before shorter ones automatically.
 *
 * Add new phrases as the UI grows — one place covers every page.
 */
export const TH_EN: Record<string, string> = {
  // ===== longer sentences / hints (match these first) =====
  "เพิ่มได้หลาย key ระบบจะสลับใช้เองหลังบ้าน (round-robin) และพัก key ที่เจอ limit/coin หมดชั่วคราวแล้วสลับไป key ถัดไปอัตโนมัติ":
    "Add multiple keys — the system rotates them automatically (round-robin) and cools down any key that hits a limit or runs out of coin, then switches to the next.",
  "ผลงานของคุณจะแสดงในหน้าสำรวจให้สมาชิกอื่นเห็น พร้อม prompt และ seed (เลือกซ่อนรายชิ้นได้ในแกลเลอรี)":
    "Your work appears in Explore for other members, with its prompt and seed (you can hide individual items in your gallery).",
  "ส่งรวมเข้าไปใน params ของ Mojen สำหรับโมเดลที่มีพารามิเตอร์อื่นนอกจาก seed / text":
    "Merged into Mojen params for models that take parameters beyond seed / text.",
  "เท่านั้น (ไม่เก็บในฐานข้อมูลเพื่อความปลอดภัย) แก้ไขแล้วต้องรีสตาร์ทเซิร์ฟเวอร์":
    "only (not stored in the database for security). Changes require a server restart.",
  "บัญชีของคุณเข้าสู่ระบบด้วย Google ตั้งรหัสผ่านเพื่อเข้าสู่ระบบด้วยอีเมลได้ด้วย":
    "Your account uses Google sign-in. Set a password to also log in with email.",
  "จะถูกเติมในช่อง prompt ให้ผู้ใช้อัตโนมัติเมื่อเลือกโมเดลนี้ และผู้ใช้แก้ไขได้":
    "Auto-filled into the prompt box when this model is selected; users can edit it.",
  "ผลงานของคุณทั้งหมดถูกซ่อนจากหน้าสำรวจ มีเพียงคุณที่เห็นภาพ prompt และ seed":
    "All your work is hidden from Explore — only you can see the image, prompt and seed.",
  "ซ่อนผลงานทั้งหมดของคุณจากหน้าสำรวจ เหลือเพียงคุณที่เห็นภาพ prompt และ seed":
    "Hide all your work from Explore — only you can see the image, prompt and seed.",
  "ชำระเงินอย่างปลอดภัยผ่าน Stripe รองรับบัตรเครดิต/เดบิต และ PromptPay":
    "Secure payment via Stripe — supports credit/debit cards and PromptPay.",
  "สมาชิกจะสร้างภาพไม่ได้ (ผู้ดูแลยังใช้งานได้) และจะเห็นแถบแจ้งเตือน":
    "Members can't generate (admins still can) and will see a notice banner.",
  "พิมพ์แล้วกด Enter เช่น เปลี่ยนพื้นหลังเป็นสตูดิโอสีขาว, แสงนุ่ม":
    "Type and press Enter, e.g. change background to white studio, soft light",
  "ระบบอยู่ระหว่างปิดปรับปรุง การสร้างภาพจะใช้งานไม่ได้ชั่วคราว":
    "The system is under maintenance. Image generation is temporarily unavailable.",
  "ใช้คำนวณ credit ที่ได้จากการเติมจำนวนอื่น และรายได้ในรายงาน":
    "Used to compute credit from top-ups and revenue in reports.",
  "ภาพเสร็จภายในไม่กี่วินาที เก็บไว้ในแกลเลอรีของคุณอัตโนมัติ":
    "Images finish in seconds and are saved to your gallery automatically.",
  "เช่น อัปโหลดรูปตัวละครแบบเต็มตัว แล้วพิมพ์ท่าทางที่ต้องการ":
    "e.g. upload a full-body character image, then type the pose you want",
  "เลือกโมเดล AI ที่ตรงกับงานของคุณ ราคาแสดงชัดเจนทุกโมเดล":
    "Pick the AI model for your task — every model shows a clear price.",
  "ค่าที่บันทึกที่นี่มีผลทันที ไม่ต้องรีสตาร์ทเซิร์ฟเวอร์":
    "Changes here take effect immediately, no server restart needed.",
  "ราคานี้ขาดทุน ตรวจสอบต้นทุน coin เป็นบาทในหน้าตั้งค่า":
    "This price is a loss — check the coin cost (THB) in settings.",
  "พิมพ์คำสั่งแล้วกด Enter เช่น ยกมือโบก, พื้นหลังชายหาด":
    "Type and press Enter, e.g. wave hand, beach background",
  "ชำระเงินผ่าน Stripe ข้อมูลบัตรไม่ผ่านเซิร์ฟเวอร์เรา":
    "Paid via Stripe — card data never touches our server.",
  "อัปโหลดรูป พิมพ์สิ่งที่ต้องการ แล้วให้ AI จัดการให้":
    "Upload an image, type what you want, let the AI handle it.",
  "สมัครวันนี้รับ credit ฟรีทันที ไม่ต้องใช้บัตรเครดิต":
    "Sign up today and get free credit instantly — no card needed.",
  "ชำระเงินสำเร็จ credit จะเข้าบัญชีภายในไม่กี่วินาที":
    "Payment successful — credit will arrive within seconds.",
  "จะถูกเก็บในฐานข้อมูล ใช้งานได้ทันทีไม่ต้องรีสตาร์ท":
    "Stored in the database and usable immediately — no restart.",
  "แสดงกล่องยืนยันก่อนหัก credit ทุกครั้งที่สร้างภาพ":
    "Show a confirm dialog before charging credit on each generation.",
  "ครั้ง ระบบจะปิดการใช้งานแทนการลบ เพื่อรักษารายงาน":
    "times — it will be disabled instead of deleted to preserve reports.",
  "ดูได้จาก URL ของ mojen.ai เช่น mojen.ai/features/":
    "Find it in the mojen.ai URL, e.g. mojen.ai/features/",
  "ราคาที่คุณซื้อ coin จาก Mojen จริง ใช้คำนวณกำไร":
    "The real price you pay Mojen per coin — used to compute profit.",
  "ลากรูปมาวาง แล้วบอก AI ว่าอยากให้ภาพออกมาแบบไหน":
    "Drag an image here and tell the AI how it should look.",
  "ประมวลผลบนเซิร์ฟเวอร์ GPU ได้ภาพในไม่กี่วินาที":
    "Processed on GPU servers — images in seconds.",
  "แพ็กเกจนี้มียอดขายแล้ว ระบบจะปิดการขายแทนการลบ":
    "This package has sales — it will be hidden instead of deleted.",
  "คำนวณจากการใช้งานจริง (ไม่รวมงานที่คืน credit)":
    "Based on actual usage (excludes refunded jobs).",
  "ลบภาพนี้ออกจากแกลเลอรี? (ไม่สามารถกู้คืนได้)":
    "Delete this image from your gallery? (cannot be undone)",
  "ต้องเป็นโดเมนสาธารณะเพื่อให้ Mojen ดึงรูปได้":
    "Must be a public domain so Mojen can fetch the image.",
  "หากสร้างภาพไม่สำเร็จ ระบบคืน credit ให้ทันที":
    "If generation fails, credit is refunded immediately.",
  "ปรับแต่งการแสดงผลและการแจ้งเตือนของบัญชีคุณ":
    "Customize your account's display and notifications.",
  "ควบคุมว่าผลงานของคุณจะแสดงต่อสาธารณะหรือไม่":
    "Control whether your work is shown publicly.",
  "กำหนดราคา credit และโบนัสที่ลูกค้าจะได้รับ":
    "Set credit pricing and the bonus customers receive.",
  "กำหนดขั้นต่ำสำหรับ THB ไว้ที่ประมาณ 10 บาท":
    "Stripe sets a minimum of about 10 THB.",
  "อีเมล หรือ Stripe session / payment id...":
    "Email or Stripe session / payment id...",
  "ยิ่งแพ็กเกจใหญ่ยิ่งได้โบนัส credit เพิ่ม":
    "Bigger packages give more bonus credit.",
  "ไม่มีรายเดือน เติม credit เท่าที่ต้องการ":
    "No subscription — top up credit as you need.",
  "สร้างภาพไม่สำเร็จ ระบบคืน credit ให้แล้ว":
    "Generation failed — credit has been refunded.",
  "อ้างอิงราคาแพ็กเกจ Mojen (คลิกเพื่อใช้)":
    "Mojen package price reference (click to use)",
  "ไม่สามารถเปลี่ยนสิทธิ์บัญชีของตัวเองได้":
    "You can't change your own account role.",
  "คัดลอก keywords แล้ว ไปที่หน้าสร้างภาพ":
    "Keywords copied — opening the create page",
  "โมเดลวิดีโอ เช่น Dreamlay-wan2.2 เลือก":
    "Video models, e.g. Dreamlay-wan2.2 — choose",
  "แสดงกล่องยืนยันก่อนลบรูปออกจากแกลเลอรี":
    "Show a confirm dialog before deleting from gallery.",
  "รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร":
    "New password must be at least 6 characters.",
  "หรือวาง URL หน้า feature ของ mojen.ai":
    "or paste a mojen.ai feature page URL",
  "ระงับบัญชีนี้? ผู้ใช้จะเข้าระบบไม่ได้":
    "Suspend this account? The user won't be able to log in.",
  "อ่านข้อมูลโปรไฟล์จาก Google ไม่สำเร็จ":
    "Failed to read profile from Google.",
  "เครื่องมือสร้างภาพด้วย AI สำหรับทุกคน":
    "AI image generation for everyone.",
  "กรุณาพิมพ์คำสั่ง (prompt) หรือใส่รูป":
    "Please enter a prompt or add an image.",
  "เลือกสไตล์ที่ใช่ จ่ายเฉพาะที่ใช้จริง":
    "Pick the right style — pay only for what you use.",
  "ไม่พบผลงานนี้ หรือถูกตั้งเป็นส่วนตัว":
    "Work not found or set to private.",
  "พารามิเตอร์เพิ่มเติม (JSON, ขั้นสูง)":
    "Extra parameters (JSON, advanced)",
  "บัญชีนี้ถูกระงับ กรุณาติดต่อผู้ดูแล":
    "This account is suspended — please contact an admin.",
  "เลือกโมเดลแล้วเริ่มสร้างภาพได้ทันที":
    "Pick a model and start creating instantly.",
  "ชื่อที่ไม่ต้องการเห็น (คั่นด้วย ,)":
    "Names to hide (comma separated)",
  "ค้นหา prompt, อีเมล, ชื่อผู้ใช้...":
    "Search prompt, email, username...",
  "ข้อมูลบัตรไม่ผ่านเซิร์ฟเวอร์ของเรา":
    "Card data never touches our server.",
  "สร้างไม่สำเร็จคืน credit อัตโนมัติ":
    "Failed generations are auto-refunded.",
  "ซ่อนผลงานนี้จากแกลเลอรีของผู้ใช้?":
    "Hide this work from the user's gallery?",
  "ภาพที่เลือก? (ไม่สามารถกู้คืนได้)":
    "selected images? (cannot be undone)",
  "เติม credit และดูประวัติการใช้งาน":
    "Top up credit and view your history.",
  "จัดการข้อมูลส่วนตัวและความปลอดภัย":
    "Manage your profile and security.",
  "เข้าสู่ระบบด้วย Google ไม่สำเร็จ":
    "Google sign-in failed.",
  "ค้นหา prompt, โมเดล, ผู้สร้าง...":
    "Search prompt, model, creator...",
  "คำแนะนำการใช้งาน (แสดงในสตูดิโอ)":
    "Usage instructions (shown in studio)",
  "หมายเหตุ (เช่น ชดเชย, โปรโมชัน)":
    "Note (e.g. compensation, promotion)",
  "ยังไม่มีผลงานสาธารณะของโมเดลนี้":
    "No public work from this model yet.",
  "ผลงานที่สมาชิกสร้างจะแสดงที่นี่":
    "Work created by members appears here.",
  "ชำระเงินอย่างปลอดภัยผ่าน Stripe":
    "Secure payment via Stripe.",
  "อีเมล, prompt หรือ task uid...":
    "Email, prompt or task uid...",
  "สมัครวันนี้รับ credit ฟรีทันที":
    "Sign up today and get free credit.",
  "ผลงานของคุณถูกซ่อนจากหน้าสำรวจ":
    "Your work is hidden from Explore.",
  "ยังไม่ได้ตั้งค่า Google OAuth":
    "Google OAuth is not configured.",
  "เช่น รูปเสื้อผ้า / Last frame":
    "e.g. clothing image / last frame",
  "หรือในส่วน API documentation":
    "or in the API documentation",
  "แลกโทเคนกับ Google ไม่สำเร็จ":
    "Failed to exchange token with Google.",
  "ประกาศ (แถบด้านบนของทุกหน้า)":
    "Announcement (top bar on every page)",
  "ใส่ชื่อผู้สร้าง (คั่นด้วย ,)":
    "Enter creator names (comma separated)",
  "ต้นทุน: บาท ต่อ 1 Mojen coin":
    "Cost: THB per 1 Mojen coin",
  "ไม่สำเร็จ (คืน credit แล้ว)":
    "Failed (credit refunded)",
  "เข้าสู่ระบบเพื่อสร้างภาพต่อ":
    "Log in to keep creating.",
  "ค้นหา prompt หรือรหัสรูป...":
    "Search prompt or image code...",
  "ไม่พบผลงานที่ตรงกับเงื่อนไข":
    "No matching works.",
  "ชี้ที่กราฟเพื่อดูรายละเอียด":
    "Hover the chart for details.",
  "เพิ่มด้านบน หรือตั้งใน .env":
    "Add above, or set in .env.",
  "ยิ่งเติมมาก ยิ่งได้โบนัสมาก":
    "Top up more to get more bonus.",
  "สร้างสรรค์ภาพที่ไม่เคยมีใคร":
    "Create images no one has made before.",
  "โหมดส่วนตัว (private mode)":
    "Private mode",
  "เลือกซื้อแพ็กเกจทางด้านขวา":
    "Choose a package on the right.",
  "เซสชันหมดอายุ กรุณาลองใหม่":
    "Session expired — please try again.",
  "ผลงานสาธารณะจากสมาชิกทุกคน":
    "Public work from all members.",
  "เริ่มต้น (positive prompt)":
    "Positive prompt",
  "กำลังตรวจสอบการชำระเงิน...":
    "Verifying payment...",
  "สลับธีมสีเข้ม/สว่างของเว็บ":
    "Toggle the site's dark/light theme.",
  "ต้องเปลี่ยนก่อนใช้งานจริง)":
    "must change before production)",
  "ผลงานของคุณแสดงในหน้าสำรวจ":
    "Your work is shown in Explore.",
  "ราคาขาย: บาท ต่อ 1 credit":
    "Selling price: THB per 1 credit",
  "ต้นทุน (Mojen coin / ภาพ)":
    "Cost (Mojen coin / image)",
  "โหมดสาธารณะ (public mode)":
    "Public mode",
  "โบนัสสมัครสมาชิก (credit)":
    "Signup bonus (credit)",
  "โมเดล AI ใหม่ พร้อมใช้งาน":
    "New AI models ready to use.",
  "ตรวจพบ cloudflared tunnel":
    "cloudflared tunnel detected",
  "เช่น รูปคน / Start frame":
    "e.g. person image / start frame",
  "ยอดชำระแล้ว (ตามตัวกรอง)":
    "Paid total (filtered)",
  "คืน credit อัตโนมัติแล้ว":
    "Credit auto-refunded.",
  "สาธารณะสำหรับรูปอ้างอิง":
    "public URL for reference images",
  "ใช้ภาพนี้เป็นรูปอ้างอิง":
    "Use this as reference",
  "โหมดปิดปรับปรุงเปิดอยู่":
    "Maintenance mode is on.",
  "ยืนยันรหัสผ่านไม่ตรงกัน":
    "Password confirmation doesn't match.",
  "ดำเนินการต่อด้วย Google":
    "Continue with Google",
  "เริ่มสร้างด้วยโมเดลนี้":
    "Create with this model",
  "ด้วย AI ในไม่กี่วินาที":
    "with AI in seconds",
  "ดูทั้งหมดในหน้าสำรวจ →":
    "See all in Explore →",
  "รวมใช้งานด้วยอัตโนมัติ":
    "used together automatically",
  "ออกจากระบบบนอุปกรณ์นี้":
    "Log out on this device",
  "ใช้งานง่ายใน 3 ขั้นตอน":
    "Easy to use in 3 steps",
  "ค้นหาอีเมลหรือชื่อ...":
    "Search email or name...",
  "ใช้โมเดลนี้สร้างภาพ →":
    "Create with this model →",
  "คลิกเพื่อแก้ไขข้อความ":
    "Click to edit text",
  "ความยาว prompt สูงสุด":
    "Max prompt length",
  "ไม่มีไฟล์ให้ดาวน์โหลด":
    "No file to download.",
  "ข้อมูลเชื่อมต่อ Mojen":
    "Mojen connection info",
  "โมเดลนี้ทำอะไรได้บ้าง":
    "What this model can do",
  "ผลงานทั้งหมดของสมาชิก":
    "All members' work",
  "ใช้ได้เฉพาะในเครื่อง":
    "Local only",
  "ยอดเติมขั้นต่ำ (บาท)":
    "Minimum top-up (THB)",
  "คืน credit อัตโนมัติ":
    "Auto-refund credit",
  "ยังไม่มีผลงานสาธารณะ":
    "No public work yet.",
  "บังคับต้องมีรูปที่ 1":
    "Image 1 required",
  "บังคับต้องมีรูปที่ 2":
    "Image 2 required",
  "กรุณาเลือกไฟล์รูปภาพ":
    "Please select an image file.",
  "เข้าสู่ระบบไม่สำเร็จ":
    "Login failed.",
  "อย่างน้อย 6 ตัวอักษร":
    "At least 6 characters",
  "บันทึกการตั้งค่าแล้ว":
    "Settings saved.",
  "ไม่มีข้อมูลในช่วงนี้":
    "No data in this range.",
  "คีย์ลับตั้งค่าในไฟล์":
    "Secret keys are set in the file",
  "ยืนยันก่อนใช้ credit":
    "Confirm before using credit",
  "ใช้ URL นี้อัตโนมัติ":
    "using this URL automatically",
  "การชำระเงินไม่สำเร็จ":
    "Payment failed.",
  "กรุณาใส่จำนวน credit":
    "Please enter a credit amount.",
  "คำนวณจากอัตรามาตรฐาน":
    "Based on the standard rate.",
  "สร้างด้วยค่าเดียวกัน":
    "Create with same settings",
  "เอาออกจากรายการโปรด":
    "Remove from favorites",
  "เปิดโหมดส่วนตัวแล้ว":
    "Private mode on.",
  "เปิดโหมดสาธารณะแล้ว":
    "Public mode on.",
  "บัญชีแบบเติม credit":
    "Prepaid credit account",
  "โหมดมืด (Dark mode)":
    "Dark mode",
  "ยังไม่มีการชำระเงิน":
    "No payments yet.",
  "กลับไปหน้า Features":
    "Back to Features",
  "สร้างซ้ำด้วยค่าเดิม":
    "Recreate with same settings",
  "แสดงในหน้าสำรวจแล้ว":
    "Now shown in Explore.",
  "ตั้งเป็นส่วนตัวแล้ว":
    "Set to private.",
  "เวลาประมาณ (วินาที)":
    "Est. time (seconds)",
  "เปลี่ยนรหัสผ่านแล้ว":
    "Password changed.",
  "เพิ่ม API key ใหม่":
    "Add new API key",
  "กำไรสุทธิ (ประมาณ)":
    "Net profit (approx.)",
  "ยกเลิกการระงับแล้ว":
    "Account unsuspended.",
  "เปิดหน้ารายละเอียด":
    "Open details",
  "ล็อก seed รอบถัดไป":
    "Lock seed for next run",
  "ยินดีต้อนรับกลับ":
    "Welcome back",
  "มีประวัติการใช้งาน":
    "has usage history",
  "รายได้จากการใช้งาน":
    "Revenue from usage",
  "ยืนยันรหัสผ่านใหม่":
    "Confirm new password",
  "เปลี่ยนเป็นภาษาไทย":
    "Switch to Thai",
  "เพิ่ม API key แล้ว":
    "API key added.",
  "เติมเงิน / ประวัติ":
    "Top up / History",
  "ส่วนลดเทียบมาตรฐาน":
    "Discount vs standard",
  "อินพุตและพฤติกรรม":
    "Inputs & behavior",
  "สร้างภาพแรกของคุณ":
    "Create your first image",
  "ป้ายกำกับรูปที่ 1":
    "Image 1 label",
  "ป้ายกำกับรูปที่ 2":
    "Image 2 label",
  "ใช้เป็นรูปอ้างอิง":
    "Use as reference",
  "ยกเลิกการชำระเงิน":
    "Payment cancelled.",
  "เว้นว่างเพื่อซ่อน":
    "Leave empty to hide",
  "เพิ่มในรายการโปรด":
    "Add to favorites",
  "ยืนยันการทำรายการ":
    "Confirm action",
  "สร้างภาพเสร็จแล้ว":
    "Image ready.",
  "ผลงานอื่นจากโมเดล":
    "More from model",
  "คลิกเพื่อเลือกรูป":
    "Click to choose an image",
  "ยังไม่มีการใช้งาน":
    "No usage yet.",
  "สร้างภาพนี้จะใช้":
    "This generation will use",
  "เปิดขายให้สมาชิก":
    "On sale to members",
  "เปลี่ยนบทบาทแล้ว":
    "Role changed.",
  "มีบัญชีอยู่แล้ว?":
    "Already have an account?",
  "ปิดการใช้งานแล้ว":
    "Disabled.",
  "งานที่กำลังสร้าง":
    "Jobs in progress",
  "รายละเอียดผู้ใช้":
    "User details",
  "แตะเพื่อเติมเงิน":
    "Tap to top up",
  "หรือลากไฟล์มาวาง":
    "or drag a file here",
  "รหัสผ่านปัจจุบัน":
    "Current password",
  "คุณอาจชอบสิ่งนี้":
    "You may also like",
  "อัปโหลดไม่สำเร็จ":
    "Upload failed.",
  "บันทึกการตั้งค่า":
    "Save settings",
  "คงค้าง (หนี้สิน)":
    "Outstanding (liability)",
  "แสดงอีกครั้งแล้ว":
    "Shown again.",
  "พักชั่วคราว (ถึง":
    "Cooling down (until",
  "โหลดเพิ่ม (เหลือ":
    "Load more (left",
  "จากการใช้งานจริง":
    "from actual usage",
  "ครบความยาวสูงสุด":
    "Reached max length",
  "คงเหลือหลังสร้าง":
    "Balance after",
  "เปลี่ยนบทบาทเป็น":
    "Change role to",
  "ต้องอยู่ระหว่าง":
    "must be between",
  "การทำงานของระบบ":
    "System behavior",
  "ยังไม่มีกิจกรรม":
    "No activity yet.",
  "เปลี่ยนรหัสผ่าน":
    "Change password",
  "กำลังอัปโหลด...":
    "Uploading...",
  "เปิดโหมดส่วนตัว":
    "Enable private mode",
  "ยังไม่มีธุรกรรม":
    "No transactions yet.",
  "คัดลอกไม่สำเร็จ":
    "Copy failed.",
  "แสดงในหน้าสำรวจ":
    "Show in Explore",
  "ปรับน้ำหนักด้วย":
    "Adjust weight with",
  "โหมดปิดปรับปรุง":
    "Maintenance mode",
  "เปิดโหมดสาธารณะ":
    "Enable public mode",
  "ลบ API key แล้ว":
    "API key deleted.",
  "คัดลอก keywords":
    "Copy keywords",
  "สร้างภาพด้วย AI":
    "Create with AI",
  "แพ็กเกจเติมเงิน":
    "Top-up packages",
  "ยืนยันก่อนลบรูป":
    "Confirm before delete",
  "ความเป็นส่วนตัว":
    "Privacy",
  "อัตราแลกเปลี่ยน":
    "Exchange rate",
  "คืน credit แล้ว":
    "Credit refunded.",
  "วิธีเติม credit":
    "How to top up",
  "อัตรา: 1 credit":
    "Rate: 1 credit",
  "ยังไม่มีแพ็กเกจ":
    "No packages yet.",
  "คัดลอก imgcode":
    "Copy imgcode",
  "กลับไปแกลเลอรี":
    "Back to gallery",
  "ข้อมูลเว็บไซต์":
    "Site info",
  "กำลังดาวน์โหลด":
    "Downloading",
  "ผู้ใช้แก้ไขได้":
    "editable by user",
  "แพ็กเกจ Credit":
    "Credit packages",
  "กรองประเภทสื่อ":
    "Filter media type",
  "แกลเลอรีของฉัน":
    "My gallery",
  "ไม่รวมผู้สร้าง":
    "Exclude creators",
  "ยังไม่มีข้อมูล":
    "No data yet.",
  "คัดลอก feature":
    "Copy feature",
  "บันทึกรหัสผ่าน":
    "Save password",
  "สร้างไม่สำเร็จ":
    "Generation failed.",
  "เพิ่มโมเดลใหม่":
    "Add new model",
  "ราคาต่อ credit":
    "Price per credit",
  "ยกเลิกการระงับ":
    "Unsuspend",
  "รูปภาพ (image)":
    "Image",
  "รายได้เติมเงิน":
    "Top-up revenue",
  "สร้างบัญชีใหม่":
    "Create account",
  "ธุรกรรม credit":
    "Credit transactions",
  "เริ่มใช้งานฟรี":
    "Start free",
  "ระงับบัญชีแล้ว":
    "Account suspended.",
  "เปลี่ยนธีมแล้ว":
    "Theme changed.",
  "ประวัติการเงิน":
    "Financial history",
  "สิทธิ์และสถานะ":
    "Role & status",
  "วิดีโอ (video)":
    "Video",
  "ดูในแกลเลอรี →":
    "View in gallery →",
  "บันทึกชื่อแล้ว":
    "Name saved.",
  "ยืนยันหรือไม่?":
    "Confirm?",
  "เพิ่มโมเดลแล้ว":
    "Model added.",
  "ดูโมเดลทั้งหมด":
    "View all models",
  "ยังไม่มีบัญชี?":
    "No account yet?",
  "ราคาและต้นทุน":
    "Pricing & cost",
  "ไม่พบโมเดลนี้":
    "Model not found.",
  "ข้อมูลส่วนตัว":
    "Profile",
  "เชื่อมต่อแล้ว":
    "Connected",
  "ธุรกรรมล่าสุด":
    "Recent transactions",
  "ประเภทผลลัพธ์":
    "Output type",
  "เติมจำนวนอื่น":
    "Custom amount",
  "กิจกรรมล่าสุด":
    "Recent activity",
  "ค้นหาโมเดล...":
    "Search models...",
  "ยังไม่ตั้งค่า":
    "Not configured",
  "เข้าใช้ล่าสุด":
    "Last login",
  "สมาชิกตั้งแต่":
    "Member since",
  "ช่องทางติดต่อ":
    "Contact",
  "ไม่มี prompt)":
    "no prompt)",
  "ยังไม่มีผลงาน":
    "No works yet.",
  "เช่น เสื้อผ้า":
    "e.g. clothing",
  "สุ่มอัตโนมัติ":
    "Random",
  "แพ็กเกจของคุณ":
    "Your package",
  "เพิ่มโมเดลแรก":
    "Add first model",
  "ซ่อนจากผู้ใช้":
    "Hidden from user",
  "ยังไม่มีโมเดล":
    "No models yet.",
  "กำลังสร้าง...":
    "Generating...",
  "ผลงานทั้งหมด":
    "All works",
  "หรือใช้อีเมล":
    "or use email",
  "การเชื่อมต่อ":
    "Integrations",
  "จัดการผู้ใช้":
    "Manage users",
  "รหัสผ่านใหม่":
    "New password",
  "ลูกค้าได้รับ":
    "Customer gets",
  "ล้างที่เลือก":
    "Clear selection",
  "การแจ้งเตือน":
    "Notifications",
  "มูลค่าประมาณ":
    "Approx. value",
  "จำนวน credit":
    "Credit amount",
  "ดูแบบตาราง →":
    "Table view →",
  "ป้าย (Badge)":
    "Badge",
  "เพิ่มแพ็กเกจ":
    "Add package",
  "ไปที่สตูดิโอ":
    "Go to studio",
  "โมเดลทั้งหมด":
    "All models",
  "ไปหน้าสมาชิก":
    "Go to member area",
  "ใช้งานล่าสุด":
    "Last active",
  "บาท / credit":
    "THB / credit",
  "ลำดับการแสดง":
    "Display order",
  "แก้ไขแพ็กเกจ":
    "Edit package",
  "สร้างภาพใหม่":
    "New image",
  "ตั้งรหัสผ่าน":
    "Set password",
  "ต้นทุน Mojen":
    "Mojen cost",
  "ภาพเสร็จแล้ว":
    "Image ready",
  "ชื่อเว็บไซต์":
    "Site name",
  "ซ่อนรหัสผ่าน":
    "Hide password",
  "ยังไม่มี key":
    "No keys yet",
  "ระบบหลังบ้าน":
    "Admin",
  "รายงานเต็ม →":
    "Full report →",
  "เงินเติมเข้า":
    "Top-ups in",
  "โมเดลยอดนิยม":
    "Top models",
  "กำลังโหลด...":
    "Loading...",
  "เลือกแพ็กเกจ":
    "Choose package",
  "เปลี่ยนโมเดล":
    "Change model",
  "โบนัส credit":
    "Bonus credit",
  "แสดงรหัสผ่าน":
    "Show password",
  "แสดงอีกครั้ง":
    "Show again",
  "เพิ่มน้ำหนัก":
    "Increase weight",
  "อัตรามาตรฐาน":
    "Standard rate",
  "ตั้งค่าระบบ":
    "System settings",
  "ชื่อแพ็กเกจ":
    "Package name",
  "ดูผลลัพธ์ (":
    "View results (",
  "เพิ่มอีก...":
    "Add more...",
  "แกลเลอรีรวม":
    "All galleries",
  "เมนูผู้ดูแล":
    "Admin menu",
  "โหมดส่วนตัว":
    "Private mode",
  "เติม credit":
    "Top up credit",
  "กระเป๋าเงิน":
    "Wallet",
  "บัญชีของฉัน":
    "My account",
  "คัดลอก seed":
    "Copy seed",
  "จัดการบัญชี":
    "Manage account",
  "ผลงานล่าสุด":
    "Recent works",
  "ไม่พบรายการ":
    "No items found.",
  "สูงสุด 10MB":
    "Max 10MB",
  "หรืออัปโหลด":
    "or upload",
  "ไม่พบผู้ใช้":
    "No users found.",
  "การชำระเงิน":
    "Payments",
  "ล้างทั้งหมด":
    "Reset all",
  "ล้างตัวกรอง":
    "Clear filters",
  "พร้อมใช้งาน":
    "Available",
  "ผู้ดูแลระบบ":
    "Administrator",
  "สมัครสมาชิก":
    "Sign up",
  "ราคาและกำไร":
    "Price & profit",
  "วันที่สร้าง":
    "Created",
  "ชื่อที่แสดง":
    "Display name",
  "ปรับ Credit":
    "Adjust credit",
  "เข้าสู่ระบบ":
    "Log in",
  "เป็นส่วนตัว":
    "Make private",
  "ใหม่สุดก่อน":
    "Newest first",
  "เก่าสุดก่อน":
    "Oldest first",
  "เปิดสาธารณะ":
    "Make public",
  "ดูทั้งหมด →":
    "View all →",
  "พิมพ์คำสั่ง":
    "Type a prompt",
  "ภาพที่สร้าง":
    "Generated image",
  "ต้นทุน coin":
    "Coin cost",
  "อัปโหลดไฟล์":
    "Upload file",
  "งานสร้างภาพ":
    "Generations",
  "ไม่บังคับ)":
    "optional)",
  "เพิ่มโมเดล":
    "Add model",
  "ใช้งานอยู่":
    "Active",
  "กำลังสร้าง":
    "Generating",
  "ใช้ตัวกรอง":
    "Apply filters",
  "การตั้งค่า":
    "Settings",
  "ต้นทุน/ภาพ":
    "Cost/image",
  "รายละเอียด":
    "Details",
  "แตะเพื่อดู":
    "Tap to view",
  "รายได้/ภาพ":
    "Revenue/image",
  "จ่ายตามใช้":
    "Pay as you go",
  "เห็นมาก่อน":
    "Seen before",
  "บันทึกแล้ว":
    "Saved.",
  "ค้นหาโมเดล":
    "Search models",
  "ก่อนวันที่":
    "Before",
  "ช่วงวันที่":
    "Date range",
  "ระงับบัญชี":
    "Suspend",
  "ออกจากระบบ":
    "Log out",
  "ส่งออก CSV":
    "Export CSV",
  "อัปโหลดรูป":
    "Upload image",
  "ล้างวันที่":
    "Clear dates",
  "ไม่พบโมเดล":
    "No models found.",
  "รูปอ้างอิง":
    "Reference image",
  "งานล้มเหลว":
    "Failed jobs",
  "ชื่อของคุณ":
    "Your name",
  "ประเภทสื่อ":
    "Media type",
  "เลือกโมเดล":
    "Select model",
  "ราคา (บาท)":
    "Price (THB)",
  "ค่าใช้จ่าย":
    "Cost",
  "รายงานกำไร":
    "Profit report",
  "สำรวจผลงาน":
    "Explore",
  "ใหม่วันนี้":
    "New today",
  "การแสดงผล":
    "Display",
  "ภาพสุดปัง":
    "Stunning images",
  "เรียบร้อย":
    "Done.",
  "ทุกประเภท":
    "All types",
  "รูปที่สอง":
    "Second image",
  "กำลังโหลด":
    "Loading",
  "สุ่ม seed":
    "Random seed",
  "ไม่มีไฟล์":
    "No file",
  "ดาวน์โหลด":
    "Download",
  "ลดน้ำหนัก":
    "Decrease weight",
  "ลบแพ็กเกจ":
    "Delete package",
  "ไม่สำเร็จ":
    "Failed",
  "ดูทั้งหมด":
    "View all",
  "เมนูบัญชี":
    "Account menu",
  "วันล่าสุด":
    "Latest day",
  "ผู้ใช้งาน":
    "Users",
  "ปิดใช้งาน":
    "Disabled",
  "ชื่อโมเดล":
    "Model name",
  "โหลดเพิ่ม":
    "Load more",
  "ทุกสถานะ":
    "All statuses",
  "ชนิดไฟล์":
    "File type",
  "แสดงก่อน":
    "Show first",
  "คำอธิบาย":
    "Description",
  "เติมเงิน":
    "Top up",
  "กำไร/ภาพ":
    "Profit/image",
  "เปิดเมนู":
    "Open menu",
  "สร้างภาพ":
    "Create",
  "รวมโบนัส":
    "incl. bonus",
  "คืนแล้ว)":
    "refunded)",
  "ยังไม่มี":
    "None yet",
  "ไม่มีภาพ":
    "No image",
  "ก่อนหน้า":
    "Previous",
  "ชำระเงิน":
    "Pay",
  "หมายเหตุ":
    "Note",
  "แดชบอร์ด":
    "Dashboard",
  "เริ่มต้น":
    "Start",
  "แกลเลอรี":
    "Gallery",
  "ทุกโมเดล":
    "All models",
  "หมวดหมู่":
    "Category",
  "รหัสผ่าน":
    "Password",
  "ผู้สร้าง":
    "Creator",
  "เรียงตาม":
    "Sort by",
  "จำนวนภาพ":
    "Image count",
  "ชำระแล้ว":
    "Paid",
  "ถูกระงับ":
    "Suspended",
  "ทุกบทบาท":
    "All roles",
  "ซ่อนแล้ว":
    "Hidden.",
  "จัดการ →":
    "Manage →",
  "กรุณาใส่":
    "Please enter",
  "รายโมเดล":
    "By model",
  "ราคาขาย":
    "Sell price",
  "ล้มเหลว":
    "Failed",
  "ปลอดภัย":
    "Secure",
  "ผู้ดูแล":
    "Admin",
  "เปิดขาย":
    "On sale",
  "ประวัติ":
    "History",
  "สาธารณะ":
    "Public",
  "ตั้งค่า":
    "Settings",
  "ลบโมเดล":
    "Delete model",
  "อัปโหลด":
    "Upload",
  "เก่าสุด":
    "Oldest",
  "รวดเร็ว":
    "Fast",
  "วิดีโอ)":
    "video)",
  "ยอดเงิน":
    "Amount",
  "ยอดนิยม":
    "Popular",
  "ตัวกรอง":
    "Filters",
  "ทั้งหมด":
    "All",
  "ซื้อเลย":
    "Buy now",
  "แพ็กเกจ":
    "Packages",
  "ใหม่สุด":
    "Newest",
  "คืนแล้ว":
    "Refunded",
  "ธุรกรรม":
    "Transaction",
  "คงเหลือ":
    "Balance",
  "ใบเสร็จ":
    "Receipt",
  "ตั้งแต่":
    "From",
  "ส่วนตัว":
    "Private",
  "ขายแล้ว":
    "Sold",
  "ยอดเติม":
    "Top-up",
  "บันทึก":
    "Save",
  "มูลค่า":
    "Value",
  "วิดีโอ":
    "Video",
  "รายวัน":
    "Daily",
  "จัดการ":
    "Manage",
  "วันที่":
    "Date",
  "ประเภท":
    "Type",
  "รายการ":
    "Item",
  "สโลแกน":
    "Tagline",
  "ภาพรวม":
    "Overview",
  "ผู้ใช้":
    "User",
  "ลบแล้ว":
    "Deleted.",
  "ผ่านไป":
    "Elapsed",
  "รายได้":
    "Revenue",
  "ต้นทุน":
    "Cost",
  "ใช้งาน":
    "Active",
  "สมาชิก":
    "Member",
  "คัดลอก":
    "Copy",
  "ประมาณ":
    "approx.",
  "ไม่แจก":
    "None",
  "รับภาพ":
    "Get image",
  "เลขที่":
    "No.",
  "รูปภาพ":
    "Image",
  "ยกเลิก":
    "Cancel",
  "รอชำระ":
    "Pending",
  "ยืนยัน":
    "Confirm",
  "สำเร็จ":
    "Success",
  "สูงสุด":
    "Max",
  "วันนี้":
    "Today",
  "อีเมล":
    "Email",
  "ต่อคน":
    "per person",
  "ระงับ":
    "Suspend",
  "แก้ไข":
    "Edit",
  "ค้นหา":
    "Search",
  "โมเดล":
    "Model",
  "บทบาท":
    "Role",
  "ครั้ง":
    "times",
  "บัญชี":
    "Account",
  "สำรวจ":
    "Explore",
  "สมัคร":
    "Sign up",
  "ถัดไป":
    "Next",
  "สถานะ":
    "Status",
  "ถาวร?":
    "permanently?",
  "โบนัส":
    "Bonus",
  "เลือก":
    "Select",
  "เพิ่ม":
    "Add",
  "ใช้ไป":
    "Used",
  "ทำซ้ำ":
    "Repeat",
  "ทุกคน":
    "Everyone",
  "จำนวน":
    "Amount",
  "ไม่พอ":
    "Not enough",
  "รูปปก":
    "Cover",
  "ผลงาน":
    "Works",
  "ลำดับ":
    "Order",
  "เวลา":
    "Time",
  "ไฟล์":
    "File",
  "น้อย":
    "Low",
  "ป้าย":
    "Badge",
  "ราคา":
    "Price",
  "โปรด":
    "Favorite",
  "เติม":
    "Top up",
  "แล้ว":
    "done",
  "กำไร":
    "Profit",
  "ระบบ":
    "System",
  "ชิ้น":
    "items",
  "ซ่อน":
    "Hide",
  "งาน":
    "jobs",
  "ให้":
    "to",
  "หัก":
    "Deduct",
  "วัน":
    "day",
  "ปิด":
    "Close",
  "ภาพ":
    "image",
  "ถึง":
    "to",
  "รูป":
    "image",
  "ลบ":
    "Delete",
};

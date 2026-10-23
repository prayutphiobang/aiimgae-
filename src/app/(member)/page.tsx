"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import ModelCard, { type PublicModel } from "@/components/ModelCard";
import { thb, num } from "@/lib/format";

interface Pkg {
  id: number;
  name: string;
  price_thb: number;
  credits: number;
  bonus_credits: number;
  badge: string | null;
}

export default function LandingPage() {
  const { user, site } = useAuth();
  const [models, setModels] = useState<PublicModel[]>([]);
  const [pkgs, setPkgs] = useState<Pkg[]>([]);

  useEffect(() => {
    fetch("/api/models").then((r) => r.json()).then((d) => setModels(d.items ?? [])).catch(() => {});
    fetch("/api/billing/checkout").then((r) => r.json()).then((d) => setPkgs(d.packages ?? [])).catch(() => {});
  }, []);

  const cta = user ? "/studio" : "/login?mode=register";

  return (
    <>
      <section className="hero">
        <div className="eyebrow">
          <span className="badge hot">NEW</span> โมเดล AI ใหม่ พร้อมใช้งาน {models.length} โมเดล
        </div>
        <h1>
          เปลี่ยนไอเดียเป็น <span className="grad-text">ภาพสุดปัง</span>
          <br />
          ด้วย AI ในไม่กี่วินาที
        </h1>
        <p className="lead">{site.site_tagline || "อัปโหลดรูป พิมพ์สิ่งที่ต้องการ แล้วให้ AI จัดการให้"}</p>
        <div className="row wrap">
          <Link href={cta} className="btn primary lg">
            ✨ {user ? "ไปที่สตูดิโอ" : "เริ่มใช้งานฟรี"}
          </Link>
          <Link href="/models" className="btn outline lg">
            ดูโมเดลทั้งหมด
          </Link>
        </div>
        {!user && <p className="small muted" style={{ marginTop: 16 }}>สมัครวันนี้รับ credit ฟรีทันที ไม่ต้องใช้บัตรเครดิต</p>}
      </section>

      <div className="container" style={{ paddingTop: 0 }}>
        <section className="section">
          <div className="section-title">
            <h2>โมเดลยอดนิยม</h2>
            <p>เลือกสไตล์ที่ใช่ จ่ายเฉพาะที่ใช้จริง</p>
          </div>
          {models.length ? (
            <div className="model-grid">
              {models.slice(0, 8).map((m) => (
                <ModelCard key={m.id} model={m} href={user ? `/studio?model=${m.id}` : cta} />
              ))}
            </div>
          ) : (
            <div className="model-grid">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="skeleton" style={{ height: 280 }} />
              ))}
            </div>
          )}
        </section>

        <section className="section">
          <div className="section-title">
            <h2>ใช้งานง่ายใน 3 ขั้นตอน</h2>
          </div>
          <div className="grid cols-3">
            {[
              ["เลือกโมเดล", "เลือกโมเดล AI ที่ตรงกับงานของคุณ ราคาแสดงชัดเจนทุกโมเดล"],
              ["อัปโหลด & พิมพ์คำสั่ง", "ลากรูปมาวาง แล้วบอก AI ว่าอยากให้ภาพออกมาแบบไหน"],
              ["รับภาพ & ดาวน์โหลด", "ภาพเสร็จภายในไม่กี่วินาที เก็บไว้ในแกลเลอรีของคุณอัตโนมัติ"],
            ].map(([t, d], i) => (
              <div key={t} className="card feature">
                <div className="step-num">{i + 1}</div>
                <h3>{t}</h3>
                <p>{d}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="section">
          <div className="grid cols-4">
            {[
              ["⚡", "รวดเร็ว", "ประมวลผลบนเซิร์ฟเวอร์ GPU ได้ภาพในไม่กี่วินาที"],
              ["💰", "จ่ายตามใช้", "ไม่มีรายเดือน เติม credit เท่าที่ต้องการ"],
              ["🔁", "คืน credit อัตโนมัติ", "หากสร้างภาพไม่สำเร็จ ระบบคืน credit ให้ทันที"],
              ["🔒", "ปลอดภัย", "ชำระเงินผ่าน Stripe ข้อมูลบัตรไม่ผ่านเซิร์ฟเวอร์เรา"],
            ].map(([ic, t, d]) => (
              <div key={t} className="card feature">
                <div className="ic">{ic}</div>
                <h3>{t}</h3>
                <p>{d}</p>
              </div>
            ))}
          </div>
        </section>

        {pkgs.length > 0 && (
          <section className="section">
            <div className="section-title">
              <h2>แพ็กเกจ Credit</h2>
              <p>ยิ่งเติมมาก ยิ่งได้โบนัสมาก</p>
            </div>
            <div className="pkg-grid">
              {pkgs.map((p) => (
                <div key={p.id} className={`pkg ${p.badge ? "featured" : ""}`}>
                  {p.badge && <span className="badge hot ribbon">{p.badge}</span>}
                  <div className="xs muted" style={{ fontWeight: 700, textTransform: "uppercase" }}>{p.name}</div>
                  <div className="credits">
                    <span className="coin" style={{ width: 22, height: 22 }} /> {num(p.credits + p.bonus_credits)}
                  </div>
                  <div className="bonus">{p.bonus_credits > 0 ? `รวมโบนัส +${num(p.bonus_credits)}` : ""}</div>
                  <div className="price">{thb(p.price_thb, 0)}</div>
                  <Link href={user ? "/wallet" : cta} className="btn primary block">
                    เลือกแพ็กเกจ
                  </Link>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      <footer className="footer">
        © {new Date().getFullYear()} {site.site_name}
        {site.support_contact && <> · ติดต่อ: {site.support_contact}</>}
      </footer>
    </>
  );
}

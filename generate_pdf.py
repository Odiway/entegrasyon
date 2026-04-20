from fpdf import FPDF
import os

class PDF(FPDF):
    def header(self):
        if self.page_no() == 1:
            return
        self.set_font("DejaVu", "I", 8)
        self.set_text_color(150, 150, 150)
        self.cell(0, 8, "TEMSA - Sanal Sunucu Gereksinimleri", align="C")
        self.ln(4)
        self.set_draw_color(196, 30, 58)
        self.set_line_width(0.3)
        self.line(10, self.get_y(), 200, self.get_y())
        self.ln(6)

    def footer(self):
        self.set_y(-15)
        self.set_font("DejaVu", "I", 8)
        self.set_text_color(150, 150, 150)
        self.cell(0, 10, f"Sayfa {self.page_no()}/{{nb}}", align="C")

    def section_title(self, title):
        self.set_font("DejaVu", "B", 13)
        self.set_text_color(196, 30, 58)
        self.cell(0, 10, title, new_x="LMARGIN", new_y="NEXT")
        self.set_draw_color(220, 220, 220)
        self.set_line_width(0.3)
        self.line(10, self.get_y(), 200, self.get_y())
        self.ln(3)

    def sub_title(self, title):
        self.set_font("DejaVu", "B", 11)
        self.set_text_color(50, 50, 50)
        self.cell(0, 8, title, new_x="LMARGIN", new_y="NEXT")
        self.ln(1)

    def body_text(self, text):
        self.set_font("DejaVu", "", 10)
        self.set_text_color(40, 40, 40)
        self.multi_cell(0, 6, text)
        self.ln(2)

    def note_box(self, text):
        self.set_fill_color(255, 253, 231)
        self.set_draw_color(251, 192, 45)
        self.set_line_width(0.5)
        x = self.get_x()
        y = self.get_y()
        self.set_font("DejaVu", "B", 9)
        self.set_text_color(100, 80, 0)
        w = self.w - 20
        self.rect(x, y, w, 14, "DF")
        self.line(x, y, x, y + 14)
        self.set_xy(x + 3, y + 2)
        self.multi_cell(w - 6, 5, "Not: " + text)
        self.ln(4)

    def add_table(self, headers, data, col_widths=None, highlight_rows=None):
        if highlight_rows is None:
            highlight_rows = []
        if col_widths is None:
            col_widths = [190 / len(headers)] * len(headers)

        # Header
        self.set_font("DejaVu", "B", 9)
        self.set_fill_color(240, 240, 240)
        self.set_text_color(30, 30, 30)
        self.set_draw_color(200, 200, 200)
        for i, h in enumerate(headers):
            self.cell(col_widths[i], 8, h, border=1, fill=True, align="L")
        self.ln()

        # Data
        self.set_font("DejaVu", "", 9)
        for row_idx, row in enumerate(data):
            if row_idx in highlight_rows:
                self.set_fill_color(255, 243, 245)
                fill = True
            elif row_idx % 2 == 1:
                self.set_fill_color(250, 250, 250)
                fill = True
            else:
                fill = False

            max_lines = 1
            for i, cell in enumerate(row):
                lines = self.multi_cell(col_widths[i], 7, cell, dry_run=True, output="LINES")
                max_lines = max(max_lines, len(lines))

            row_h = max_lines * 7
            y_before = self.get_y()

            # Check page break
            if y_before + row_h > self.h - 20:
                self.add_page()
                # Redraw header
                self.set_font("DejaVu", "B", 9)
                self.set_fill_color(240, 240, 240)
                for i, h in enumerate(headers):
                    self.cell(col_widths[i], 8, h, border=1, fill=True, align="L")
                self.ln()
                self.set_font("DejaVu", "", 9)
                y_before = self.get_y()

            x_start = self.get_x()
            for i, cell in enumerate(row):
                x = x_start + sum(col_widths[:i])
                self.set_xy(x, y_before)
                if fill:
                    self.set_fill_color(255, 243, 245 if row_idx in highlight_rows else 250)
                    self.rect(x, y_before, col_widths[i], row_h, "F")
                self.rect(x, y_before, col_widths[i], row_h)
                self.set_xy(x + 1, y_before + 1)
                self.set_text_color(30, 30, 30)
                self.multi_cell(col_widths[i] - 2, 7, cell)

            self.set_y(y_before + row_h)

        self.ln(4)

    def bullet_list(self, items):
        self.set_font("DejaVu", "", 10)
        self.set_text_color(40, 40, 40)
        for item in items:
            self.cell(6, 6, chr(8226))
            self.multi_cell(0, 6, " " + item)
            self.ln(1)
        self.ln(3)


def main():
    pdf = PDF()
    pdf.alias_nb_pages()
    pdf.set_auto_page_break(auto=True, margin=20)

    font_dir = r"C:\Windows\Fonts"
    pdf.add_font("DejaVu", "", os.path.join(font_dir, "segoeui.ttf"))
    pdf.add_font("DejaVu", "B", os.path.join(font_dir, "segoeuib.ttf"))
    pdf.add_font("DejaVu", "I", os.path.join(font_dir, "segoeuii.ttf"))

    # ============ KAPAK SAYFASI ============
    pdf.add_page()
    pdf.ln(50)
    pdf.set_draw_color(196, 30, 58)
    pdf.set_line_width(1)
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(10)
    pdf.set_font("DejaVu", "B", 28)
    pdf.set_text_color(196, 30, 58)
    pdf.cell(0, 15, "Sanal Sunucu", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 15, "Gereksinimleri", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(5)
    pdf.set_font("DejaVu", "", 14)
    pdf.set_text_color(80, 80, 80)
    pdf.cell(0, 10, "Web Uygulamaları Hosting Altyapısı", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(10)
    pdf.set_draw_color(196, 30, 58)
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(20)

    pdf.set_font("DejaVu", "", 11)
    pdf.set_text_color(100, 100, 100)
    info = [
        ("Hazırlayan", "Oğuzhan İnandı"),
        ("Departman", "Bilgi Teknolojileri"),
        ("Tarih", "20 Nisan 2026"),
        ("Versiyon", "1.0"),
        ("Gizlilik", "Şirket İçi"),
    ]
    for label, value in info:
        pdf.set_font("DejaVu", "B", 11)
        pdf.cell(50, 8, label + ":", align="R")
        pdf.set_font("DejaVu", "", 11)
        pdf.cell(0, 8, "  " + value, new_x="LMARGIN", new_y="NEXT")

    # ============ İÇİNDEKİLER ============
    pdf.add_page()
    pdf.set_font("DejaVu", "B", 18)
    pdf.set_text_color(196, 30, 58)
    pdf.cell(0, 15, "İçindekiler", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(5)

    toc = [
        "1. Genel Bakış",
        "2. Donanım Gereksinimleri",
        "3. İşletim Sistemi",
        "4. Yazılım & Servis Gereksinimleri",
        "5. Ağ & Port Gereksinimleri",
        "6. Güvenlik Gereksinimleri",
        "7. Domain & DNS Gereksinimleri",
        "8. Yedekleme & Felaket Kurtarma",
        "9. İzleme & Bakım",
        "10. Özet Gereksinim Tablosu",
    ]
    pdf.set_font("DejaVu", "", 12)
    pdf.set_text_color(50, 50, 50)
    for item in toc:
        pdf.cell(0, 9, item, new_x="LMARGIN", new_y="NEXT")

    # ============ 1. GENEL BAKIŞ ============
    pdf.add_page()
    pdf.section_title("1. Genel Bakış")
    pdf.body_text(
        "Bu dokümanda, mevcut Vercel platformunda çalışan PLM BOM Entegrasyon uygulaması "
        "ve benzer birkaç web uygulamasının şirket içi sanal sunucuya taşınması için "
        "gereken sunucu gereksinimleri detaylandırılmaktadır."
    )
    pdf.add_table(
        ["Parametre", "Değer"],
        [
            ["Mevcut Uygulama Sayısı", "1 (PLM BOM Entegrasyon) + planlanmış 2-3 ek uygulama"],
            ["Beklenen Kullanıcı Sayısı", "10-50 eşzamanlı kullanıcı (şirket içi)"],
            ["Erişim Tipi", "Şirket içi ağ (intranet) — VPN ile uzaktan erişim opsiyonel"],
            ["Çalışma Saatleri", "7/24 (kesintisiz)"],
        ],
        col_widths=[60, 130],
    )

    # ============ 2. DONANIM GEREKSİNİMLERİ ============
    pdf.section_title("2. Donanım Gereksinimleri")
    pdf.add_table(
        ["Kaynak", "Minimum", "Önerilen (Birden Fazla Uygulama)"],
        [
            ["İşlemci (vCPU)", "4 vCPU", "8 vCPU (x86_64)"],
            ["RAM", "8 GB", "16 GB"],
            ["Disk (SSD)", "80 GB SSD", "200 GB SSD (NVMe tercih edilir)"],
            ["Ağ", "1 Gbps", "1 Gbps (şirket içi LAN)"],
        ],
        col_widths=[55, 60, 75],
    )
    pdf.note_box(
        "Disk alanı hesabı: İşletim sistemi ~10 GB, Docker images ~15 GB, PostgreSQL verileri ~20 GB, "
        "yüklenen dosyalar ~10 GB, log dosyaları ~5 GB, yedekleme alanı ~30 GB + gelecek uygulamalar."
    )

    # ============ 3. İŞLETİM SİSTEMİ ============
    pdf.section_title("3. İşletim Sistemi")
    pdf.add_table(
        ["Parametre", "Değer"],
        [
            ["İşletim Sistemi", "Ubuntu Server 22.04 LTS (64-bit) — Önerilen"],
            ["Alternatif", "Rocky Linux 9 / AlmaLinux 9 / Debian 12"],
            ["Masaüstü Ortamı", "Gerekli değil (headless server)"],
            ["SSH Erişimi", "Gerekli (port 22 veya özel port)"],
        ],
        col_widths=[60, 130],
        highlight_rows=[0],
    )

    # ============ 4. YAZILIM GEREKSİNİMLERİ ============
    pdf.add_page()
    pdf.section_title("4. Yazılım & Servis Gereksinimleri")
    pdf.sub_title("4.1 Temel Yazılımlar (Sunucuya Kurulacak)")
    pdf.add_table(
        ["Yazılım", "Versiyon", "Açıklama"],
        [
            ["Docker Engine", "24.x+", "Tüm uygulamalar konteyner olarak çalışacak"],
            ["Docker Compose", "v2.x+", "Multi-container orchestration"],
            ["Node.js", "20.x LTS", "Next.js frontend build & runtime"],
            ["Python", "3.12.x", "FastAPI backend runtime"],
            ["PostgreSQL", "16.x", "Veritabanı (Docker container içinde)"],
            ["Nginx", "1.24+", "Reverse proxy & SSL termination"],
            ["Git", "2.x+", "Kaynak kod yönetimi & deployment"],
            ["Certbot (opsiyonel)", "Latest", "SSL sertifikası (dışarıya açılacaksa)"],
        ],
        col_widths=[55, 30, 105],
        highlight_rows=[0, 1],
    )

    pdf.sub_title("4.2 Uygulama Teknoloji Yığını")
    pdf.set_font("DejaVu", "B", 10)
    pdf.set_text_color(60, 60, 60)
    pdf.cell(0, 7, "Frontend:", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("DejaVu", "", 10)
    pdf.cell(0, 6, "Next.js 14  |  React 18  |  TypeScript 5  |  Tailwind CSS 3  |  Prisma ORM 5  |  ExcelJS", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(3)
    pdf.set_font("DejaVu", "B", 10)
    pdf.cell(0, 7, "Backend:", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("DejaVu", "", 10)
    pdf.cell(0, 6, "FastAPI  |  Python 3.12  |  SQLAlchemy  |  Uvicorn  |  asyncpg  |  OpenPyXL", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(6)

    # ============ 5. AĞ & PORT GEREKSİNİMLERİ ============
    pdf.section_title("5. Ağ & Port Gereksinimleri")
    pdf.add_table(
        ["Port", "Protokol", "Servis", "Yön"],
        [
            ["80", "TCP (HTTP)", "Nginx (HTTPS redirect)", "Inbound"],
            ["443", "TCP (HTTPS)", "Nginx reverse proxy", "Inbound"],
            ["22", "TCP (SSH)", "Sunucu yönetimi", "Inbound"],
            ["3000", "TCP", "Next.js (internal)", "Internal only"],
            ["8000-8005", "TCP", "Backend API (internal)", "Internal only"],
            ["5432", "TCP", "PostgreSQL (internal)", "Internal only"],
            ["443", "TCP", "GitHub (git pull)", "Outbound"],
            ["443", "TCP", "npm / pip registry", "Outbound"],
        ],
        col_widths=[30, 40, 65, 55],
        highlight_rows=[0, 1],
    )
    pdf.note_box(
        "Port 3000, 8000-8005 ve 5432 sadece sunucu içi (localhost/Docker network) erişimde olacak. "
        "Dışarıya sadece 80/443 (Nginx üzerinden) ve 22 (SSH) açık olmalıdır."
    )

    # ============ 6. GÜVENLİK ============
    pdf.add_page()
    pdf.section_title("6. Güvenlik Gereksinimleri")
    pdf.add_table(
        ["Gereksinim", "Açıklama"],
        [
            ["Firewall", "UFW / iptables — yalnızca 22, 80, 443 portları açık"],
            ["SSL/TLS Sertifikası", "Şirket içi CA sertifikası veya Let's Encrypt"],
            ["SSH Key Authentication", "Parola yerine SSH key ile giriş önerilir"],
            ["Otomatik Güncellemeler", "unattended-upgrades (güvenlik yamaları)"],
            ["Fail2Ban", "Brute-force saldırı koruması"],
            ["Veritabanı", "PostgreSQL sadece Docker internal network'ten erişilebilir"],
            ["Yedekleme", "Günlük otomatik DB backup + haftalık full backup"],
        ],
        col_widths=[55, 135],
    )

    # ============ 7. DOMAIN & DNS ============
    pdf.section_title("7. Domain & DNS Gereksinimleri")
    pdf.add_table(
        ["Parametre", "Değer"],
        [
            ["Hostname (örnek)", "apps.temsa.local veya entegrasyon.temsa.com.tr"],
            ["DNS Kaydı", "A kaydı → sunucu IP adresi (şirket içi DNS)"],
            ["Ek Uygulamalar", "Subdomain veya path-based routing (Nginx ile)"],
        ],
        col_widths=[55, 135],
    )
    pdf.note_box(
        "Örnek yapı: entegrasyon.temsa.local → PLM BOM Entegrasyon  |  "
        "app2.temsa.local → Diğer uygulama  |  app3.temsa.local → Diğer uygulama"
    )

    # ============ 8. YEDEKLEME ============
    pdf.section_title("8. Yedekleme & Felaket Kurtarma")
    pdf.add_table(
        ["Parametre", "Değer"],
        [
            ["Veritabanı Yedekleme", "Günlük pg_dump — 30 gün saklama"],
            ["Uygulama Dosyaları", "Git repository'den tekrar deploy edilebilir"],
            ["Upload Dosyaları", "Haftalık yedekleme (Excel dosyaları)"],
            ["VM Snapshot", "Haftalık VM snapshot önerilir"],
            ["RPO (Recovery Point)", "Maksimum 24 saat veri kaybı"],
            ["RTO (Recovery Time)", "Maksimum 4 saat"],
        ],
        col_widths=[55, 135],
    )

    # ============ 9. İZLEME ============
    pdf.section_title("9. İzleme & Bakım")
    pdf.bullet_list([
        "Disk doluluk izleme — %85 üzerinde uyarı",
        "Bellek / CPU izleme — aşırı kullanımda uyarı",
        "Docker container sağlık kontrolü — otomatik restart",
        "Log rotasyonu — logrotate ile haftalık rotasyon",
        "Uptime izleme — HTTP health-check endpoint",
    ])

    # ============ 10. ÖZET TABLO ============
    pdf.add_page()
    pdf.section_title("10. Özet Gereksinim Tablosu")
    pdf.add_table(
        ["Kaynak", "Minimum", "Önerilen"],
        [
            ["İşletim Sistemi", "Ubuntu 22.04 LTS", "Ubuntu 22.04 LTS"],
            ["vCPU", "4 çekirdek", "8 çekirdek"],
            ["RAM", "8 GB", "16 GB"],
            ["Disk", "80 GB SSD", "200 GB NVMe SSD"],
            ["Ağ", "1 Gbps", "1 Gbps"],
            ["Docker", "Engine 24+ & Compose v2+", "Engine 24+ & Compose v2+"],
            ["PostgreSQL", "16.x (container)", "16.x (container)"],
            ["Node.js", "20.x LTS", "20.x LTS"],
            ["Python", "3.12.x", "3.12.x"],
            ["Nginx", "1.24+", "1.24+"],
            ["Portlar (dış)", "22, 80, 443", "22, 80, 443"],
            ["Outbound İnternet", "GitHub, npm, pip", "GitHub, npm, pip"],
            ["Yedekleme", "Günlük DB dump", "Günlük DB dump + VM snapshot"],
            ["SSL", "Şirket içi CA", "Şirket içi CA / Let's Encrypt"],
            ["Statik IP", "1 adet", "1 adet"],
            ["DNS", "A kaydı (subdomain)", "A kaydı (subdomain)"],
        ],
        col_widths=[50, 70, 70],
        highlight_rows=[1, 2, 3],
    )

    # ============ ÇIKIŞ ============
    output_path = os.path.join(os.path.dirname(__file__), "SUNUCU_GEREKSINIMLERI.pdf")
    pdf.output(output_path)
    print(f"PDF olusturuldu: {output_path}")


if __name__ == "__main__":
    main()

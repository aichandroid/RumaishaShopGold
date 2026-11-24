#!/usr/bin/env python3
"""
generate_preview_png.py
Generates 6 high-resolution preview snapshot PNGs for Rumaisho Gold daily price templates:
- template-senin.png (Deep Muted Sage - Soft Dark)
- template-selasa.png (Warm Linen Cream - Soft Light / Earth Pastel)
- template-rabu.png (Muted Slate Navy - Soft Dark)
- template-kamis.png (Soft Celadon / Matcha Tint - Soft Light / Pastel)
- template-jumat.png (Deep Espresso Charcoal - Soft Dark)
- template-sabtu.png (Warm Cashmere Taupe - Soft Light / Earth Pastel)

Location: /mnt/data/rumaishogold/RumaishaShopGold/preview_templates/
"""

import os
import sys
from PIL import Image, ImageDraw, ImageFont

def hex_to_rgb(hex_str):
    if isinstance(hex_str, (tuple, list)):
        return tuple(hex_str[:3])
    hex_str = hex_str.lstrip('#')
    return tuple(int(hex_str[i:i+2], 16) for i in (0, 2, 4))

THEMES = {
    "senin": {
        "day": "Senin",
        "date_str": "Senin, 24 November 2026",
        "name": "Deep Muted Sage (Soft Dark)",
        "concept": "Awal pekan segar & tenang, bernuansa sage gelap mewah tanpa neon.",
        "bg_grad_top": "#1A2C26",
        "bg_grad_bottom": "#13221E",
        "card_border": "#8BA396",
        "banner_bg": "#13221E",
        "date_badge_bg": "#253E36",
        "date_badge_border": "#3D5C52",
        "date_badge_text": "#FCE69B",
        "table_border": "#3D5C52",
        "table_header_bg": "#0E1916",
        "table_header_text": "#E2EDE7",
        "table_header_border_bottom": "#8BA396",
        "row_bg1": "#1E332D",
        "row_bg2": "#172A24",
        "row_border_bottom": "#263E36",
        "gram_text": "#FFFFFF",
        "harga_text": "#FCE69B",
        "badge_bg": "#0A1612",
        "badge_border": "#C5A558",
        "badge_text": "#FFFFFF",
        "watermark": "#8BA396",
    },
    "selasa": {
        "day": "Selasa",
        "date_str": "Selasa, 25 November 2026",
        "name": "Warm Linen Cream (Soft Light / Earth Pastel)",
        "concept": "Bersih, hangat, terang namun tidak silau/blinding.",
        "bg_grad_top": "#F5F2EB",
        "bg_grad_bottom": "#ECE7DC",
        "card_border": "#C8BCAE",
        "banner_bg": "#ECE7DC",
        "date_badge_bg": "#3D352A",
        "date_badge_border": "#544A3D",
        "date_badge_text": "#FBF5E8",
        "table_border": "#C8BCAE",
        "table_header_bg": "#2A231A",
        "table_header_text": "#FAF6EE",
        "table_header_border_bottom": "#B09875",
        "row_bg1": "#FAF8F5",
        "row_bg2": "#EFECE3",
        "row_border_bottom": "#E4DDD1",
        "gram_text": "#2A231A",
        "harga_text": "#734F08",
        "badge_bg": "#E5DDD0",
        "badge_border": "#B09875",
        "badge_text": "#2A231A",
        "watermark": "#8C8275",
    },
    "rabu": {
        "day": "Rabu",
        "date_str": "Rabu, 26 November 2026",
        "name": "Muted Slate Navy (Soft Dark)",
        "concept": "Sejuk, profesional, tenang, kontras tinggi.",
        "bg_grad_top": "#18232C",
        "bg_grad_bottom": "#121B22",
        "card_border": "#71889B",
        "banner_bg": "#121B22",
        "date_badge_bg": "#22313D",
        "date_badge_border": "#3B5164",
        "date_badge_text": "#FFE8A8",
        "table_border": "#3B5164",
        "table_header_bg": "#0D141A",
        "table_header_text": "#E2EDF7",
        "table_header_border_bottom": "#71889B",
        "row_bg1": "#1C2A35",
        "row_bg2": "#15212A",
        "row_border_bottom": "#243542",
        "gram_text": "#FFFFFF",
        "harga_text": "#FFE8A8",
        "badge_bg": "#0A1117",
        "badge_border": "#BAA064",
        "badge_text": "#FFFFFF",
        "watermark": "#7E93A4",
    },
    "kamis": {
        "day": "Kamis",
        "date_str": "Kamis, 27 November 2026",
        "name": "Soft Celadon / Matcha Tint (Soft Light / Pastel)",
        "concept": "Teduh, menyejukkan mata, nuansa hijau celadon alami.",
        "bg_grad_top": "#EDF3EE",
        "bg_grad_bottom": "#E2EBE4",
        "card_border": "#A2BDB1",
        "banner_bg": "#E2EBE4",
        "date_badge_bg": "#27382B",
        "date_badge_border": "#3E5644",
        "date_badge_text": "#F1F7EE",
        "table_border": "#A2BDB1",
        "table_header_bg": "#1D2A20",
        "table_header_text": "#F1F7EE",
        "table_header_border_bottom": "#8FAD95",
        "row_bg1": "#F7FAF7",
        "row_bg2": "#E7EFE9",
        "row_border_bottom": "#DCE6DE",
        "gram_text": "#17231A",
        "harga_text": "#56540B",
        "badge_bg": "#D7E3D9",
        "badge_border": "#8FAD95",
        "badge_text": "#1D2A20",
        "watermark": "#748777",
    },
    "jumat": {
        "day": "Jumat",
        "date_str": "Jumat, 28 November 2026",
        "name": "Deep Espresso Charcoal (Soft Dark)",
        "concept": "Mewah, anggun, hangat, nuansa Jumat berkah dengan aksen emas kaya.",
        "bg_grad_top": "#221C19",
        "bg_grad_bottom": "#181311",
        "card_border": "#A58B79",
        "banner_bg": "#181311",
        "date_badge_bg": "#362C27",
        "date_badge_border": "#52433C",
        "date_badge_text": "#FCE592",
        "table_border": "#52433C",
        "table_header_bg": "#120E0D",
        "table_header_text": "#F9EFE9",
        "table_header_border_bottom": "#D4AF37",
        "row_bg1": "#28211E",
        "row_bg2": "#1E1815",
        "row_border_bottom": "#352A25",
        "gram_text": "#FFFFFF",
        "harga_text": "#FCE592",
        "badge_bg": "#0E0A09",
        "badge_border": "#D4AF37",
        "badge_text": "#FFFFFF",
        "watermark": "#9E8E85",
    },
    "sabtu": {
        "day": "Sabtu",
        "date_str": "Sabtu, 29 November 2026",
        "name": "Warm Cashmere Taupe (Soft Light / Earth Pastel)",
        "concept": "Elegan akhir pekan, santai, nuansa kasmir bernuansa mewah.",
        "bg_grad_top": "#F4EFEA",
        "bg_grad_bottom": "#EBE2DA",
        "card_border": "#C5B4A5",
        "banner_bg": "#EBE2DA",
        "date_badge_bg": "#3B2E2A",
        "date_badge_border": "#58453F",
        "date_badge_text": "#FCEEE5",
        "table_border": "#C5B4A5",
        "table_header_bg": "#2B201D",
        "table_header_text": "#FAF3EE",
        "table_header_border_bottom": "#B49A88",
        "row_bg1": "#FAF7F5",
        "row_bg2": "#EFE7E0",
        "row_border_bottom": "#E2D8CF",
        "gram_text": "#291D1A",
        "harga_text": "#784714",
        "badge_bg": "#E2D6CC",
        "badge_border": "#B49A88",
        "badge_text": "#2B201D",
        "watermark": "#8F7D73",
    }
}

ITEMS = [
    {"gram": "1 gram", "harga": "Rp 1.450.000", "logam": "Antam"},
    {"gram": "5 gram", "harga": "Rp 7.050.000", "logam": "Antam"},
    {"gram": "10 gram", "harga": "Rp 14.000.000", "logam": "Antam"},
    {"gram": "1 gram", "harga": "Rp 1.420.000", "logam": "UBS"},
    {"gram": "5 gram", "harga": "Rp 6.900.000", "logam": "UBS"},
    {"gram": "1 gram", "harga": "Rp 1.430.000", "logam": "Galeri24"},
    {"gram": "10 gram", "harga": "Rp 250.000", "logam": "Perak Nadir"},
]

def render_card(theme_key, theme, output_path, logo_path):
    # Render at 2x scale for anti-aliasing and crisp typography
    SCALE = 2
    TARGET_WIDTH = 780
    WIDTH = TARGET_WIDTH * SCALE
    
    # Calculate exact vertical layout heights
    banner_h = int(185 * SCALE)
    badge_top_margin = int(14 * SCALE)
    badge_h = int(38 * SCALE)
    table_top_margin = int(14 * SCALE)
    
    th_h = int(40 * SCALE)
    row_h = int(42 * SCALE)
    num_rows = len(ITEMS)
    table_h = th_h + num_rows * row_h
    
    watermark_top_margin = int(14 * SCALE)
    font_wm_size = int(12.5 * SCALE)
    watermark_bottom_margin = int(18 * SCALE)
    
    HEIGHT = (banner_h + badge_top_margin + badge_h + table_top_margin + 
              table_h + watermark_top_margin + font_wm_size + watermark_bottom_margin)
    
    # 1. Background gradient (vertical linear)
    c1 = hex_to_rgb(theme["bg_grad_top"])
    c2 = hex_to_rgb(theme["bg_grad_bottom"])
    
    grad = Image.new("RGB", (1, HEIGHT))
    for y in range(HEIGHT):
        ratio = y / (HEIGHT - 1)
        r = int(c1[0] * (1 - ratio) + c2[0] * ratio)
        g = int(c1[1] * (1 - ratio) + c2[1] * ratio)
        b = int(c1[2] * (1 - ratio) + c2[2] * ratio)
        grad.putpixel((0, y), (r, g, b))
    
    img = grad.resize((WIDTH, HEIGHT), Image.Resampling.BILINEAR).convert("RGBA")
    draw = ImageDraw.Draw(img)
    
    # Fonts
    font_bold_path = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
    font_badge = ImageFont.truetype(font_bold_path, int(15 * SCALE))
    font_th = ImageFont.truetype(font_bold_path, int(13 * SCALE))
    font_gram = ImageFont.truetype(font_bold_path, int(15 * SCALE))
    font_harga = ImageFont.truetype(font_bold_path, int(16 * SCALE))
    font_logam = ImageFont.truetype(font_bold_path, int(12 * SCALE))
    font_wm = ImageFont.truetype(font_bold_path, font_wm_size)
    
    # 2. Banner Container (Solid color)
    banner_bg = hex_to_rgb(theme["banner_bg"])
    border_color = hex_to_rgb(theme["card_border"])
    draw.rectangle([0, 0, WIDTH, banner_h], fill=(*banner_bg, 255))
    line_col = tuple(int(bc * 0.35 + bb * 0.65) for bc, bb in zip(border_color, banner_bg))
    draw.line([0, banner_h, WIDTH, banner_h], fill=(*line_col, 255), width=int(1.5 * SCALE))
    
    # 3. Logo Placement
    if os.path.exists(logo_path):
        logo = Image.open(logo_path).convert("RGBA")
        target_w = int(360 * SCALE)
        target_h = int(target_w * logo.height / logo.width)
        logo_resized = logo.resize((target_w, target_h), Image.Resampling.LANCZOS)
        
        # Rounded mask for logo card
        logo_mask = Image.new("L", (target_w, target_h), 0)
        logo_mask_draw = ImageDraw.Draw(logo_mask)
        logo_mask_draw.rounded_rectangle([0, 0, target_w, target_h], radius=int(10 * SCALE), fill=255)
        
        logo_x = (WIDTH - target_w) // 2
        logo_y = (banner_h - target_h) // 2
        
        img.paste(logo_resized, (logo_x, logo_y), logo_mask)
        
        # Subtle hairline frame around logo
        logo_border = tuple(int(bc * 0.45 + bb * 0.55) for bc, bb in zip(border_color, banner_bg))
        draw.rounded_rectangle(
            [logo_x, logo_y, logo_x + target_w, logo_y + target_h],
            radius=int(10 * SCALE),
            outline=(*logo_border, 255),
            width=int(1 * SCALE)
        )
    
    # 4. Date Badge
    badge_m_x = int(24 * SCALE)
    badge_w = WIDTH - 2 * badge_m_x
    badge_y = banner_h + badge_top_margin
    
    date_bg = hex_to_rgb(theme["date_badge_bg"])
    date_border = hex_to_rgb(theme["date_badge_border"])
    draw.rounded_rectangle(
        [badge_m_x, badge_y, badge_m_x + badge_w, badge_y + badge_h],
        radius=int(8 * SCALE),
        fill=(*date_bg, 255),
        outline=(*date_border, 255),
        width=int(1.5 * SCALE)
    )
    
    date_text = theme["date_str"]
    bbox = font_badge.getbbox(date_text)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    tx = (WIDTH - tw) // 2
    ty = badge_y + (badge_h - th) // 2 - int(2 * SCALE)
    draw.text((tx, ty), date_text, font=font_badge, fill=(*hex_to_rgb(theme["date_badge_text"]), 255))
    
    # 5. Table Container (Solid base, rounded corners clipped cleanly)
    table_x = badge_m_x
    table_y = badge_y + badge_h + table_top_margin
    table_w = badge_w
    
    table_bg = Image.new("RGBA", (table_w, table_h), (*hex_to_rgb(theme["row_bg1"]), 255))
    t_draw = ImageDraw.Draw(table_bg)
    
    # Table Header
    th_bg = hex_to_rgb(theme["table_header_bg"])
    t_draw.rectangle([0, 0, table_w, th_h], fill=(*th_bg, 255))
    t_draw.line(
        [0, th_h - int(1.5 * SCALE), table_w, th_h - int(1.5 * SCALE)],
        fill=(*hex_to_rgb(theme["table_header_border_bottom"]), 255),
        width=int(2 * SCALE)
    )
    
    # Column coordinates:
    col1_x = int(24 * SCALE)
    col2_right_x = int(table_w * 0.70)
    col3_center_x = int(table_w * 0.85)
    
    th_color = hex_to_rgb(theme["table_header_text"])
    
    # Col 1 Title
    t1 = "UKURAN GRAM"
    bb1 = font_th.getbbox(t1)
    t_draw.text((col1_x, (th_h - (bb1[3] - bb1[1])) // 2 - int(2 * SCALE)), t1, font=font_th, fill=(*th_color, 255))
    
    # Col 2 Title
    t2 = "HARGA (RP)"
    bb2 = font_th.getbbox(t2)
    t_draw.text((col2_right_x - (bb2[2] - bb2[0]), (th_h - (bb2[3] - bb2[1])) // 2 - int(2 * SCALE)), t2, font=font_th, fill=(*th_color, 255))
    
    # Col 3 Title
    t3 = "LOGAM MULIA"
    bb3 = font_th.getbbox(t3)
    t_draw.text((col3_center_x - (bb3[2] - bb3[0]) // 2, (th_h - (bb3[3] - bb3[1])) // 2 - int(2 * SCALE)), t3, font=font_th, fill=(*th_color, 255))
    
    # 6. Table Rows
    for idx, item in enumerate(ITEMS):
        ry = th_h + idx * row_h
        rbg = hex_to_rgb(theme["row_bg1"] if idx % 2 == 0 else theme["row_bg2"])
        t_draw.rectangle([0, ry, table_w, ry + row_h], fill=(*rbg, 255))
        
        # Border bottom row
        t_draw.line(
            [0, ry + row_h - 1, table_w, ry + row_h - 1],
            fill=(*hex_to_rgb(theme["row_border_bottom"]), 255),
            width=1
        )
        
        # Gram text (Bold, high contrast)
        gt = item["gram"]
        gbb = font_gram.getbbox(gt)
        gy = ry + (row_h - (gbb[3] - gbb[1])) // 2 - int(2 * SCALE)
        t_draw.text((col1_x, gy), gt, font=font_gram, fill=(*hex_to_rgb(theme["gram_text"]), 255))
        
        # Harga text (Extra bold, sharp contrast)
        ht = item["harga"]
        hbb = font_harga.getbbox(ht)
        hx = col2_right_x - (hbb[2] - hbb[0])
        hy = ry + (row_h - (hbb[3] - hbb[1])) // 2 - int(2 * SCALE)
        t_draw.text((hx, hy), ht, font=font_harga, fill=(*hex_to_rgb(theme["harga_text"]), 255))
        
        # Badge Logam Mulia (Solid pill badge, 100% opaque)
        lt = item["logam"]
        lbb = font_logam.getbbox(lt)
        lw = lbb[2] - lbb[0]
        lh = lbb[3] - lbb[1]
        
        badge_pad_x = int(14 * SCALE)
        badge_pill_w = max(int(92 * SCALE), lw + badge_pad_x * 2)
        badge_pill_h = int(26 * SCALE)
        badge_pill_x = col3_center_x - badge_pill_w // 2
        badge_pill_y = ry + (row_h - badge_pill_h) // 2
        
        badge_bg_col = hex_to_rgb(theme["badge_bg"])
        badge_border_col = hex_to_rgb(theme["badge_border"])
        
        t_draw.rounded_rectangle(
            [badge_pill_x, badge_pill_y, badge_pill_x + badge_pill_w, badge_pill_y + badge_pill_h],
            radius=int(6 * SCALE),
            fill=(*badge_bg_col, 255),
            outline=(*badge_border_col, 255),
            width=int(1.2 * SCALE)
        )
        
        btx = badge_pill_x + (badge_pill_w - lw) // 2
        bty = badge_pill_y + (badge_pill_h - lh) // 2 - int(2 * SCALE)
        t_draw.text((btx, bty), lt, font=font_logam, fill=(*hex_to_rgb(theme["badge_text"]), 255))
    
    # Clip table corners smoothly
    t_mask = Image.new("L", (table_w, table_h), 0)
    tm_draw = ImageDraw.Draw(t_mask)
    tm_draw.rounded_rectangle([0, 0, table_w, table_h], radius=int(8 * SCALE), fill=255)
    
    # Paste table onto card
    img.paste(table_bg, (table_x, table_y), t_mask)
    
    # Draw table outer border outline
    draw.rounded_rectangle(
        [table_x, table_y, table_x + table_w, table_y + table_h],
        radius=int(8 * SCALE),
        outline=(*hex_to_rgb(theme["table_border"]), 255),
        width=int(1.5 * SCALE)
    )
    
    # 7. Watermark
    wm_text = "app developed by AisMu"
    wm_bb = font_wm.getbbox(wm_text)
    wm_w = wm_bb[2] - wm_bb[0]
    wm_h = wm_bb[3] - wm_bb[1]
    wm_x = (WIDTH - wm_w) // 2
    wm_y = table_y + table_h + watermark_top_margin
    draw.text((wm_x, wm_y), wm_text, font=font_wm, fill=(*hex_to_rgb(theme["watermark"]), 255))
    
    # 8. Card Outer Rounded Border
    card_r = int(16 * SCALE)
    border_w = int(2.5 * SCALE)
    
    draw.rounded_rectangle(
        [border_w // 2, border_w // 2, WIDTH - border_w // 2 - 1, HEIGHT - border_w // 2 - 1],
        radius=card_r,
        outline=(*border_color, 255),
        width=border_w
    )
    
    # Downsample cleanly with Lanczos to TARGET_WIDTH (780px) and convert to RGB
    # Mode RGB guarantees 100% solid output with no transparency issues in viewers or WhatsApp
    final_h = HEIGHT // SCALE
    final_img = img.resize((TARGET_WIDTH, final_h), Image.Resampling.LANCZOS).convert("RGB")
    
    final_img.save(output_path, "PNG", optimize=True)
    file_size_kb = os.path.getsize(output_path) / 1024
    print(f"[OK] Generated {os.path.basename(output_path)}: {TARGET_WIDTH}x{final_h}px ({file_size_kb:.1f} KB, RGB Solid)")

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    logo_path = os.path.join(os.path.dirname(script_dir), "logo.jpg")
    
    print("=" * 60)
    print("Rumaisho Gold - Daily Snapshot PNG Template Generator")
    print(f"Target Directory: {script_dir}")
    print(f"Logo Path: {logo_path}")
    print("=" * 60)
    
    for key, theme in THEMES.items():
        out_filename = f"template-{key}.png"
        out_path = os.path.join(script_dir, out_filename)
        render_card(key, theme, out_path, logo_path)
    
    print("=" * 60)
    print("All 6 daily templates successfully generated in solid RGB!")

if __name__ == "__main__":
    main()

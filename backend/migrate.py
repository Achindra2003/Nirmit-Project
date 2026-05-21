import re

with open(r"C:\Users\achindras\Documents\Capstone Project Research\nirmit-project\backend\app\domain\presets\layouts.py", "r", encoding="utf-8") as f:
    code = f.read()

code = code.replace("FractionalItem as F", "AnchoredItem as A")
code = code.replace("FractionalItem", "AnchoredItem")

def replacer2(m):
    sub = m.group(1)
    x_frac = float(m.group(2))
    z_frac = float(m.group(3))
    rest = m.group(4)
    
    # x anchor
    if x_frac < 0.34:
        ax = '"W"'
        ox = int(x_frac * 4000)
    elif x_frac > 0.66:
        ax = '"E"'
        ox = int((x_frac - 1.0) * 4000)
    else:
        ax = '"C"'
        ox = int((x_frac - 0.5) * 4000)
        
    # z anchor
    if z_frac < 0.34:
        az = '"S"'
        oz = int(z_frac * 4000)
    elif z_frac > 0.66:
        az = '"N"'
        oz = int((z_frac - 1.0) * 4000)
    else:
        az = '"C"'
        oz = int((z_frac - 0.5) * 4000)
        
    # Overrides for perfect flanking
    if "side_table" in sub:
        if x_frac > 0.66:
            ax = '"C"'
            ox = 1360
        elif x_frac < 0.34 and x_frac > 0.1: 
            ax = '"C"'
            ox = -1360
            
    return f'A({sub}, anchor_x={ax}, offset_x_mm={ox}, anchor_z={az}, offset_z_mm={oz}, {rest}'

pattern = re.compile(r'F\(([^,]+),\s*x_frac=([0-9.]+),\s*z_frac=([0-9.]+),\s*(.*?)(?=\))')
new_code = pattern.sub(replacer2, code)

with open(r"C:\Users\achindras\Documents\Capstone Project Research\nirmit-project\backend\app\domain\presets\layouts.py", "w", encoding="utf-8") as f:
    f.write(new_code)
print("Migration completed.")

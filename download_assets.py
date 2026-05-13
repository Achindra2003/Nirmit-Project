import os
import urllib.request
import zipfile
import subprocess
import shutil

items = {
    "sofa_3seat": "https://www.sweethome3d.com/wp-content/themes/sweet-home-3d/theme/assets/models/scopia/beige_sofa.zip",
    "sofa_l": "https://www.sweethome3d.com/wp-content/themes/sweet-home-3d/theme/assets/models/blendswap-cc-by/cornerSofa.zip",
    "tv_unit": "https://www.sweethome3d.com/wp-content/themes/sweet-home-3d/theme/assets/models/blendswap-cc-by/tvStand.zip",
    "coffee_table": "https://www.sweethome3d.com/wp-content/themes/sweet-home-3d/theme/assets/models/blendswap-cc-by/coffeeTable.zip",
    "lounge_chair": "https://www.sweethome3d.com/wp-content/themes/sweet-home-3d/theme/assets/models/blendswap-cc-by/armchair1.zip",
    "ottoman": "https://www.sweethome3d.com/wp-content/themes/sweet-home-3d/theme/assets/models/katorlegaz/chair-ottoman.zip",
    "bookshelf": "https://www.sweethome3d.com/wp-content/themes/sweet-home-3d/theme/assets/models/blendswap-cc-by/bookcase.zip",
    "lamp_floor": "https://www.sweethome3d.com/wp-content/themes/sweet-home-3d/theme/assets/models/blendswap-cc-by/lamp.zip",
    "rug": "https://www.sweethome3d.com/wp-content/themes/sweet-home-3d/theme/assets/models/katorlegaz/oriental-rug.zip",
    "chair": "https://www.sweethome3d.com/wp-content/themes/sweet-home-3d/theme/assets/models/blendswap-cc-by/chair4.zip",
    "fan": "https://www.sweethome3d.com/wp-content/themes/sweet-home-3d/theme/assets/models/contributions/ceilingFan.zip",
    "plant": "https://www.sweethome3d.com/wp-content/themes/sweet-home-3d/theme/assets/models/blendswap-cc-by/mediumIndoorPlant.zip"
}

os.makedirs("temp_models", exist_ok=True)
out_dir = os.path.abspath("frontend/public/models")

opener = urllib.request.build_opener()
opener.addheaders = [('User-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)')]
urllib.request.install_opener(opener)

for name, url in items.items():
    print(f"Processing {name}...")
    zip_path = os.path.join("temp_models", f"{name}.zip")
    extract_dir = os.path.join("temp_models", name)
    
    if not os.path.exists(zip_path):
        urllib.request.urlretrieve(url, zip_path)
    
    os.makedirs(extract_dir, exist_ok=True)
    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
        zip_ref.extractall(extract_dir)
    
    # Find .obj file
    obj_file = None
    for root, dirs, files in os.walk(extract_dir):
        for file in files:
            if file.lower().endswith('.obj'):
                obj_file = os.path.join(root, file)
                break
        if obj_file:
            break
            
    if not obj_file:
        print(f"No OBJ found for {name}")
        continue
        
    out_glb = os.path.join(out_dir, f"{name}.glb")
    print(f"Converting {obj_file} to {out_glb}")
    subprocess.run(["npx.cmd", "obj2gltf", "-i", obj_file, "-o", out_glb], check=True)
    
print("Done!")

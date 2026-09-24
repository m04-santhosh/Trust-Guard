import os
import sys
import cv2
import numpy as np

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
from backend.modules.visual_evidence import analyze_visual, _analyze_single_frame

samples_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "test_calibration"))
png_files = [f for f in os.listdir(samples_dir) if f.endswith('.png')]

print("=== MULTI-GENERATION RECOMPRESSION EXPERIMENT ===")
results = {}

for fname in sorted(png_files):
    base_name = fname.replace('.png', '')
    orig_path = os.path.join(samples_dir, fname)
    img = cv2.imread(orig_path)
    
    # Gen 1: Q=70
    g1_path = os.path.join(samples_dir, f"{base_name}_gen1_q70.jpg")
    cv2.imwrite(g1_path, img, [int(cv2.IMWRITE_JPEG_QUALITY), 70])
    
    # Gen 2: reopen Q70, save Q=60
    img_g1 = cv2.imread(g1_path)
    g2_path = os.path.join(samples_dir, f"{base_name}_gen2_q60.jpg")
    cv2.imwrite(g2_path, img_g1, [int(cv2.IMWRITE_JPEG_QUALITY), 60])
    
    # Gen 3: reopen Q60, save Q=50
    img_g2 = cv2.imread(g2_path)
    g3_path = os.path.join(samples_dir, f"{base_name}_gen3_q50.jpg")
    cv2.imwrite(g3_path, img_g2, [int(cv2.IMWRITE_JPEG_QUALITY), 50])
    
    # Gen 4: reopen Q50, save Q=45
    img_g3 = cv2.imread(g3_path)
    g4_path = os.path.join(samples_dir, f"{base_name}_gen4_q45.jpg")
    cv2.imwrite(g4_path, img_g3, [int(cv2.IMWRITE_JPEG_QUALITY), 45])
    
    scores = {}
    gen_list = [
        ("Gen0 (PNG)", orig_path),
        ("Gen1 (Q70)", g1_path),
        ("Gen2 (Q60)", g2_path),
        ("Gen3 (Q50)", g3_path),
        ("Gen4 (Q45)", g4_path),
    ]
    for gen_name, p in gen_list:
        res = analyze_visual([p])
        raw_m = _analyze_single_frame(cv2.imread(p))
        scores[gen_name] = {
            "score": res["raw_score"],
            "band": res["band"],
            "ela_std": round(raw_m[1], 2),
            "lap_var": round(raw_m[2], 1),
            "hf_ratio": round(raw_m[3], 3),
        }
    results[base_name] = scores

for sname, gens in results.items():
    print(f"\n--- {sname} ---")
    for gname, data in gens.items():
        print(f"  {gname:12}: score={data['score']:0.3f}, band={data['band']:6}, ela_std={data['ela_std']:5.2f}, lap_var={data['lap_var']:7.1f}, hf_ratio={data['hf_ratio']:0.3f}")

# Test genuinely manipulated/spliced images:
# Case A: Spliced uncompressed patch into a compressed image
splice_target = cv2.imread(os.path.join(samples_dir, "sample1_portrait_gen3_q50.jpg"))
foreign_block = cv2.imread(os.path.join(samples_dir, "sample2_outdoor.png"))[100:250, 100:250]
splice_target[150:300, 200:350] = foreign_block
spliced_test_path = os.path.join(samples_dir, "test_manipulated_splice_A.jpg")
cv2.imwrite(spliced_test_path, splice_target, [int(cv2.IMWRITE_JPEG_QUALITY), 95])

res_A = analyze_visual([spliced_test_path])
raw_A = _analyze_single_frame(cv2.imread(spliced_test_path))

# Case B: Spliced patch into studio broadcast
splice_target_B = cv2.imread(os.path.join(samples_dir, "sample3_studio_gen2_q60.jpg"))
foreign_B = cv2.imread(os.path.join(samples_dir, "sample4_document.png"))[100:220, 100:300]
splice_target_B[100:220, 100:300] = foreign_B
spliced_B_path = os.path.join(samples_dir, "test_manipulated_splice_B.jpg")
cv2.imwrite(spliced_B_path, splice_target_B, [int(cv2.IMWRITE_JPEG_QUALITY), 92])

res_B = analyze_visual([spliced_B_path])
raw_B = _analyze_single_frame(cv2.imread(spliced_B_path))

print("\n=== MANIPULATED / SPLICED TEST CASES ===")
print(f"  Spliced Case A: score={res_A['raw_score']:0.3f}, band={res_A['band']:6}, ela_std={raw_A[1]:5.2f}, lap_var={raw_A[2]:7.1f}, hf_ratio={raw_A[3]:0.3f}")
print(f"  Spliced Case B: score={res_B['raw_score']:0.3f}, band={res_B['band']:6}, ela_std={raw_B[1]:5.2f}, lap_var={raw_B[2]:7.1f}, hf_ratio={raw_B[3]:0.3f}")

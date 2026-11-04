"""Convert the official Real-ESRGAN `realesr-general-x4v3.pth` to ONNX.

Usage (Python 3.11, CPU-only PyTorch is enough):

    python -m venv venv
    venv/bin/pip install --index-url https://download.pytorch.org/whl/cpu torch==2.15.0
    venv/bin/pip install onnx==1.23.2 onnxruntime==1.31.1 numpy onnxscript
    curl -L -o realesr-general-x4v3.pth \
      https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.5.0/realesr-general-x4v3.pth
    venv/bin/python scripts/enhance/convert-realesrgan.py realesr-general-x4v3.pth public/models/realesr-general-x4v3.onnx

The network (SRVGGNetCompact) is re-declared here exactly as in the official
repository (realesrgan/archs/srvgg_arch.py, BSD-3-Clause, xinntao/Real-ESRGAN),
so the conversion does not need basicsr or realesrgan installed.
Input: float32 NCHW RGB in [0, 1], any height and width. Output: 4x larger.
See docs/mejorar-foto-modelo.md for hashes and checks.
"""

import hashlib
import sys

import numpy as np
import torch
import torch.nn.functional as F
from torch import nn

EXPECTED_PTH_SHA256 = "8dc7edb9ac80ccdc30c3a5dca6616509367f05fbc184ad95b731f05bece96292"


class SRVGGNetCompact(nn.Module):
    def __init__(self, num_in_ch=3, num_out_ch=3, num_feat=64, num_conv=32, upscale=4):
        super().__init__()
        self.upscale = upscale
        self.body = nn.ModuleList()
        self.body.append(nn.Conv2d(num_in_ch, num_feat, 3, 1, 1))
        self.body.append(nn.PReLU(num_parameters=num_feat))
        for _ in range(num_conv):
            self.body.append(nn.Conv2d(num_feat, num_feat, 3, 1, 1))
            self.body.append(nn.PReLU(num_parameters=num_feat))
        self.body.append(nn.Conv2d(num_feat, num_out_ch * upscale * upscale, 3, 1, 1))
        self.upsampler = nn.PixelShuffle(upscale)

    def forward(self, x):
        out = x
        for layer in self.body:
            out = layer(out)
        out = self.upsampler(out)
        return out + F.interpolate(x, scale_factor=self.upscale, mode="nearest")


def sha256(path):
    with open(path, "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()


def main(src, dst):
    digest = sha256(src)
    if digest != EXPECTED_PTH_SHA256:
        sys.exit(f"unexpected sha256 for {src}: {digest}")
    state = torch.load(src, map_location="cpu", weights_only=True)
    state = state.get("params_ema", state.get("params", state))
    model = SRVGGNetCompact()
    model.load_state_dict(state, strict=True)
    model.eval()

    dummy = torch.rand(1, 3, 64, 64)
    torch.onnx.export(
        model,
        (dummy,),
        dst,
        input_names=["input"],
        output_names=["output"],
        dynamic_axes={"input": {2: "height", 3: "width"}, "output": {2: "height4", 3: "width4"}},
        opset_version=17,
        dynamo=False,
    )

    # Same output as PyTorch on a random tile of another size.
    import onnxruntime as ort

    x = torch.rand(1, 3, 48, 80)
    with torch.no_grad():
        ref = model(x).numpy()
    sess = ort.InferenceSession(dst, providers=["CPUExecutionProvider"])
    got = sess.run(None, {"input": x.numpy()})[0]
    err = float(np.abs(ref - got).max())
    print(f"shape {got.shape}, max abs diff vs PyTorch {err:.2e}")
    if got.shape != (1, 3, 192, 320) or err > 1e-4:
        sys.exit("ONNX output does not match PyTorch")
    print(f"sha256 {dst}: {sha256(dst)}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])

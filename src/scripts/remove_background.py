import sys
import os
import argparse
import json
from rembg import remove, new_session
from PIL import Image

def main():
    parser = argparse.ArgumentParser(description="Clean background removal for garment and try-on images")
    parser.add_argument("--input", required=True, help="Input image file path")
    parser.add_argument("--output", required=True, help="Output image file path (PNG recommended)")
    parser.add_argument("--model", default="u2netp", help="Model name (default: u2netp)")
    parser.add_argument("--white-bg", action="store_true", help="Composite onto solid white background instead of transparent")

    args = parser.parse_args()

    if not os.path.exists(args.input):
        print(json.dumps({"success": False, "error": f"Input file not found: {args.input}"}))
        sys.exit(1)

    try:
        session = new_session(args.model)
        img = Image.open(args.input)
        
        # Remove background
        output = remove(img, session=session)

        # Optional composite onto clean pure white background
        if args.white_bg:
            bg = Image.new("RGBA", output.size, (255, 255, 255, 255))
            output = Image.alpha_composite(bg, output).convert("RGB")

        # Ensure destination directory exists
        os.makedirs(os.path.dirname(os.path.abspath(args.output)), exist_ok=True)
        output.save(args.output)

        print(json.dumps({"success": True, "outputPath": args.output}))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()

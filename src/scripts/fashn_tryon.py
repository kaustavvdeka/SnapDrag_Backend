import sys
import os
import json
import argparse
from gradio_client import Client, handle_file

def main():
    parser = argparse.ArgumentParser(description="FASHN VTON 1.5 Gradio Client Bridge")
    parser.add_argument("--person-image", required=True, help="Path to local user image file")
    parser.add_argument("--garment-image", required=True, help="Path to local garment image file or URL")
    parser.add_argument("--category", default="one-pieces", choices=["tops", "bottoms", "one-pieces"], help="Garment category")
    parser.add_argument("--garment-photo-type", default="flat-lay", choices=["flat-lay", "model"], help="Garment photo type")
    parser.add_argument("--num-timesteps", type=int, default=50, help="Inference timesteps")
    parser.add_argument("--guidance-scale", type=float, default=1.5, help="Guidance scale")
    parser.add_argument("--seed", type=int, default=42, help="Random seed")
    parser.add_argument("--segmentation-free", action="store_true", default=True, help="Segmentation free flag")
    
    args = parser.parse_args()

    hf_token = os.environ.get("HF_TOKEN", None)

    try:
        # Initialize Gradio client for fashn-ai/fashn-vton-1.5
        if hf_token:
            client = Client("fashn-ai/fashn-vton-1.5", hf_token=hf_token)
        else:
            client = Client("fashn-ai/fashn-vton-1.5")

        person_handle = handle_file(args.person_image)
        garment_handle = handle_file(args.garment_image)

        result = client.predict(
            person_image=person_handle,
            garment_image=garment_handle,
            category=args.category,
            garment_photo_type=args.garment_photo_type,
            num_timesteps=args.num_timesteps,
            guidance_scale=args.guidance_scale,
            seed=args.seed,
            segmentation_free=args.segmentation_free,
            api_name="/try_on"
        )

        output = {
            "success": True,
            "data": result
        }
        print(json.dumps(output))
    except Exception as e:
        output = {
            "success": False,
            "error": str(e)
        }
        print(json.dumps(output))
        sys.exit(1)

if __name__ == "__main__":
    main()

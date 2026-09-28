"""Prepare an UNAPPROVED import manifest from existing sample metadata/artwork."""

import json
from pathlib import Path

root = Path(__file__).resolve().parents[2]
records = json.loads((root / "src/data/designs.json").read_text(encoding="utf-8"))
posts = []
for row in records:
    suffixes = {
        "thumbnail": "thumb",
        "hero": "hero",
        "mobileHero": "mobile-hero",
        "mobile": "mobile",
        "desktop": "desktop",
    }
    if row.get("chat"):
        suffixes["whatsapp"] = "whatsapp"
    if row.get("status"):
        suffixes["status"] = "status"
    posts.append(
        {
            "slug": row["slug"],
            "title": row["title"],
            "quote": row["quote"],
            "description": row["scene"],
            "themes": row["themes"],
            "styles": [row["style"]],
            "editorialDate": row["date"],
            "editorialApproved": False,
            "rightsApproved": False,
            "assets": {
                role: {
                    "path": f"../public/wallpapers/{row['slug']}-{suffix}.jpg",
                    "alt": f"{row['title']}. {row['quote']}",
                }
                for role, suffix in suffixes.items()
            },
        }
    )
target = root / "backend/sample-manifest.json"
target.write_text(json.dumps(posts, indent=2) + "\n", encoding="utf-8")
print(f"Created {target.name}; review artwork and rights before setting approvals.")

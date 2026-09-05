def parse_results(lens_data):

    results = []
    seen_links = set()

    visual_matches = lens_data.get("visual_matches", [])

    for item in visual_matches:

        title = item.get("title")
        source = item.get("source")
        link = item.get("link")

        # Skip incomplete results
        if not title or not link:
            continue

        # Remove duplicate links
        if link in seen_links:
            continue

        seen_links.add(link)

        results.append({
            "title": title,
            "source": source,
            "link": link
        })

    # Handle no usable results
    if not results:
        print("✗ No valid matching sources found.")

    return results
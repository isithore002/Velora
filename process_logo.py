import png

# Read the image
reader = png.Reader("apps/web/public/logo.png")
width, height, rows, info = reader.asRGBA8()

# Process rows
new_rows = []
for row in rows:
    new_row = bytearray(row)
    # Loop over pixels (R, G, B, A)
    for i in range(0, len(new_row), 4):
        r, g, b, a = new_row[i], new_row[i+1], new_row[i+2], new_row[i+3]
        
        # Calculate brightness / alpha based on the green channel
        # We want the black background to become transparent.
        # But we also want the green glow to be semi-transparent.
        # Using the green channel as the alpha channel works well for neon-on-black.
        # We also boost the color a bit so the glow remains bright.
        
        alpha = max(r, g, b)
        
        if alpha < 10:
            new_row[i+3] = 0
        else:
            new_row[i+3] = alpha
            # Optionally normalize colors to be pure neon if desired,
            # but keeping original RGB works if alpha is set right.
    new_rows.append(new_row)

# Write the new image
writer = png.Writer(width, height, **info)
with open("apps/web/public/logo_transparent.png", "wb") as f:
    writer.write(f, new_rows)

print("Created logo_transparent.png")

# Product Template

This folder contains the template structure for new NO3D Tools products.

## Required Files

### 1. `{ProductName}.blend`
- The main Blender file containing the asset
- Should be optimized and clean
- Include proper scene units (metric, 0.001 scale, millimeters)

### 2. `{ProductName}.json`
- Product metadata in JSON format
- Must validate against `schemas/product-metadata.schema.json`
- See `{ProductName}.json.example` for template

### 3. `icon_{ProductName}.png`
- Product thumbnail/icon image
- Recommended size: 512x512px or 1024x1024px
- Format: PNG with transparency support
- Should clearly represent the product

## Optional Files

### 4. `{ProductName}_desc.md`
- Detailed product description in Markdown
- Can include usage instructions, features, etc.
- Will be used for website product pages

### 5. `{ProductName}.mp4` or `{ProductName}.gif`
- Video preview of the product in action
- Helps users understand functionality
- MP4 preferred for quality, GIF for compatibility

### 6. `preview_{ProductName}.png`
- Additional preview images
- Can show different angles or use cases
- Multiple preview images can be numbered: `preview_{ProductName}_1.png`, etc.

## Naming Conventions

- **Folder name**: Use PascalCase with spaces (e.g., "Dojo Bolt Gen v05")
- **Blend file**: Same as folder name
- **JSON file**: Same as folder name
- **Icon file**: `icon_{ProductName}.png`
- **Description file**: `{ProductName}_desc.md`
- **Video files**: `{ProductName}.mp4` or `{ProductName}.gif`

## Validation

Run the validation script to check your product:

```bash
python3 scripts/validate-products.py
```

This will validate:
- JSON schema compliance
- Required files presence
- Business rule compliance
- File naming conventions

# SOLVET System - Shared Resources

This repository contains shared resources for the SOLVET System ecosystem.

## Contents

### 📋 Schemas
JSON schemas for validating product metadata and ensuring consistency across all SOLVET tools.

- `schemas/product-metadata.schema.json` - Product metadata validation schema

### 🛠️ Scripts
Utility scripts for product validation and media optimization.

- `scripts/validate-products.py` - Validate product JSON files against schema
- `scripts/optimize-media.py` - Optimize images and media files

### 📄 Templates
Product templates for creating new assets.

- `templates/product-template/` - Template structure for new products

### 📚 Documentation
Architecture documentation and guides for the SOLVET System.

- `docs/MULTI_REPO_ARCHITECTURE.md` - Multi-repo architecture guide
- `docs/REPO_CONNECTION_PATTERNS.md` - Repository connection patterns
- `docs/Solvet System - Project Github structure readme.md` - Local workspace setup guide

## Requirements

```bash
pip install -r requirements.txt
```

## Related Repositories

- [no3d-tools-library](https://github.com/node-dojo/no3d-tools-library) - Asset database
- [no3d-tools-website](https://github.com/your-org/no3d-tools-website) - E-commerce website
- [no3d-tools-addon](https://github.com/your-org/no3d-tools-addon) - Blender add-on

## Usage

### Validate Products

```bash
python scripts/validate-products.py /path/to/product/folder
```

### Optimize Media

```bash
python scripts/optimize-media.py /path/to/media/files
```

## License

Part of the SOLVET System ecosystem.

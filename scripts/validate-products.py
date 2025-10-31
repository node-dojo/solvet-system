#!/usr/bin/env python3
"""
NO3D Tools Product Validation Script

Validates all product metadata JSON files against the schema and checks
for required files in each product folder.
"""

import json
import os
import sys
from pathlib import Path
from typing import List, Dict, Any, Tuple
import jsonschema
from jsonschema import validate, ValidationError

# Add the schemas directory to the path
SCRIPT_DIR = Path(__file__).parent
REPO_ROOT = SCRIPT_DIR.parent
SCHEMA_PATH = REPO_ROOT / "schemas" / "product-metadata.schema.json"

class ProductValidator:
    def __init__(self, repo_root: Path):
        self.repo_root = Path(repo_root)
        self.schema = self._load_schema()
        self.errors = []
        self.warnings = []
        
    def _load_schema(self) -> Dict[str, Any]:
        """Load the JSON schema for validation."""
        try:
            with open(SCHEMA_PATH, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            print(f"ERROR: Schema file not found at {SCHEMA_PATH}")
            sys.exit(1)
        except json.JSONDecodeError as e:
            print(f"ERROR: Invalid JSON in schema file: {e}")
            sys.exit(1)
    
    def validate_all_products(self) -> bool:
        """Validate all products in the repository."""
        print("🔍 Validating NO3D Tools products...")
        print(f"Repository root: {self.repo_root}")
        print(f"Schema: {SCHEMA_PATH}")
        print("-" * 50)
        
        # Find all product folders
        product_folders = self._find_product_folders()
        
        if not product_folders:
            self.errors.append("No product folders found")
            return False
        
        print(f"Found {len(product_folders)} product folders")
        print()
        
        all_valid = True
        
        for folder in product_folders:
            print(f"📁 Validating: {folder.name}")
            is_valid = self._validate_product_folder(folder)
            if not is_valid:
                all_valid = False
            print()
        
        # Print summary
        self._print_summary()
        
        return all_valid
    
    def _find_product_folders(self) -> List[Path]:
        """Find all product folders (exclude system folders)."""
        exclude_folders = {
            'Assets', 'consolidated-icons', 'schemas', 'scripts', 'templates',
            '.git', '.github', 'node_modules', '__pycache__', 'no3d-tools-site'
        }
        
        folders = []
        for item in self.repo_root.iterdir():
            if (item.is_dir() and 
                item.name not in exclude_folders and 
                not item.name.startswith('.')):
                folders.append(item)
        
        return sorted(folders)
    
    def _validate_product_folder(self, folder: Path) -> bool:
        """Validate a single product folder."""
        folder_valid = True
        
        # Check for required files
        required_files = {
            'blend_file': f"{folder.name}.blend",
            'metadata_file': f"{folder.name}.json",
            'icon_file': f"icon_{folder.name}.png"
        }
        
        for file_type, filename in required_files.items():
            file_path = folder / filename
            if not file_path.exists():
                self.errors.append(f"{folder.name}: Missing {file_type} ({filename})")
                folder_valid = False
            else:
                print(f"  ✅ {filename}")
        
        # Validate JSON metadata
        json_file = folder / f"{folder.name}.json"
        if json_file.exists():
            try:
                with open(json_file, 'r') as f:
                    metadata = json.load(f)
                
                # Validate against schema
                validate(instance=metadata, schema=self.schema)
                print(f"  ✅ {folder.name}.json (schema valid)")
                
                # Additional business logic checks
                self._check_business_rules(folder.name, metadata)
                
            except ValidationError as e:
                self.errors.append(f"{folder.name}: JSON validation error - {e.message}")
                folder_valid = False
            except json.JSONDecodeError as e:
                self.errors.append(f"{folder.name}: Invalid JSON - {e}")
                folder_valid = False
            except Exception as e:
                self.errors.append(f"{folder.name}: Unexpected error - {e}")
                folder_valid = False
        
        # Check for optional files
        optional_files = {
            'description': f"{folder.name}_desc.md",
            'video': f"{folder.name}.mp4",
            'gif': f"{folder.name}.gif"
        }
        
        for file_type, filename in optional_files.items():
            file_path = folder / filename
            if file_path.exists():
                print(f"  ✅ {filename} (optional)")
        
        return folder_valid
    
    def _check_business_rules(self, product_name: str, metadata: Dict[str, Any]):
        """Check additional business rules beyond schema validation."""
        
        # Check that handle matches folder name
        expected_handle = product_name.lower().replace(' ', '-').replace('_', '-')
        if metadata.get('handle') != expected_handle:
            self.warnings.append(
                f"{product_name}: Handle '{metadata.get('handle')}' doesn't match folder name pattern"
            )
        
        # Check that SKU follows pattern
        sku = metadata.get('variants', [{}])[0].get('sku', '')
        expected_sku_prefix = f"NO3D-TOOLS-{product_name.upper().replace(' ', '-').replace('_', '-')}"
        if not sku.startswith('NO3D-TOOLS-'):
            self.warnings.append(f"{product_name}: SKU doesn't follow NO3D-TOOLS pattern")
        
        # Check for required metafields
        metafields = {mf['key']: mf for mf in metadata.get('metafields', [])}
        required_metafields = ['asset_type', 'blender_version', 'export_date', 'blend_file', 'thumbnail']
        
        for field in required_metafields:
            if field not in metafields:
                self.warnings.append(f"{product_name}: Missing required metafield '{field}'")
    
    def _print_summary(self):
        """Print validation summary."""
        print("=" * 50)
        print("VALIDATION SUMMARY")
        print("=" * 50)
        
        if self.errors:
            print(f"❌ ERRORS ({len(self.errors)}):")
            for error in self.errors:
                print(f"  • {error}")
            print()
        
        if self.warnings:
            print(f"⚠️  WARNINGS ({len(self.warnings)}):")
            for warning in self.warnings:
                print(f"  • {warning}")
            print()
        
        if not self.errors and not self.warnings:
            print("✅ All products are valid!")
        elif not self.errors:
            print("✅ All products pass validation (warnings only)")
        else:
            print("❌ Some products have validation errors")

def main():
    """Main function."""
    if len(sys.argv) > 1:
        repo_root = Path(sys.argv[1])
    else:
        repo_root = REPO_ROOT
    
    if not repo_root.exists():
        print(f"ERROR: Repository root does not exist: {repo_root}")
        sys.exit(1)
    
    validator = ProductValidator(repo_root)
    success = validator.validate_all_products()
    
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()

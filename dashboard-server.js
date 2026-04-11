#!/usr/bin/env node

/**
 * Local Dashboard Server
 * Enables product-dashboard.html to write to local filesystem and sync with Polar
 *
 * Usage:
 *   node dashboard-server.js
 *   Then open http://localhost:3000 in your browser
 */

const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');
const { addBulkChangelogEntry } = require('./utils/changelog-helper');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Import Polar SDK (dynamic import for ESM)
let polar;
(async () => {
  const { Polar } = await import('@polar-sh/sdk');
  polar = new Polar({
    accessToken: process.env.POLAR_API_TOKEN
  });
})();

const app = express();
const PORT = 3000;

// Configuration
const LIBRARY_PATH = path.join(__dirname, '..', 'no3d-tools-library');
const WEBSITE_PATH = path.join(__dirname, '..', 'no3d-tools-website');
const POLAR_ORG_ID = process.env.POLAR_ORG_ID;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve the dashboard
app.use(express.static(__dirname));

// API: Save product JSON to local filesystem
app.post('/api/sync-local-file', async (req, res) => {
  try {
    const { filePath, content } = req.body;

    if (!filePath || !content) {
      return res.status(400).json({ error: 'Missing filePath or content' });
    }

    // Determine full path based on file type
    let fullPath;
    let relativePath;

    // Check if path already includes full repo path
    if (filePath.includes('no3d-tools-library')) {
      relativePath = filePath.replace(/^.*no3d-tools-library\//, '');
      fullPath = path.join(LIBRARY_PATH, relativePath);
    } else if (filePath.includes('no3d-tools-website')) {
      relativePath = filePath.replace(/^.*no3d-tools-website\//, '');
      fullPath = path.join(WEBSITE_PATH, relativePath);
    } else {
      // Relative path - determine which repo based on file location
      // Product JSON files go to library, everything else to website
      if (filePath.match(/^Dojo|\.json$/)) {
        // Library product file
        fullPath = path.join(LIBRARY_PATH, filePath);
      } else {
        // Website file (like polar-products.js)
        fullPath = path.join(WEBSITE_PATH, filePath);
      }
    }

    // Ensure directory exists
    await fs.mkdir(path.dirname(fullPath), { recursive: true });

    // If this is a product JSON file, add changelog entry before saving
    let finalContent = content;
    if (filePath.match(/Dojo.*\.json$/) || (filePath.endsWith('.json') && !filePath.includes('polar-products'))) {
      try {
        const productData = JSON.parse(content);
        // Only add changelog if it's a product metadata file (has title, variants, etc.)
        if (productData.title && productData.variants) {
          addBulkChangelogEntry(productData);
          finalContent = JSON.stringify(productData, null, 2);
        }
      } catch (e) {
        // If JSON parsing fails, use original content
        console.warn('Could not parse JSON for changelog addition, using original content');
      }
    }

    // Write file
    await fs.writeFile(fullPath, finalContent, 'utf8');

    const stats = await fs.stat(fullPath);

    console.log(`✅ Saved: ${path.relative(__dirname, fullPath)}`);
    console.log(`   Size: ${stats.size} bytes`);

    res.json({
      success: true,
      path: fullPath,
      size: stats.size
    });

  } catch (error) {
    console.error('❌ Save failed:', error);
    res.status(500).json({
      error: error.message,
      stack: error.stack
    });
  }
});

// API: Save product icon to local filesystem
app.post('/api/sync-local-icon', async (req, res) => {
  try {
    const { filePath, base64Content } = req.body;

    if (!filePath || !base64Content) {
      return res.status(400).json({ error: 'Missing filePath or base64Content' });
    }

    // Determine full path
    let fullPath;
    if (filePath.includes('no3d-tools-library') || !filePath.includes('/')) {
      const relativePath = filePath.replace(/^.*no3d-tools-library\//, '');
      fullPath = path.join(LIBRARY_PATH, relativePath);
    } else {
      const relativePath = filePath.replace(/^.*no3d-tools-website\//, '');
      fullPath = path.join(WEBSITE_PATH, relativePath);
    }

    // Ensure directory exists
    await fs.mkdir(path.dirname(fullPath), { recursive: true });

    // Write binary file from base64
    const buffer = Buffer.from(base64Content, 'base64');
    await fs.writeFile(fullPath, buffer);

    const stats = await fs.stat(fullPath);

    console.log(`✅ Saved icon: ${path.relative(__dirname, fullPath)}`);
    console.log(`   Size: ${stats.size} bytes`);

    res.json({
      success: true,
      path: fullPath,
      size: stats.size
    });

  } catch (error) {
    console.error('❌ Icon save failed:', error);
    res.status(500).json({
      error: error.message,
      stack: error.stack
    });
  }
});

// API: Read local file
app.get('/api/read-local-file', async (req, res) => {
  try {
    const { filePath } = req.query;

    if (!filePath) {
      return res.status(400).json({ error: 'Missing filePath' });
    }

    let fullPath;
    if (filePath.includes('no3d-tools-library') || !filePath.includes('/')) {
      const relativePath = filePath.replace(/^.*no3d-tools-library\//, '');
      fullPath = path.join(LIBRARY_PATH, relativePath);
    } else {
      const relativePath = filePath.replace(/^.*no3d-tools-website\//, '');
      fullPath = path.join(WEBSITE_PATH, relativePath);
    }

    const content = await fs.readFile(fullPath, 'utf8');

    res.json({
      success: true,
      content
    });

  } catch (error) {
    console.error('❌ Read failed:', error);
    res.status(404).json({
      error: error.message
    });
  }
});

// API: Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    libraryPath: LIBRARY_PATH,
    websitePath: WEBSITE_PATH,
    polarConfigured: !!process.env.POLAR_API_TOKEN
  });
});

// API: Sync product to Polar
app.post('/api/sync-to-polar', async (req, res) => {
  try {
    if (!polar) {
      return res.status(500).json({ error: 'Polar SDK not initialized' });
    }

    const { productData } = req.body;

    if (!productData || !productData.title) {
      return res.status(400).json({ error: 'Missing product data or title' });
    }

    // Fetch existing products from Polar
    const result = await polar.products.list({
      organizationId: POLAR_ORG_ID,
      limit: 100,
      isArchived: false
    });

    const polarProducts = result.result?.items || [];

    // Find existing product by name
    let existingProduct = polarProducts.find(p => p.name === productData.title);

    // Extract price from productData
    const priceValue = parseFloat(productData.variants?.[0]?.price || 0);
    const priceInCents = Math.round(priceValue * 100);

    if (existingProduct) {
      // Update existing product
      console.log(`📝 Updating existing Polar product: ${productData.title}`);

      // Prepare price update
      let priceUpdate;
      if (priceInCents === 0) {
        priceUpdate = { amountType: 'free' };
      } else {
        priceUpdate = {
          amountType: 'fixed',
          priceAmount: priceInCents,
          priceCurrency: 'usd'
        };
      }

      const updated = await polar.products.update({
        id: existingProduct.id,
        productUpdate: {
          name: productData.title,
          description: productData.description || '',
          prices: [priceUpdate]
        }
      });

      res.json({
        success: true,
        action: 'updated',
        productId: existingProduct.id,
        priceId: updated.prices?.[0]?.id,
        name: productData.title,
        price: priceInCents === 0 ? 'FREE' : `$${priceValue.toFixed(2)}`
      });
    } else {
      // Create new product
      console.log(`➕ Creating new Polar product: ${productData.title}`);

      // Prepare price for creation
      let prices;
      if (priceInCents === 0) {
        prices = [{ amountType: 'free' }];
      } else {
        prices = [{
          amountType: 'fixed',
          priceAmount: priceInCents,
          priceCurrency: 'usd'
        }];
      }

      const created = await polar.products.create({
        name: productData.title,
        description: productData.description || '',
        organizationId: POLAR_ORG_ID,
        prices
      });

      res.json({
        success: true,
        action: 'created',
        productId: created.id,
        priceId: created.prices?.[0]?.id,
        name: productData.title,
        price: priceInCents === 0 ? 'FREE' : `$${priceValue.toFixed(2)}`
      });
    }

  } catch (error) {
    console.error('❌ Polar sync failed:', error);
    res.status(500).json({
      error: error.message,
      details: error.body || error.stack
    });
  }
});

// API: Get product from Polar
app.get('/api/get-from-polar', async (req, res) => {
  try {
    if (!polar) {
      return res.status(500).json({ error: 'Polar SDK not initialized' });
    }

    const { productName } = req.query;

    if (!productName) {
      return res.status(400).json({ error: 'Missing productName' });
    }

    // Fetch products from Polar
    const result = await polar.products.list({
      organizationId: POLAR_ORG_ID,
      limit: 100,
      isArchived: false
    });

    const polarProducts = result.result?.items || [];
    const product = polarProducts.find(p => p.name === productName);

    if (!product) {
      return res.status(404).json({ error: 'Product not found in Polar' });
    }

    // Get first active price
    const activePrice = product.prices?.find(p => !p.isArchived);
    let price = 0;
    if (activePrice) {
      if (activePrice.amountType === 'free') {
        price = 0;
      } else if (activePrice.priceAmount) {
        price = activePrice.priceAmount / 100;
      }
    }

    res.json({
      success: true,
      productId: product.id,
      priceId: activePrice?.id,
      name: product.name,
      description: product.description,
      price,
      priceFormatted: price === 0 ? 'FREE' : `$${price.toFixed(2)}`,
      amountType: activePrice?.amountType
    });

  } catch (error) {
    console.error('❌ Polar fetch failed:', error);
    res.status(500).json({
      error: error.message
    });
  }
});

// API: Bulk sync all products to Polar
app.post('/api/bulk-sync-to-polar', async (req, res) => {
  try {
    if (!polar) {
      return res.status(500).json({ error: 'Polar SDK not initialized' });
    }

    const { products } = req.body;

    if (!Array.isArray(products)) {
      return res.status(400).json({ error: 'products must be an array' });
    }

    const results = {
      updated: [],
      created: [],
      failed: []
    };

    for (const productData of products) {
      try {
        const syncResult = await fetch(`http://localhost:${PORT}/api/sync-to-polar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productData })
        });

        const data = await syncResult.json();

        if (data.success) {
          if (data.action === 'updated') {
            results.updated.push(data.name);
          } else {
            results.created.push(data.name);
          }
        } else {
          results.failed.push({ name: productData.title, error: data.error });
        }
      } catch (error) {
        results.failed.push({ name: productData.title, error: error.message });
      }
    }

    res.json({
      success: true,
      results
    });

  } catch (error) {
    console.error('❌ Bulk sync failed:', error);
    res.status(500).json({
      error: error.message
    });
  }
});

// API: Regenerate polar-products.js with latest price IDs
app.post('/api/regenerate-polar-products', async (req, res) => {
  try {
    if (!polar) {
      return res.status(500).json({ error: 'Polar SDK not initialized' });
    }

    console.log('\n🔄 Regenerating polar-products.js...');

    // Product handle mapping
    const PRODUCT_HANDLE_MAP = {
      'Dojo Bolt Gen v05': 'dojo-bolt-gen-v05',
      'Dojo Bolt Gen v05_Obj': 'dojo-bolt-gen-v05-obj',
      'Dojo Bool v5': 'dojo-bool-v5',
      'Dojo Calipers': 'dojo-calipers',
      'Dojo Crv Wrapper v4': 'dojo-crv-wrapper-v4',
      'Dojo Gluefinity Grid_obj': 'dojo-gluefinity-grid-obj',
      'Dojo Knob': 'dojo-knob',
      'Dojo Knob_obj': 'dojo-knob-obj',
      'Dojo Mesh Repair': 'dojo-mesh-repair',
      'Dojo Print Viz_V4.5': 'dojo-print-viz-v45',
      'Dojo Squircle v4.5_obj': 'dojo-squircle-v45-obj',
      'Dojo_Squircle v4.5': 'dojo-squircle-v45'
    };

    // Fetch products from Polar
    const result = await polar.products.list({
      organizationId: POLAR_ORG_ID,
      limit: 100,
      isArchived: false
    });

    const products = result.result?.items || [];
    console.log(`   Found ${products.length} active products`);

    // Build product mapping
    const productMap = new Map();

    for (const product of products) {
      const handle = PRODUCT_HANDLE_MAP[product.name];
      if (!handle) continue;

      const priceId = product.prices?.[0]?.id;
      if (!priceId) {
        console.log(`   ⚠️  No price found for: ${product.name}`);
        continue;
      }

      if (!productMap.has(product.name)) {
        productMap.set(product.name, {
          handle,
          productId: product.id,
          priceId,
          name: product.name
        });
      }
    }

    const productEntries = Array.from(productMap.values());
    productEntries.sort((a, b) => a.handle.localeCompare(b.handle));

    // Generate file content
    const timestamp = new Date().toISOString();
    let fileContent = `// Polar Product Mapping with Price IDs
// Auto-generated by dashboard
// Last updated: ${timestamp}
// NOTE: Handles must match the "handle" field in product JSON files

const POLAR_PRODUCTS = {\n`;

    for (const entry of productEntries) {
      fileContent += `  '${entry.handle}': {\n`;
      fileContent += `    productId: '${entry.productId}',\n`;
      fileContent += `    priceId: '${entry.priceId}',\n`;
      fileContent += `    name: '${entry.name}',\n`;
      fileContent += `    url: 'https://polar.sh/no3d-tools/portal'\n`;
      fileContent += `  },\n`;
    }

    fileContent += `};

// Polar organization base URL (checkout links)
const POLAR_ORG_URL = 'https://polar.sh/no3d-tools/portal';

// Export for use in website
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { POLAR_PRODUCTS, POLAR_ORG_URL };
}
`;

    // Write to website directory
    const outputPath = path.join(WEBSITE_PATH, 'polar-products.js');
    await fs.writeFile(outputPath, fileContent, 'utf8');

    console.log(`   ✅ Generated with ${productEntries.length} products`);
    console.log(`   📁 File: ${outputPath}\n`);

    res.json({
      success: true,
      productCount: productEntries.length,
      filePath: outputPath,
      products: productEntries.map(p => ({
        name: p.name,
        handle: p.handle,
        priceId: p.priceId
      }))
    });

  } catch (error) {
    console.error('❌ Regenerate failed:', error);
    res.status(500).json({
      error: error.message
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║                                                           ║');
  console.log('║         🎨  Product Dashboard Server  🎨                  ║');
  console.log('║                                                           ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`✅ Server running at: http://localhost:${PORT}`);
  console.log(`📂 Library path: ${LIBRARY_PATH}`);
  console.log(`🌐 Website path: ${WEBSITE_PATH}`);
  console.log('');
  console.log('Open the dashboard:');
  console.log(`   http://localhost:${PORT}/product-dashboard.html`);
  console.log('');
  console.log('Press Ctrl+C to stop');
  console.log('');
});

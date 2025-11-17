/**
 * Changelog Helper Utility
 * Adds changelog entries to product metadata when products are updated
 * 
 * Usage:
 *   const { addChangelogEntry } = require('./utils/changelog-helper');
 *   addChangelogEntry(productMetadata, comment, isBulkOperation);
 */

/**
 * Add a changelog entry to product metadata
 * @param {Object} metadata - Product metadata object
 * @param {string} comment - Changelog comment (default: 'Minor bug fixes' for bulk, empty for individual)
 * @param {boolean} isBulkOperation - Whether this is a bulk operation (default: false)
 * @returns {Object} Updated metadata object
 */
function addChangelogEntry(metadata, comment = null, isBulkOperation = false) {
  // Ensure changelog array exists
  if (!metadata.changelog) {
    metadata.changelog = [];
  }

  // Determine the comment to use
  const changelogComment = comment || (isBulkOperation ? 'Minor bug fixes' : null);
  
  // Skip if no comment provided (for individual operations, user can opt out)
  if (!changelogComment) {
    return metadata;
  }

  // Get today's date
  const today = new Date().toISOString().split('T')[0];

  // Check if there's already a changelog entry for today with the same message
  const existingEntry = metadata.changelog.find(entry => 
    entry.date === today && 
    Array.isArray(entry.changes) && 
    entry.changes.includes(changelogComment)
  );

  // Only add if it doesn't already exist
  if (!existingEntry) {
    metadata.changelog.unshift({
      version: '',
      date: today,
      changes: [changelogComment]
    });
  }

  return metadata;
}

/**
 * Add changelog entry for bulk operations (uses default message)
 * @param {Object} metadata - Product metadata object
 * @returns {Object} Updated metadata object
 */
function addBulkChangelogEntry(metadata) {
  return addChangelogEntry(metadata, 'Minor bug fixes', true);
}

module.exports = {
  addChangelogEntry,
  addBulkChangelogEntry
};


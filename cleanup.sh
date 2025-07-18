#!/bin/bash

# Cleanup script to remove temporary files
echo "Cleaning up temporary files..."

# Remove temporary database setup scripts
rm -f create-missing-tables.js
rm -f fix-holidays-table.js
rm -f create-holidays-table.js
rm -f setup-database.js
rm -f create-timetable-templates.js
rm -f create-unassigned-subjects.js

# Remove debug files
rm -f debug-api.js
rm -f debug-complete.js
rm -f debug-layout.html
rm -f debug-workload-api.js
rm -f direct-insert.js
rm -f fix-admin.js
rm -f fix-subject-allotment.js
rm -f manual-seed.mjs
rm -f simple-insert.js
rm -f run-seed.js
rm -f run-setup.sh

# Remove test files
rm -f test-api-direct.js
rm -f test-api.js
rm -f test-auth.js

# Remove SQL files
rm -f add-missing-tables.sql

echo "Cleanup completed!"
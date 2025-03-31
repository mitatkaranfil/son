#!/bin/sh

# Wait for environment variables to be available
sleep 2

# Start the application with error handling
node -r dotenv/config --import tsx server/index.ts 2>&1 | tee /app/logs/app.log

# If the application crashes, log the error and exit
if [ $? -ne 0 ]; then
    echo "Application crashed, check logs for details"
    cat /app/logs/app.log
    exit 1
fi

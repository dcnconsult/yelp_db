#!/bin/bash

# Default configuration
ENVIRONMENT="development"
BACKEND_PORT=8000
FRONTEND_PORT=5173
SKIP_DB_CHECK=false
LOG_LEVEL="info"
QUIET_FRONTEND=false

# Store process IDs
declare -a PIDS=()

# Function to show usage
show_usage() {
    echo "Usage: $0 [options]"
    echo "Options:"
    echo "  -e, --environment <env>    Set environment (development/production) [default: development]"
    echo "  -b, --backend-port <port>  Set backend port [default: 8000]"
    echo "  -f, --frontend-port <port> Set frontend port [default: 5173]"
    echo "  -s, --skip-db-check       Skip database connectivity check"
    echo "  -l, --log-level <level>   Set logging level (critical/error/warning/info/debug/trace) [default: info]"
    echo "  -q, --quiet-frontend      Reduce frontend logging output"
    echo "  -h, --help                Show this help message"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -b|--backend-port)
            BACKEND_PORT="$2"
            shift 2
            ;;
        -f|--frontend-port)
            FRONTEND_PORT="$2"
            shift 2
            ;;
        -s|--skip-db-check)
            SKIP_DB_CHECK=true
            shift
            ;;
        -l|--log-level)
            LOG_LEVEL="$2"
            shift 2
            ;;
        -q|--quiet-frontend)
            QUIET_FRONTEND=true
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Function to cleanup processes
cleanup() {
    echo -e "\n\033[33mShutting down services...\033[0m"
    
    # Kill all child processes
    for pid in "${PIDS[@]}"; do
        if ps -p $pid > /dev/null; then
            echo "Stopping process: $pid"
            kill $pid 2>/dev/null
        fi
    done
    
    # Deactivate virtual environment if active
    if [[ -n $VIRTUAL_ENV ]]; then
        deactivate
    fi
    
    echo -e "\033[32mCleanup complete\033[0m"
    exit 0
}

# Register cleanup function for script termination
trap cleanup EXIT INT TERM

# Function to check if PostgreSQL is running
check_postgresql() {
    if ! pgrep -x "postgres" >/dev/null; then
        echo -e "\033[33mWarning: PostgreSQL service is not running!\033[0m"
        return 1
    fi
    return 0
}

# Function to check database connection
check_database() {
    if [[ ! -f .env ]]; then
        echo -e "\033[31mError: .env file not found\033[0m"
        return 1
    fi
    
    # Load environment variables
    set -a
    source .env
    set +a
    
    echo "Checking database connection..."
    
    # Try connecting using psql
    if PGPASSWORD=$POSTGRES_PASSWORD psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c '\q' >/dev/null 2>&1; then
        echo -e "\033[32mDatabase connection successful\033[0m"
        return 0
    else
        echo -e "\033[31mDatabase connection failed\033[0m"
        echo -e "\033[33mConnection details being used:\033[0m"
        echo "  Host: $POSTGRES_HOST"
        echo "  Port: $POSTGRES_PORT"
        echo "  Database: $POSTGRES_DB"
        echo "  User: $POSTGRES_USER"
        return 1
    fi
}

# Function to activate virtual environment
activate_venv() {
    if [[ ! -f .venv/bin/activate ]]; then
        echo -e "\033[33mVirtual environment not found. Creating one...\033[0m"
        python3 -m venv .venv
        if [[ ! -f .venv/bin/activate ]]; then
            echo -e "\033[31mError: Failed to create virtual environment\033[0m"
            return 1
        fi
        source .venv/bin/activate
        echo "Installing dependencies..."
        pip install -r requirements.txt
    else
        source .venv/bin/activate
    fi
    return 0
}

# Main execution
echo -e "\033[36mStarting Yelp Analytics Application in $ENVIRONMENT mode...\033[0m"

# Activate virtual environment
if ! activate_venv; then
    echo -e "\033[31mError: Virtual environment activation failed\033[0m"
    exit 1
fi

# Check PostgreSQL and database connection if not skipped
if [[ $SKIP_DB_CHECK == false ]]; then
    if ! check_postgresql; then
        echo -e "\033[31mError: PostgreSQL is not running\033[0m"
        exit 1
    fi
    if ! check_database; then
        echo -e "\033[31mError: Database connection failed\033[0m"
        exit 1
    fi
fi

# Load environment variables
set -a
source .env
set +a

# Set environment-specific variables
export NODE_ENV=$ENVIRONMENT
export VITE_API_URL="http://localhost:$BACKEND_PORT"

# Start backend server
echo "Starting backend server..."
if [[ $ENVIRONMENT == "production" ]]; then
    uvicorn app.main:app --host 0.0.0.0 --port $BACKEND_PORT --workers 4 --log-level $LOG_LEVEL &
else
    uvicorn app.main:app --reload --host 0.0.0.0 --port $BACKEND_PORT --log-level $LOG_LEVEL &
fi
PIDS+=($!)

# Start frontend server
echo "Starting frontend development server..."
cd frontend-new
if [[ $QUIET_FRONTEND == true ]]; then
    export VITE_LOG_LEVEL=error
    npm run dev > /dev/null 2>&1 &
else
    npm run dev &
fi
PIDS+=($!)
cd ..

echo -e "\n\033[32mServices started. Press Ctrl+C to stop all services.\033[0m"
echo -e "\033[36mBackend running at: http://localhost:$BACKEND_PORT\033[0m"
echo -e "\033[36mFrontend running at: http://localhost:$FRONTEND_PORT\033[0m"
echo -e "\033[36mEnvironment: $ENVIRONMENT\033[0m"
echo -e "\033[36mLog Level: $LOG_LEVEL\033[0m"
if [[ $QUIET_FRONTEND == true ]]; then
    echo -e "\033[36mFrontend logging: Minimal\033[0m"
fi

# Wait for any process to exit
wait -n

# Exit with status of process that exited first
exit $? 
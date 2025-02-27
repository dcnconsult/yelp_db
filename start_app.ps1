# Configuration
param(
    [string]$Environment = "development",
    [int]$BackendPort = 8000,
    [int]$FrontendPort = 5173,
    [switch]$SkipDatabaseCheck = $false,
    [string]$LogLevel = "info",
    [switch]$QuietFrontend = $false
)

# Function to check if PostgreSQL is running
function Test-PostgreSQL {
    try {
        $result = Get-Process | Where-Object { $_.Name -match "postgres" }
        if (-not $result) {
            Write-Host "Warning: PostgreSQL service is not running!" -ForegroundColor Yellow
            return $false
        }
        return $true
    }
    catch {
        Write-Host "Error checking PostgreSQL status: $_" -ForegroundColor Red
        return $false
    }
}

# Function to load environment variables
function Load-EnvFile {
    try {
        if (Test-Path ".env") {
            Get-Content ".env" | ForEach-Object {
                if ($_ -match "^([^#][^=]+)=(.*)$") {
                    $key = $matches[1].Trim()
                    $value = $matches[2].Trim()
                    [Environment]::SetEnvironmentVariable($key, $value)
                }
            }
            return $true
        }
        return $false
    }
    catch {
        Write-Host "Error loading .env file: $_" -ForegroundColor Red
        return $false
    }
}

# Function to check database connection
function Test-DatabaseConnection {
    try {
        # Check if .env exists and was loaded
        if (-not (Test-Path ".env")) {
            Write-Host "Error: .env file not found. Please create one with your database configuration." -ForegroundColor Red
            return $false
        }

        Write-Host "Checking database connection..."
        
        # Set environment variables for psql
        $env:PGUSER = [Environment]::GetEnvironmentVariable("POSTGRES_USER")
        $env:PGPASSWORD = [Environment]::GetEnvironmentVariable("POSTGRES_PASSWORD")
        $env:PGHOST = [Environment]::GetEnvironmentVariable("POSTGRES_HOST")
        $env:PGPORT = [Environment]::GetEnvironmentVariable("POSTGRES_PORT")
        $env:PGDATABASE = [Environment]::GetEnvironmentVariable("POSTGRES_DB")
        
        # Try connecting using psql
        $result = psql -c "\q" 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Database connection successful" -ForegroundColor Green
            return $true
        } else {
            Write-Host "Database connection failed" -ForegroundColor Red
            Write-Host "Please ensure PostgreSQL is running and the connection details in .env are correct" -ForegroundColor Yellow
            Write-Host "Connection details being used:" -ForegroundColor Yellow
            Write-Host "  Host: $env:PGHOST" -ForegroundColor Yellow
            Write-Host "  Port: $env:PGPORT" -ForegroundColor Yellow
            Write-Host "  Database: $env:PGDATABASE" -ForegroundColor Yellow
            Write-Host "  User: $env:PGUSER" -ForegroundColor Yellow
            return $false
        }
    }
    catch {
        Write-Host "Error checking database connection: $_" -ForegroundColor Red
        return $false
    }
}

# Function to activate virtual environment
function Activate-VirtualEnv {
    try {
        if (Test-Path ".venv\Scripts\Activate.ps1") {
            Write-Host "Activating virtual environment..."
            & ".venv\Scripts\Activate.ps1"
            return $true
        } else {
            Write-Host "Error: Virtual environment not found. Creating one..." -ForegroundColor Yellow
            python -m venv .venv
            if (Test-Path ".venv\Scripts\Activate.ps1") {
                & ".venv\Scripts\Activate.ps1"
                Write-Host "Installing dependencies..." -ForegroundColor Yellow
                pip install -r requirements.txt
                return $true
            } else {
                Write-Host "Error: Failed to create virtual environment." -ForegroundColor Red
                return $false
            }
        }
    }
    catch {
        Write-Host "Error activating virtual environment: $_" -ForegroundColor Red
        return $false
    }
}

# Track processes started by this script
$scriptProcesses = @()

# Function to handle clean shutdown
function Cleanup {
    Write-Host "`nShutting down services..." -ForegroundColor Yellow
    
    # Only try to stop processes that we started
    foreach ($processId in $scriptProcesses) {
        try {
            $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
            if ($process) {
                Write-Host "Stopping process: $($process.Name) (PID: $processId)"
                Stop-Process -Id $processId -Force
            }
        }
        catch {
            # Process might already be stopped
            continue
        }
    }
    
    # Deactivate virtual environment if active
    if ($env:VIRTUAL_ENV) {
        deactivate
    }
    
    Write-Host "Cleanup complete" -ForegroundColor Green
    exit
}

try {
    Write-Host "Starting Yelp Analytics Application in $Environment mode..." -ForegroundColor Cyan
    
    # Load environment variables first
    if (-not (Load-EnvFile)) {
        throw "Failed to load environment variables"
    }
    
    # Check and activate virtual environment
    if (-not (Activate-VirtualEnv)) {
        throw "Virtual environment activation failed"
    }

    # Check PostgreSQL and database connection if not skipped
    if (-not $SkipDatabaseCheck) {
        if (-not (Test-PostgreSQL)) {
            throw "PostgreSQL is not running"
        }
        if (-not (Test-DatabaseConnection)) {
            throw "Database connection failed"
        }
    }
    
    # Set environment-specific variables
    $env:NODE_ENV = $Environment
    $env:VITE_API_URL = "http://localhost:$BackendPort"
    
    # Create a new job for the backend
    $backendJob = Start-Job -ScriptBlock {
        param($pwd, $port, $env, $logLevel)
        Set-Location $pwd
        # Activate virtual environment in the job
        & ".venv\Scripts\Activate.ps1"
        Write-Host "Starting backend server..."
        if ($env -eq "production") {
            uvicorn app.main:app --host 0.0.0.0 --port $port --workers 4 --log-level $logLevel
        } else {
            uvicorn app.main:app --reload --host 0.0.0.0 --port $port --log-level $logLevel
        }
    } -ArgumentList $PWD, $BackendPort, $Environment, $LogLevel
    
    # Create a new job for the frontend
    $frontendJob = Start-Job -ScriptBlock {
        param($pwd, $port, $quiet)
        Set-Location "$pwd/frontend-new"
        Write-Host "Starting frontend development server..."
        if ($quiet) {
            # Redirect npm output to null for quieter operation
            $env:VITE_LOG_LEVEL = "error"
            npm run dev --silent > $null
        } else {
            npm run dev
        }
    } -ArgumentList $PWD, $FrontendPort, $QuietFrontend
    
    Write-Host "`nServices started. Press Ctrl+C to stop all services." -ForegroundColor Green
    Write-Host "Backend running at: http://localhost:$BackendPort" -ForegroundColor Cyan
    Write-Host "Frontend running at: http://localhost:$FrontendPort" -ForegroundColor Cyan
    Write-Host "Environment: $Environment" -ForegroundColor Cyan
    Write-Host "Log Level: $LogLevel" -ForegroundColor Cyan
    if ($QuietFrontend) {
        Write-Host "Frontend logging: Minimal" -ForegroundColor Cyan
    }
    
    # Keep track of job processes
    $scriptProcesses = @($backendJob.ChildJobs[0].Id, $frontendJob.ChildJobs[0].Id)
    
    # Keep the script running and show output from both jobs
    while ($true) {
        Receive-Job -Job $backendJob, $frontendJob | ForEach-Object {
            if ($_ -match "^\s*$") { return }
            Write-Host $_
        }
        
        # Check if either job has failed
        $jobs = @($backendJob, $frontendJob)
        foreach ($job in $jobs) {
            if ($job.State -eq 'Failed') {
                Write-Host "Job failed: $($job.Name)" -ForegroundColor Red
                Write-Host $job.ChildJobs[0].JobStateInfo.Reason -ForegroundColor Red
                Cleanup
            }
        }
        
        Start-Sleep -Milliseconds 100
    }
}
catch {
    Write-Host "Error: $_" -ForegroundColor Red
    Cleanup
}
finally {
    if ($Error.Count -gt 0) {
        Write-Host "Script terminated with errors. Check the messages above." -ForegroundColor Red
    }
    Cleanup
}

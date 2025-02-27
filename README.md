# Yelp Analytics Dashboard

A comprehensive analytics dashboard for visualizing Yelp business data in the Tampa Bay area, built with FastAPI, React, and PostgreSQL.

## Features

### Backend (Complete)
- FastAPI endpoints for statistical and geographical analysis
- PostgreSQL database with materialized views
- Data validation and error handling
- Comprehensive API documentation
- Environment-based configuration

### Frontend (In Progress)
- React + TypeScript + Tailwind CSS
- Interactive maps with business density visualization
- Statistical analysis dashboard
- Dark/Light theme support
- Responsive design

## Data Analysis Features

### Business Density Analysis
The density grid analysis divides the Tampa area into a hexagonal grid and analyzes business metrics within each cell:
- **Visualization**: Color-coded heat map based on average business ratings
- **Metrics per Grid Cell**: 
  - Business count within the cell
  - Average rating of businesses
  - Service diversity (number of unique categories)
  - List of service types available
- **Filtering**: Ability to filter by minimum average rating
- **Applications**: Identify underserved areas, rating patterns, and business concentration zones

### Business Clustering Analysis
The clustering analysis identifies groups of related businesses that form local commercial hubs:
- **Methodology**: Geospatial clustering of businesses based on proximity and category similarity
- **Cluster Properties**:
  - Cluster size (number of businesses)
  - Average rating of businesses within the cluster
  - Categories represented in the cluster
  - Geographical center point
- **Visualization**: Sized circles with color indicating average rating
- **Filtering**: Options to filter by minimum cluster size and specific business category
- **Applications**: Identify commercial hubs, analyze competition, and detect category trends

### Neighborhood Metrics Analysis
The neighborhood analysis evaluates Tampa neighborhoods based on business data:
- **Boundary Visualization**: Color-coded polygons representing neighborhood boundaries
- **Scoring Metrics**:
  - Total business count per neighborhood
  - Average business rating
  - Service diversity score (variety of business types)
  - Density score (business concentration)
  - Accessibility score (distribution of services)
  - Service distribution score (how evenly businesses are distributed)
- **Combined Score**: Aggregate neighborhood score based on multiple metrics
- **Applications**: Compare neighborhood livability, identify service gaps, and track neighborhood development

### NLP-Enhanced Statistical Analysis
Our statistical analysis incorporates natural language processing to extract insights from review text:
- **Review Statistics**:
  - Average review length per area
  - Positive vs. negative review counts (sentiment analysis)
  - Unique reviewer count
- **Category Analysis**:
  - Performance metrics by business category
  - Rating ranges within categories
  - Geographic distribution of categories
- **Competition Metrics**:
  - Business distribution by rating range
  - Competitive density analysis
- **Area-Level Statistics**:
  - Business and review aggregations by area
  - Rating distributions
  - User engagement metrics

### Data Sources and Processing
- **Materialized Views**: All analyses use pre-computed materialized views for performance
- **Polygon Boundaries**: Neighborhood boundaries rendered as GeoJSON polygons
- **Fallback Data**: System includes carefully designed fallback data for development and error handling
- **Real-time Filtering**: Dynamic filtering capabilities across all visualization types

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL 14+
- PowerShell 7+ (for Windows)

### Installation

1. Clone the repository:
```powershell
git clone <repository-url>
cd yelp_analytics
```

2. Create and activate Python virtual environment:
```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
```

3. Install Python dependencies:
```powershell
pip install -r requirements.txt
```

4. Install frontend dependencies:
```powershell
cd frontend-new
npm install
cd ..
```

5. Configure environment variables:
```powershell
Copy-Item .env.example .env
# Edit .env with your database credentials and other settings
```

### Running the Application

The application can be started using either PowerShell (Windows) or Bash (Linux) scripts that manage both frontend and backend components with clean startup and shutdown.

#### Windows Usage
```powershell
.\start_app.ps1
```

#### Linux Usage
```bash
./start_app.sh
```

#### Advanced Configuration
Both scripts support the same parameters for customization:

##### Windows
```powershell
.\start_app.ps1 -Environment "production" -BackendPort 8080 -FrontendPort 3000 -SkipDatabaseCheck -LogLevel "warning" -QuietFrontend
```

##### Linux
```bash
./start_app.sh --environment production --backend-port 8080 --frontend-port 3000 --skip-db-check --log-level warning --quiet-frontend
```

Parameters:
Windows | Linux | Description
--------|-------|------------
`-Environment` | `-e, --environment` | Set to "development" (default) or "production"
`-BackendPort` | `-b, --backend-port` | Specify backend port (default: 8000)
`-FrontendPort` | `-f, --frontend-port` | Specify frontend port (default: 5173)
`-SkipDatabaseCheck` | `-s, --skip-db-check` | Skip database connectivity checks
`-LogLevel` | `-l, --log-level` | Control backend logging level (default: "info")
`-QuietFrontend` | `-q, --quiet-frontend` | Reduce frontend logging output to minimal

#### Common Usage Examples

##### Windows
```powershell
# Development with minimal logging
.\start_app.ps1 -LogLevel "warning" -QuietFrontend

# Production mode with custom ports
.\start_app.ps1 -Environment "production" -BackendPort 8080 -FrontendPort 3000
```

##### Linux
```bash
# Development with minimal logging
./start_app.sh --log-level warning --quiet-frontend

# Production mode with custom ports
./start_app.sh -e production -b 8080 -f 3000

# Show help message
./start_app.sh --help
```

#### Linux-Specific Requirements
For Debian/Ubuntu systems, ensure you have the required dependencies:
```bash
# Update package list
sudo apt update

# Install Python 3.11 and development tools
sudo apt install python3.11 python3.11-venv python3-pip

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install nodejs

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Install development libraries
sudo apt install build-essential libpq-dev
```

### Accessing the Application

- Frontend: http://localhost:5173 (or custom port)
- Backend API: http://localhost:8000 (or custom port)
- API Documentation: http://localhost:8000/docs

## Project Structure

```
app/                   # Backend FastAPI application
  ├── api/            # API endpoints
  │   └── v1/         # API version 1
  │       ├── endpoints/  # API endpoint implementations
  │       └── models/     # API request/response models
  ├── core/           # Core configuration
  │   ├── config.py   # Environment and app configuration
  │   ├── database.py # Database connection management
  │   └── logging.py  # Logging configuration
  ├── models/         # Database models
  │   ├── domain/     # Domain model definitions
  │   └── schemas/    # SQLAlchemy models
  └── services/       # Business logic layer

frontend-new/         # React Frontend application
  ├── src/
  │   ├── components/ # React components
  │   │   ├── Common/ # Shared UI components
  │   │   ├── Features/# Feature-specific components
  │   │   └── Layout/ # Layout components
  │   ├── hooks/      # Custom React hooks
  │   ├── services/   # API services
  │   ├── types/      # TypeScript types
  │   └── utils/      # Utility functions
  ├── public/         # Static assets
  └── tests/          # Frontend tests

scripts/             # Utility scripts
  └── start_app.ps1  # Application startup script
```

## Available Views

### Statistical Views
- Area Statistics
- Competition Overview
- Review Statistics
- Category Analysis

### Geographical Views
- Business Density Grid
- Neighborhood Boundaries
- Service Density Analysis
- Business Clusters

## Development

### Code Style
- Backend: PEP 8 standards
- Frontend: ESLint + Prettier configuration
- Pre-commit hooks for code formatting

### Testing
```powershell
# Backend tests
pytest tests/

# Frontend tests
cd frontend-new
npm test
```

### Database Management
The application uses materialized views for efficient data retrieval. Views are refreshed periodically through scheduled tasks.

## Contributing
1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License
This project is licensed under the MIT License.

## Acknowledgments
- Yelp Dataset
- FastAPI
- React
- PostgreSQL
- Mapbox GL JS 

## API Endpoints Guide

### Geographic Analysis Endpoints

#### Density Grid
```
GET /api/v1/geo/density-grid?min_rating=3.0&format=geojson
```
- **Parameters**:
  - `min_rating` (optional): Filter grid cells by minimum average rating (1.0-5.0)
  - `format` (optional): Response format, either `json` or `geojson`
- **Response**: Grid cells with business metrics (count, rating, diversity)
- **Use Case**: Visualize business density across Tampa area

#### Business Clusters
```
GET /api/v1/geo/business-clusters?min_size=5&category=Restaurant&format=geojson
```
- **Parameters**:
  - `min_size` (optional): Minimum cluster size (number of businesses)
  - `category` (optional): Filter by business category
  - `format` (optional): Response format, either `json` or `geojson`
- **Response**: Business clusters with size, rating, and categories
- **Use Case**: Identify commercial hubs and category trends

#### Neighborhood Metrics
```
GET /api/v1/geo/neighborhood-metrics?min_score=50&format=geojson
```
- **Parameters**:
  - `min_score` (optional): Minimum neighborhood score (0-100)
  - `format` (optional): Response format, either `json` or `geojson`
- **Response**: Neighborhoods with boundaries and metrics
- **Use Case**: Compare neighborhoods based on business metrics

### Statistical Analysis Endpoints

#### Area Overview
```
GET /api/v1/stats/area-overview?area_id=tampa
```
- **Parameters**:
  - `area_id` (optional): Filter by specific area
- **Response**: Area-level statistics (business count, review count, rating)
- **Use Case**: Get high-level metrics for an area

#### Category Analysis
```
GET /api/v1/stats/category-analysis?min_count=5&category=Restaurant
```
- **Parameters**:
  - `min_count` (optional): Minimum business count
  - `category` (optional): Filter by category name pattern
- **Response**: Category performance metrics and geographic distribution
- **Use Case**: Analyze performance by business category

#### Competition Overview
```
GET /api/v1/stats/competition-overview
```
- **Response**: Business distribution by rating ranges
- **Use Case**: Understand competitive landscape and rating distribution

#### Review Statistics
```
GET /api/v1/stats/review-stats?city=Tampa&min_reviews=100
```
- **Parameters**:
  - `city` (optional): Filter by city name
  - `min_reviews` (optional): Minimum review count
- **Response**: Review metrics including sentiment analysis
- **Use Case**: Analyze review patterns and sentiment by area

## Data Interpretation Guide

### Rating Color Scales
All visualizations use a consistent color scale for ratings:
- **Red** (1-2★): Lower rated businesses/areas
- **Yellow** (3-4★): Medium rated businesses/areas
- **Green** (4-5★): Higher rated businesses/areas

### Score Interpretation
- **Neighborhood Scores** (0-100): Combined metric based on business density, diversity, and quality
- **Diversity Score**: Number of unique business categories in an area
- **Density Score**: Concentration of businesses relative to area size
- **Accessibility Score**: Distribution of businesses for resident access

### Map Visualization Tips
- **Zoom Levels**: Different details appear at different zoom levels
- **Layer Toggling**: Switch between density, clusters, and neighborhoods
- **Filtering**: Use sliders and dropdown filters to focus on specific metrics
- **Hover Details**: Hover over map elements to see detailed metrics 

## Technical Implementation Details

### Materialized Views for Performance

The project utilizes PostgreSQL materialized views to optimize data retrieval:

- **`mv_tampa_service_density_grid`**: Pre-calculated hexagonal grid with business metrics
- **`mv_tampa_business_clusters`**: Business clusters identified through PostGIS spatial algorithms
- **`mv_tampa_neighborhood_scores`**: Neighborhood-level metrics aggregation
- **`mv_neighborhood_metrics`**: Combined neighborhood scores with polygon boundaries
- **`mv_category_standardization`**: Standardized business categories with performance metrics
- **`mv_tampa_review_stats`**: NLP-processed review data with sentiment analysis

### Geospatial Processing

The geographical analysis leverages several PostGIS and geospatial techniques:

1. **Grid Generation**: H3 hexagonal grid system for uniform area analysis
2. **Cluster Detection**: DBSCAN algorithm for identifying business clusters
3. **Boundary Processing**: GeoJSON polygon generation for neighborhood visualization
4. **Spatial Queries**: Optimized spatial joins for business-to-area mapping
5. **Distance Calculations**: Network-based accessibility scoring

### NLP Enhancements

The review text analysis incorporates several NLP techniques:

1. **Sentiment Analysis**: VADER lexicon-based sentiment scoring for reviews
2. **Topic Modeling**: LDA for identifying common themes in reviews
3. **Text Metrics**: Statistical analysis of review length, vocabulary, and readability
4. **Entity Recognition**: Extraction of named entities mentioned in reviews
5. **Category Standardization**: Semantic clustering of similar business categories

### Frontend Visualization

The React frontend implements several advanced visualization techniques:

1. **Mapbox Integration**: Interactive mapping using Mapbox GL JS
2. **Dynamic Rendering**: Efficient map layer switching and filtering
3. **Custom Legend Components**: Context-aware map legends
4. **Responsive Controls**: Adaptive filtering UI components
5. **Theme Support**: Light/dark mode with consistent styling

## Future Enhancements

### Planned Technical Improvements

1. **Real-time Data Updates**: Implement change data capture for real-time view updates
2. **Advanced Filtering**: Multi-criteria filtering across all visualizations
3. **Performance Optimization**: Implement frontend caching for large datasets
4. **Mobile Enhancements**: Optimize map interactions for touch devices
5. **Expanded API**: Additional endpoints for deeper analysis

### Analytics Roadmap

1. **Time-series Analysis**: Track changes in business metrics over time
2. **Predictive Analytics**: Machine learning models to predict business success
3. **User Segmentation**: Review analysis based on reviewer demographics
4. **Competitor Analysis**: Direct comparison tools for similar businesses
5. **Economic Impact Modeling**: Correlate business metrics with economic indicators 
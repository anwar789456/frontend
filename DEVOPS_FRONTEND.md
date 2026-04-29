# Minolingo Frontend DevOps

This frontend is prepared for local Docker Desktop or WSL2 usage. The Angular app is served by Nginx and proxies `/api` requests to the local Spring Cloud Gateway at `http://host.docker.internal:8080`.

## Local Docker Stack

```bash
docker compose up --build -d
```

- Frontend: http://localhost:8081
- Jenkins: http://localhost:8082
- SonarQube: http://localhost:9000
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3000

Grafana default login is `admin` / `admin`.

## Frontend CI Commands

```bash
npm ci
npm run test:coverage
npm run build:prod
```

Coverage is generated at `coverage/lcov.info` for SonarQube.

## Jenkins Notes

Create a Jenkins pipeline job pointing at this repository and use the included `Jenkinsfile`. Configure a SonarQube server in Jenkins named `SonarQube`. The local Jenkins image includes Node 24, npm 11, Docker CLI, and `sonar-scanner`.

## Backend Gateway

Start the Spring Cloud Gateway locally on port `8080` before testing API-backed frontend screens. The frontend container proxies `/api` to that gateway.

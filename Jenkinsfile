pipeline {
  agent any

  tools {
    nodejs 'NodeJS 24'
  }

  environment {
    APP_NAME = 'minolingo-frontend'
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Install') {
      steps {
        script {
          runCommand('npm ci')
        }
      }
    }

    stage('Unit Tests + Coverage') {
      steps {
        script {
          runCommand('npm run test:coverage')
        }
      }
      post {
        always {
          archiveArtifacts artifacts: 'coverage/**', allowEmptyArchive: true
        }
      }
    }

    stage('SonarQube Scan') {
      steps {
        withSonarQubeEnv('SonarQube') {
          script {
            runCommand('npx sonar-scanner')
          }
        }
      }
    }

    stage('Production Build') {
      steps {
        script {
          runCommand('npm run build:prod')
        }
      }
    }
  }

  post {
    always {
      archiveArtifacts artifacts: 'dist/**', allowEmptyArchive: true
    }
    success {
      echo 'Frontend CI completed: tests, SonarQube analysis, and production build passed.'
    }
  }
}

void runCommand(String command) {
  if (isUnix()) {
    sh command
  } else {
    bat command.replace(' || true', ' || exit 0')
  }
}

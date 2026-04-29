pipeline {
  agent any

  tools {
    nodejs 'NodeJS 24'
  }

  environment {
    APP_NAME = 'minolingo-frontend'
    IMAGE_NAME = 'minolingo-frontend:local'
    CONTAINER_NAME = 'minolingo-frontend'
    FRONTEND_PORT = '8081'
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

    stage('Docker Image Build') {
      steps {
        script {
          runCommand("docker build -t ${env.IMAGE_NAME} .")
        }
      }
    }

    stage('Local Docker Deploy') {
      steps {
        script {
          runCommand("docker rm -f ${env.CONTAINER_NAME} || true")
          runCommand("docker run -d --name ${env.CONTAINER_NAME} -p ${env.FRONTEND_PORT}:80 ${env.IMAGE_NAME}")
        }
      }
    }
  }

  post {
    always {
      archiveArtifacts artifacts: 'dist/**', allowEmptyArchive: true
    }
    success {
      echo "Frontend deployed locally at http://localhost:${FRONTEND_PORT}"
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

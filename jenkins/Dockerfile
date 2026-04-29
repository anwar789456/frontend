FROM jenkins/jenkins:lts-jdk21

USER root

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl docker.io gnupg \
  && curl -fsSL https://deb.nodesource.com/setup_24.x | bash - \
  && apt-get install -y --no-install-recommends nodejs \
  && npm install -g npm@11.9.0 sonar-scanner \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

USER jenkins

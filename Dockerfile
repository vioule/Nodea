# Utilise l'image de base node:jod
FROM node:22-slim

# Métadonnées de l'image
LABEL maintainer.name="Studio Nodea Software" \
      maintainer.email="contact@nodea-software.com"

# Mise à jour des dépôts et installation des dépendances système
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        nano \
        mariadb-client \
        python3 \
        libnss3 \
        libxss1 \
        libasound2 \
        libatk-bridge2.0-0 \
        libgtk-3-0 \
        libgbm-dev \
        git \
        openssh-client && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Clean node_modules && workspace for image creation
RUN rm -rf node_modules/ && rm -rf workspace/

# Main folder
RUN mkdir /nodea
WORKDIR /nodea
COPY . /nodea

# Workspace folder
RUN mkdir -p /nodea/workspace
COPY /structure/template/package.json /nodea/workspace

# Expose Nodea and workspace ports
EXPOSE 1337 9001-9100

# Entrypoint
RUN chmod 777 /nodea/entrypoint.sh
ENTRYPOINT ["/nodea/entrypoint.sh"]

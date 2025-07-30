<p align="center">
	<img width="300" height="125" src="https://www.nodea-software.com/img/logo/logo_nodea_color.png">
</p>

# NODEA

**Nodea** is a computer aided software that enable to generate **Node.js** applications by giving **instructions** to a bot.<br><br>
Official website: https://nodea-software.com<br>
Official documentation: https://docs.nodea-software.com

## Classic Installation

### Prerequisites

Node.js LTS / Fermium (v14 or later)<br>
Default: MariaDB (v10.3 or higher)
Optional: MySQL (8 or higher) / PostgreSQL

### Instructions

git clone: <pre>git clone git@github.com:nodea-software/nodea.git</pre>

### Installation with shell

Execute the following instructions:<br/>
<pre>
cd nodea
chmod +x install.sh
bash install.sh
</pre>

### Manual installation

If it does not work then follow these steps:

Use .sql file that are in sql/ directory to generate the database, there are 3 files for each available dialect (MariaDB, MySQL, Postgres)

Note that MariaDB is the default dialect, if you want to change please update the dialect key in <b>config/database</b> and <b>structure/template/config/database.js</b>

If you want to access your generator by <b>localhost:1337</b> instead of <b>127.0.0.1:1337</b> please update the host key in <b>config/global.js</b>

Note that if you access the generator with localhost and let the <b>host</b> key to <b>127.0.0.1</b> you'll have cookie mismatch and you will often be <b>logged out</b> of generated applications inside the generator

Install node modules
<pre>
npm install --no-optional
</pre>
<i>You can remove the --no-optional if you also want to install Cypress.</i>

### Launch server

Follow the instructions and wait for message :<br>
<i>Nodea ready to be started -> node server.js</i>

Then, execute command line :
<pre>
node server.js
</pre>

Open your browser on:<br>
http://127.0.0.1:1337<br>
Set your password on the first connection page:<br>
http://127.0.0.1:1337/first_connection?login=admin&email:admin@local.fr<br><br>
The default generator login is: <b>admin</b><br>
The default generator email is: <b>admin@local.fr</b>

Note : to generate your first application, ports <i>9000</i> and <i>9001</i> must be available on your computer.

## Docker Installation

### Prerequisites

Docker and Docker compose installed

### Instructions

Create (and adapt if necessary) "docker-compose.yml" file:

<pre>
  version: "3.3"
  services: 
    nodea: 
      container_name: "test32_app"
      image: "nodeasoftware/nodea:3.2.2"
      restart: "always"
      networks: 
        nodea_network_1: 
          ipv4_address: "185.23.0.23"
      volumes: 
        - "workspace:/nodea/workspace"
        - "/usr/local/share/ca-certificates:/usr/local/share/ca-certificates:ro"
        - "/usr/share/ca-certificates:/usr/share/ca-certificates:ro"
        - "/etc/ssl/certs:/etc/ssl/certs:ro"
      environment: 
        NODEA_ENV: "studio"
        HOSTNAME: "test32-nodea-studio"
        PROTOCOL: "http"
        PORT: "1337"
        AUTH: "local"
        OPEN_SIGNUP: false
        DEMO_MODE: false
        SUB_DOMAIN: "test32"
        SERVER_IP: "185.23.0.23"
        DATABASE_IP: "185.23.0.24"
        DATABASE_USER: "nodea"
        DATABASE_PWD: "password"
        DATABASE_NAME: "nodea"
        MAIL_HOST: "smtpserver"
        MAIL_PORT: "465"
        MAIL_USER: "user"
        MAIL_PWD: "password"
        MAIL_FROM: "mailfrom"
        MAIL_ENV_HOST: "https://url_appli.com"
        ADMIN_EMAIL: null
        NODE_EXTRA_CA_CERTS: "/etc/ssl/certs/globalsignR6.pem"
      labels: 
        - "nodea=true"
    database: 
      container_name: "test32_database"
      image: "nodeasoftware/nodea-database-mariadb:latest"
      restart: "always"
      networks: 
        nodea_network_1: 
          ipv4_address: "185.23.0.24"
      volumes: 
        - "db_data:/var/lib/mysql"
      environment: 
        MYSQL_DATABASE: "nodea"
        MYSQL_USER: "nodea"
        MYSQL_PASSWORD: "password"
        MYSQL_ROOT_PASSWORD: "yourpassword"
        MYSQL_AIO: 0
        PG_DATA: "/var/lib/postgresql/data/pgdata"
        POSTGRES_DB: "nodea"
        POSTGRES_USER: "nodea"
        POSTGRES_PASSWORD: "password"
        POSTGRES_ROOT_PASSWORD: "yourpassword"
      labels: 
        - "nodea=true"
  networks: 
    nodea_network_1: 
      name: "nodea_network_1"
      external: true
  volumes: 
    workspace: {}
    db_data: {}
</pre>

Execute Docker compose command:
<pre>sudo docker-compose up -d</pre>

Wait about 30 seconds and open your browser on:<br>
http://127.0.0.1:1337<br>
Set your password on the first connection page:<br>
http://127.0.0.1:1337/first_connection?login=admin&email:admin@local.fr<br><br>
The default generator login is: <b>admin</b><br>
The default generator email is: <b>admin@local.fr</b>

Note: to set up Nodea docker containers, range ports <i>9001</i> to <i>9025</i> must be available on your computer.

## Documentation

Nodea Software documentation is available at : https://docs.nodea-software.com

## Follow us

<ul>
<li><a href="https://www.linkedin.com/company/nodea-software/">LinkedIn</a></li>
</ul>

## License

Nodea is released under the GNU GPL v3.0 license.
It contains several open source components distributed under the MIT, BSD or GNU GPL V3.0 licenses.

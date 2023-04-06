# VPS Setup Guide

Guide for bringing up development virtual private servers for developers and hobbyists. Intended for Ubuntu 18 on AWS EC2/Lightsail. Includes custom setup steps intended for my Lightsail project server (current configurations in [readme](README.md)). Created in June 2020.

1. Provision server
2. Configure server
3. Configure network
4. Deploy applications

## provision server

-   Cloud service provider: AWS
    -   Amazon Web Services (AWS): generous free tier, various services
    -   _Alternate providers:_ Google Cloud Platform, Microsoft Azure, DigitalOcean
-   VM provisioning service: EC2/Lightsail
    -   Elastic Compute Cloud (EC2): unlimited VM customization and flexibility, infrastructure not included
    -   Lightsail: simplified user experience for personal development VMs, better transfer pricing, infrastructure included (storage/transfer/DNS/static IP)
-   Provision VM resource (current configuration in [readme](README.md))
    -   OS: Ubuntu 18 LTS
    -   Memory: 1-2GB RAM
    -   Processor: 1-2vCPU
    -   Storage: 20-60GB SSD
    -   Transfer: ~1-2GB/Month (EC2) or ~1-2TB/Month (Lightsail)
    -   Access: configure SSH .pem key pair

## configure server

-   SSH Access
    -   Create entry in local ssh configuration `~/.ssh/config`:
        ```
        host lightsail                              # custom host config name
            HostName 54.186.188.200                 # instance static IP address
            IdentityFile ~/.ssh/Lightsail.pem       # path to configured .pem key
            User ubuntu                             # instance user
            Port 22
        ```
    -   Login with `ssh lightsail`
-   Update/install software
    -   Upgrade apt packages
        -   Run `sudo apt update` & `sudo apt upgrade`
        -   Keep previous local installs of configuration files when asked
        -   Run again & make sure to resolve any conflicts
    -   Create/copy configuration files to `~`
        -   ie. `startup.sh`, `ports.txt`, `aliases_ubuntu.sh`, `aliases_ubuntu.txt`, etc.
        -   ie. `.selected_editor`, `.gitconfig`, `.bash_aliases`, `.bashrc`, etc.
        -   SFTP can be used for this (ie. FileZilla) or scp
        -   Edit/confirm `~/.bashrc` includes equivalent of `source ~/.bash_aliases`
            -   Log out and back in to reload shell, confirm working aliases
    -   Restart system (reboot instance) if required
    -   Install development tools
        -   Text: vi/vim & nano included (confirm installed/use apt)
        -   Tmux: tmux included (confirm installed/use apt)
        -   Git: git included (confirm installed/use apt)
        -   Web: curl & wget included (confirm installed/use apt)
        -   C/C++: `sudo apt install build-essential`
        -   SSL: `sudo apt install libssl-dev`
        -   Node.js (n/node/npm)
            -   node and npm with n
                ```
                curl -L https://raw.githubusercontent.com/tj/n/master/bin/n -o n
                sudo bash n lts
                rm ./n
                ```
            -   npm global packages
                -   _See installed:_ `npm list -g --depth 0`
                -   n: `sudo npm i -g n`
                -   gulp: `sudo npm i -g gulp-cli`
                -   nodemon: `sudo npm i -g nodemon`
                -   npx: `sudo npm i -g npx --force`
                -   pm2: `sudo npm i -g pm2`
        -   Python (pyenv)
            -   Install prerequisites
                ```
                sudo apt-get install -y build-essential libssl-dev zlib1g-dev libbz2-dev \
                libreadline-dev libsqlite3-dev wget curl llvm libncurses5-dev libncursesw5-dev \
                xz-utils tk-dev libffi-dev liblzma-dev python-openssl git
                ```
            -   Clone from git: `git clone https://github.com/pyenv/pyenv.git ~/.pyenv`
            -   Edit `PATH` and init in `~/.bashrc`
                ```
                echo 'export PYENV_ROOT="$HOME/.pyenv"' >> ~/.bashrc
                echo 'export PATH="$PYENV_ROOT/bin:$PATH"' >> ~/.bashrc
                echo -e 'if command -v pyenv 1>/dev/null 2>&1; then\n  eval "$(pyenv init -)"\nfi' >> ~/.bashrc
                ```
            -   Log out and back in to reload shell, confirm working `pyenv` command
            -   Install latest python2 and python3 versions
                -   _List available versions:_ `pyenv install --list`
                -   python2: `pyenv install 2.7.18`
                -   python3: `pyenv install 3.8.3`
                -   _Set global versions:_ `pyenv global 2.7.18 3.8.3`
                    -   `python` and `python2` point to python 2.7.18
                    -   `python3` points to python 3.8.3
                    -   Check `pyenv versions`
        -   MongoDB
            -   _Full Guide:_ [https://docs.mongodb.com/manual/tutorial/install-mongodb-on-ubuntu/](https://docs.mongodb.com/manual/tutorial/install-mongodb-on-ubuntu/)
            -   Import public GPG Key: `wget -qO - https://www.mongodb.org/static/pgp/server-4.2.asc | sudo apt-key add -`
            -   Create list file: `echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu bionic/mongodb-org/4.2 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-4.2.list`
            -   Reload packages: `sudo apt-get update`
            -   Install MongoDB: `sudo apt-get install -y mongodb-org`
        -   apache2/nginx
            -   apache2
                -   Run `sudo apt install apache2`
                -   Update `/etc/apache2/apache2.conf` & `/etc/apache2/ports.conf`
                -   Update/enable virtual host configurations in `/etc/apache2/sites-available`
                -   Update sites in `/var/www`
                -   Install modules: `sudo a2enmod ssl`, also `headers` & `rewrite`
                -   Restart: `sudo service apache2 restart`
            -   nginx
                -   Run `sudo apt install nginx`
                -   Update `/etc/nginx/nginx.conf`
                -   Update/enable virtual host configurations in `/etc/nginx/sites-available`
                -   Update sites in `/var/www`
                -   Restart: `sudo service nginx restart`
            -   Reverse proxy configuration
                -   Update `/etc/apache2/ports.conf` to only use port 8000/8443
                -   Update `/etc/apache2/sites-available` and all corresponding virtual host configurations to only use port 8000/8443
                -   Upload/enable `/etc/nginx/sites-available/apache-proxy` & `pocketjs-proxy`
                    -   HTTP nginx -> HTTP apache:
                        ```
                        server {
                            listen 80;
                            listen [::]:80;
                            server_name _;
                            return 301 https://$host$request_uri;
                            location / {
                                proxy_pass http://127.0.0.1:8000;
                                proxy_set_header Host $host;
                                proxy_set_header X-Real-IP $remote_addr;
                                proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
                                proxy_set_header X-Forwarded-Proto $scheme;
                            }
                            location ~ /\.ht {
                                deny all;
                            }
                        }
                        ```
                    -   HTTPS nginx -> HTTP apache:
                        ```
                        server {
                            listen 443 ssl;
                            listen [::]:443 ssl;
                            server_name _;
                            ssl on;
                            ssl_certificate /etc/letsencrypt/live/anuv.me-0001/fullchain.pem;
                            ssl_certificate_key /etc/letsencrypt/live/anuv.me-0001/privkey.pem;
                            location / {
                                proxy_pass http://127.0.0.1:8000;
                                proxy_set_header Host $host;
                                proxy_set_header X-Real-IP $remote_addr;
                                proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
                                proxy_set_header X-Forwarded-Proto $scheme;
                            }
                            location ~ /\.ht {
                                deny all;
                            }
                        }
                        ```
        -   PHP/MySQL
            -   Run `sudo apt-get install mysql-server`
            -   Run `sudo mysql_secure_installation`
            -   Run `sudo apt-get install php libapache2-mod-php php-mysql php-curl php-gd php-json php-zip php-mbstring`
            -   Run `sudo apt install phpmyadmin`
            -   Edit `/etc/apache2/apache2.conf`, add `Include /etc/phpmyadmin/apache.conf`
            -   Reload: `sudo service apache2 reload`
            -   Save root and phpmyadmin passwords in file (ie. `~/passwords.txt`)

## configure network

-   Edit security group/firewall inbound port rules (current configuration in [readme](README.md))
    ```
    TYPE                PROTOCOL:PORT           RESTRICT
    SSH                 TCP:22                  any IP address
    HTTP                TCP:80                  any IP address
    HTTPS               TCP:443                 any IP address
    ```
-   Attach static IP address to VM using Elastic IP service
-   Upgrade domain
    -   Domain name registrar: NameCheap
        -   _Alternate registrars:_ Freenom, GoDaddy
        -   _Note:_ GitHub student pack offers .me domain free for a year, Freenom offers unlimited free .ml domains
        -   Buy domain subscription: [anuv.me](http://anuv.me)
    -   DNS service: Yandex
        -   _Note:_ NameCheap & Freenom include DNS portal & nameservers with domain
        -   Delegate domain to Yandex/update to Yandex nameservers
        -   Set up with webmaster tools on [connect.yandex.com](http://connect.yandex.com) (avoid [webmaster.yandex.com](http://webmaster.yandex.com))
        -   Add DNS records (current configuration in [readme](README.md))
            ```
            HOST            TYPE            VALUE                           TTL
            @               A               54.186.188.200                  21600
            aws             A               54.186.188.200                  21600
            ec2             CNAME           ec2-54-186-188-200.us-west-2    21600
                                                .compute.amazonaws.com.
            www             CNAME           anuv.me.                        21600
            github          CNAME           anuvgupta.github.io.            21600
            *               CNAME           aws.anuv.me.                    21600
            ```
-   Obtain SSL Certificate
    -   ...

## deploy applications

-   apache2 sites
    -   Copy sites to `/var/www`
    -   Add virtual host configurations to `/etc/apache2/sites-available` or `/etc/apache2/sites-available/apache-vhosts.conf`
    -   Control with `sudo service apache2 start/stop/restart/reload/status`
-   nginx sites
    -   Copy sites to `/var/www` or `~`
    -   Add virtual host configurations to `/etc/nginx/sites-available`
    -   Control with `sudo service nginx start/stop/restart/reload/status`
-   pocketjs apps

    -   Copy apps to `~/pocketjs-apps`
    -   Copy/update ecosystem file `~/pocketjs-apps/ecosystem.json`
    -   Copy `pocketjs` script to `~/pocketjs-apps/pocketjs`
        -   Symlink: `sudo ln -s /home/ubuntu/pocketjs-apps/pocketjs /usr/local/bin`
    -   Ensure in browser code (`index.html`, `index.php`, `app.js`), pocket points to `ws://pjs.anuv.me:80/script-name` or `wss://pjs.anuv.me:443/script-name`
    -   Ensure in server code (`app.php`, `server.php`, etc.), pocket points to `localhost`, any port
    -   Install dependencies and run prerequisite scripts, start required services (ie. MySQL)
    -   Open appropriate ports in instance network/firewall port settings
    -   Update ports in file (ie. `~/ports.txt`)
    -   Upload/update pocketjs proxy `/etc/nginx/sites-available/pocketjs-proxy`
        -   Update the mapping with the script name and pocketjs server port
            ```
            map $uri $pocketjs_port {
                default                         0;
                /                               0;
                /script-name                    800x;
            }
            ```
    -   Spawn ecosystem: `pm2 start ~/pocketjs-apps/ecosystem.json`

-   node.js apps
    -   Copy apps to `~/nodejs-apps`
    -   Copy/update ecosystem file `~/nodejs-apps/ecosystem.json`
    -   Install dependencies and run prerequisite scripts, start required services (ie. MongoDB)
        -   Install node packages: `npm i`
    -   Copy nginx configuration file to `/etc/nginx/sites-available`
    -   Open appropriate ports in instance network/firewall port settings
    -   Update ports in file (ie. `~/ports.txt`)
    -   Spawn ecosystem: `pm2 start ~/nodejs-apps/ecosystem.json`

&nbsp;  
_2020_

# Dash

**Project manager, application orchestrator, & internet presence dashboard.**  
Deploy live updates, monitor apps & resources, and plan projects – *all in realtime from the cloud.*  

## Features
**Dash** ties abstract ideas and goals to models of concrete entities, generating smart server configurations for your projects based on a few high-level settings for the software and hardware you manage.  
&nbsp;  
*It simplifies the following:*  
 - Project Management
    - Project stages & tasks
    - Ideation/solution design
 - Application Orchestration
    - Server process management
    - Reverse proxy generation
 - Internet Presence
    - Web sitemap generation
    - Domain tracking

## Settings
 - **Projects**
    - Meta
        - Name, ID/Slug, Tagline, Description, Visibility, Featured, Demo
    - Code
        - Repository, Technology, Language, Documentation
    - Applications
        - List of project-associated applications
 - **Applications**
    - Meta
        - Name, ID/Slug, Description, Host Resource, Port
    - Ecosystem
        - Path, Script, Interpreter, Arguments, Output Log, Error Log, Memory Limit, Restart Delay
    - Process
        - Status, Signals (Start, Restart, Stop), Logs
    - Domains
        - List of application-associated domains
    - Proxy
        - WWW Alias, HTTPS Enable, HTAccess Deny, HTTPS Force, WebSocket Enable, WebSocket Endpoint
 - **Resources**
    - Meta
        - Name, ID/Slug, External IP, Internal IP, Provider, Console
    - Software
        - App Root, NGINX Root, Apache Root, WWW Root
    - Hardware
        - Core, Memory, Storage, Location, Type
    - Domains
        - List of resource-associated domains
    - Applications
        - List of applications using resource as host
    - Daemon
        - Key, Status
 - **Domains**
    - Meta
        - Domain Name, Second Level Name, Top Level Name
    - Subdomains
        - List of active subdomains on domain
    - Certificates
        - List of active certificates for domain/subdomains
 - **Sitemap**
 - **Ideas**

## Guides
*A few setup guides for the cloud server & resource daemon software*  
### VM Setup
Setting up a cloud VM to host both `dash-cloud` and `dash-daemon` processes.
 - Create/choose application root directory, for example `/home/ubuntu/dash/apps`
 - PM2 setup
    - Install `pm2` globally with `npm`
    - Manually start/stop apps from dash's `ecosystem.json` (dash-cloud & dash-daemon) as needed using `pm2 start ecosystem.json` and `pm2 stop APP_NAME`
    - Dash's application management will bring up the other apps automatically with PM2
 - NGINX setup
    - Install `nginx` with system package manager (ie. `apt`)
    - Check `config/nginx/reference` folder for example `nginx.conf` main configuration
    - Ensure folders `/etx/nginx/sites-enabled` and `/etc/nginx/sites-available` exist
        - Ensure current `$USER` has write permissions to those folders
    - Add sites `dash-cloud.conf` and `dash-proxy_apache.conf` from repo folder `config/nginx` to VM folder `/etc/nginx/sites-available`
        - Then link with `sudo ln -s /etc/nginx/sites-available/dash-cloud.conf /etc/nginx/sites-enabled/dash-cloud.conf` and restart NGINX
    - Ensure current `$USER` has the ability to start, stop, and restart the nginx service without requiring a password for sudo
        - One possible solution
            - Create/edit `/etc/sudoers.d/$USER` (ie. `/etc/sudoers.d/ubuntu`) to contain:
                ```
                ubuntu ALL=(ALL) NOPASSWD: /usr/sbin/service nginx start,/usr/sbin/service nginx stop,/usr/sbin/service nginx restart,/usr/sbin/service nginx reload
                ```
            - [Relevant StackOverflow Answer](https://stackoverflow.com/questions/3011067/restart-nginx-without-sudo#:~:text=Instructions%3A,to%20restart%20nginx%20without%20sudo.&text=Save%20by%20hitting%20ctrl%20%2B%20o,enter%20to%20confirm%20the%20default.)

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
    - Domain+certificate tracking

&nbsp;  
Dash also exposes a web API for my project portfolio site on GitHub pages ([github.anuv.me](https://github.anuv.me/)).

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
        - Certificate: Subdomains, Resource, File Path, Key File Path, Expiration
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
    - Ensure folders `/etc/nginx/sites-enabled` and `/etc/nginx/sites-available` exist
        - Ensure current `$USER` has write permissions to those folders
    - Add sites from repo folder `config/nginx` to VM folder `/etc/nginx/sites-available`
        - Sites include: `dash-core_cloud.conf`, `dash-core_default.conf`, `dash-core_redirect.conf`, `dash-core_ws-upgrade.conf`
        - Then link with `sudo ln -s /etc/nginx/sites-available/dash-core_cloud.conf /etc/nginx/sites-enabled/dash-core_cloud.conf` and restart NGINX
    - Ensure current `$USER` has the ability to start, stop, and restart the nginx service without requiring a password for sudo
        - One possible solution
            - Create/edit `/etc/sudoers.d/$USER` (ie. `/etc/sudoers.d/ubuntu`) to contain:
                ```
                ubuntu ALL=(ALL) NOPASSWD: /usr/sbin/service nginx start,/usr/sbin/service nginx stop,/usr/sbin/service nginx restart,/usr/sbin/service nginx reload
                ```
            - [Relevant StackOverflow Answer](https://stackoverflow.com/questions/3011067/restart-nginx-without-sudo#:~:text=Instructions%3A,to%20restart%20nginx%20without%20sudo.&text=Save%20by%20hitting%20ctrl%20%2B%20o,enter%20to%20confirm%20the%20default.)
 - Apache2 setup
    - Install `apache2` (or `httpd`) with system package manager (ie. `apt`)
    - Check `config/apache2/reference` folder for example `apache2.conf`/`ports.conf` main configuration
    - Ensure folders `/etc/apache2/sites-enabled` and `/etc/apache2/sites-available` exist
        - Ensure current `$USER` has write permissions to those folders
    - Add sites from repo folder `config/apache2` to VM folder `/etc/apache2/sites-available`
        - Sites include: `dash-core_default.conf`, `dash-core_redirect.conf`
        - Then link with `sudo ln -s /etc/apache2/sites-available/dash-core_cloud.conf /etc/apache2/sites-enabled/dash-core_cloud.conf` and restart Apache2
    - Ensure current `$USER` has the ability to start, stop, and restart the apache service without requiring a password for sudo
        - One possible solution
            - Create/edit `/etc/sudoers.d/$USER` (ie. `/etc/sudoers.d/ubuntu`) to contain:
                ```
                ubuntu ALL=(ALL) NOPASSWD: /usr/sbin/service apache2 start,/usr/sbin/service apache2 stop,/usr/sbin/service apache2 restart,/usr/sbin/service apache2 reload
                ```


## Misc

### Useful Commands

 - `git remote set-url origin https://anuvgupta:TOKEN@github.com/anuvgupta/dash.git`
 - `sudo systemctl status apache2.service`
 
&nbsp;  
&nbsp;  
&nbsp;  

## Focus Board

right now
- project icon & editor

ideas for later
- external sites
    - one way
        - add “external” widget in application to mark as external site, then mark audiu, chessroom, github projects site
        - in future, add integrations for external sites in the external widget, ie. to control & observe processes through heroku api/cli
            - possible integrations: heroku (audiu, rubbr-legacy-og), firebase (chessroom), github pages (projects site)
    - another way
        - create a resource for each external app, wherever it is running (ie a resource for audiu’s heroku container, a resource for chessroom’s firebase container, etc…)
- squash application view into a bar, i have so many apps its hard to understand when they are displayed so big (resource and project sizes are fine, apps are too similar to projects)
- create projects again
- set project majority for each project: major/flagship (ie pocketjs, blockjs, nestor, audiu, uncurated), minor (like led-lights, tcp-chat, dolphin, messenger, vizioir, moon etc.)
    - rename majority to flagship?
- add filter on resources/applications widget for online/offline apps
    - also sort by port
- checkbox on whether resource/domain is owned by you or external
- add resource widget for showing list of available ports (checked with “p” bash shortcut)
- save dash config to file from ui (mongo backup?)
- options for app code for when u pull app repo and install packages and build
    - have options to manually specify the install and build commands and force dash daemon to use those
    - can disable install and/or build
    - this allows for using local python and skipping install, ie for jetson nano
- domain desc should be domains subdomains.join(“, “)
- refresh buttons on each page (just run the :select_$TYPE function again? or load data firs tthen do that? guess u have to add one on the detail page and one on the content page and they will do diff things)
- autoremove domains from apps & resources on domain delete
    - autoremove apps from project on app delete
- add environment section to application, where you can add and edit env var for pm2 to pass into the app
- add a secure switch to app which controls the proxy https fields too
- filter projects by technology, language, visibility, featured, app domain, application
    - filter applications by interpreter, status, secure, websocket proxy, host resource, domain
    - filter resources by provider, type, status, domain, location
    - filter domains by top level
- idea section, promote ideas to projects
- sitemap section, generated from applications/projects/domains
    - resource-focused view shows resources on top and apps underneath/on resources assigned to ports, domains listed under each app
    - domain-focused view shows domains on top and apps underneath/on domains, resource listed under each app
    - also have filters to choose which resources or domains or apps to show, similar to main section filters
- keep identifiers (slugs) unique when updating (its already unique when creating)
- project focus board before stages and features
- project stages
    - add widget for stages in project
    - each stage has name, tasks to complete (subtasks allowed), and a deadline
    - can view previous and future stages
- project features (widget to write out/explain the features of each project in a brief bulleted list)
- code link button in project app list item view to load (copy) project repo from app repo
- application batch commands (ideally after implementing app filtering)
    - send signal to all apps (start, restart, stop)
    - save proxy for all apps
- add button on resource to push default nginx & apache configs to resource (ie. ws upgrade, default, redirect, etc.)
- add switch for secure to force push all the apps to secure or insecure (changes https_force, not https_enable for all app proxies)
- fix extra long text displays
- fix log load after first start signal (maybe file doesnt exist yet)
- add loading gif for slow network requests ie log loading
- push page state for each view & update view on state change
- clean up the :hide_editors events for each section

test & bugfix
- high priority
- low priority

done:
- project management
    - project majority switch
    - project type (library, application, script, static site, other)
    - project platform (web, desktop, mobile, embedded, other)
    - project demo password & demo password display enable
    - project purpose
        - creativity: cool idea, product, invention—bigger flagship projects, unique projects, personal favs
            - dash, nestor, audiu, rubbr, fitcheck, block.js, pocketjs, uncurated, led-lights
        - essentials: standards, practice exercises—classic typical software projects everyone should learn to do
            - anuv.me: personal home page website
            - tcp-chat: command-line tcp messaging room
            - messenger: realtime messaging room app
            - slop: realtime shared grocery list app
            - space-invaders: space invaders java desktop game
        - learning: projects created to learn about a technology or library etc.
            - pi
        - utility: general use tool, made solely out of need, created during other projects—frameworks, libraries, smaller scripts
            - tunnel.js, chain.js, vizio-remote, node-scaffold, repetition, dolphin, aliases, flask-react-scaffold
        - infrastructure???: projects created to support my software ecosystem>>>>>>????????
        - school: for school/classes/clubs
            - soundfinder, ut ticket exchange, simplicity-cloud, peer2peer, lancerhacks, sfgpa, sfhacks-results, sitarhero, murk, worldcup, phue-gateway, fakenews, jtrump
        - work: for internships and career work
            - zineone event gateway, pres-rcvs integration, capic endpoint simulation, 6connect ipam connector, chessroom
        - fun: for entertainment
            - me.anuv.me, games, monarchy, moon, drummer, catchapples, pi?
        - other: remaining
- cert renewal guide/reminder
- toast notifications for process signals
- pull app code using git & install dependency packages
    - token for private github repos
    - support for pip install with venv on python venv apps
- nginx proxy config & apache vhost config generation from minimal buttons & text fields
    - add application field: proxy_enable, controls whether proxy options are even shown and also writes the nginx config when turned on (deletes it when off, so no need for clear proxy button)
    - generate proxy servers for each combination of cert and domain name, use minimal number of servers
    - replace/fix redirect site with smart vhost/proxy rewrite redirects
    - create field for app/proxy/static path, then use that for apache vhost document root (always set document root to app_root/static_path)
        - change apache error log to be in app_root directly so its the same as the process ecosystem log
        - essentially document root will be like slop/html, so we link /var/www/slop to ~/dash/apps/slop, and set the apache config document root to /var/www/slop/html (which actually points to ~/dash/apps/slop/html), then we put hte log in /var/www/slop/error.log (which is actually ~/dash/apps/slop/error.log)
- process control & status w/ pm2
- managed object model, view, & controller
    - objects: project, application, resource, domain
- masonry grid ui for dashboard
- jwt auth, cookies, basic ui, cli debugging & more infra
- node scaffold for web & websocket backend

# Dash

Cloud project manager, application orchestrator, & internet presence dashboard.  
Control your server.  

## Features
***Dash** simplifies:*
 - Project Management
    - Project stages & tasks
    - Ideation/solution design
 - Application Orchestration
    - Server process management
    - Reverse proxy generation
 - Internet Presence
    - Web sitemap generation
    - Domain map tracking

## Sections
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

## VM Setup
*Setting up a cloud VM to host both `dash-cloud` and `dash-daemon` processes.*
 - Create/choose application root directory, for example `/home/ubuntu/dash/apps`
 - PM2 setup
    - Install `pm2` globally with `npm`
    - Manually start apps in dash's `ecosystem.json` (dash-cloud & dash-daemon) as needed using `pm2 start ecosystem.json`
    - 
 - NGINX setup
    - Install `nginx` with system package manager ie. `apt`
    - Check `notes/nginx_configs` folder for example nginx main configuration
    - Ensure folders `/etx/nginx/sites-enabled` and `/etc/nginx/sites-available` exist
        - Ensure current `$USER` has write permissions to those folders
    - 
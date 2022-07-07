# lightsail

Lightsail VPS instance configuration for my project development server.  
This repository serves as a backup for the configuration of my AWS Lightsail VPS instance.
The instance fails often during development, usually due to erroneous code or new software.
In this case, I can use this repository to quickly spin up an identical instance, thus restoring all my deployed project apps without relying on the Lightsail/EC2 snapshot service.

## bring-up

To bring up the VPS:

1.  First, obtain an Amazon Web Services account.
2.  Next, follow the [VPS Setup Guide](VPS%20Setup%20Guide.md) to provision the server, configure the server, and configure the network. Use the details in the following _instance/network_ sections in this readme.
3.  Then, upload data from this repository while continuing to follow the VPS Setup Guide to deploy current applications. Use the details in the following _data_ section in this readme.

### instance

Instance details:

-   Provider: AWS Lightsail
-   Name: Ubuntu-2GB
-   Zone: us-west-2a
-   OS: Ubuntu 18.04.4 LTS
-   Memory: 2GB RAM
-   Processor: 1vCPU
-   Storage: 60GB SSD
-   Transfer: 3TB/Month
-   Username: ubuntu
-   Access: `Lightsail.pem`

### network

Network details:

-   Static IP address: [54.186.188.200](https://54.186.188.200/)
-   Firewall rules:
    ```
    TYPE                    PROTOCOL:PORT           RESTRICT
    SSH                     TCP:22                  any IP address
    HTTP                    TCP:80                  any IP address
    HTTPS                   TCP:443                 any IP address
    CUSTOM (tcp-chat)       TCP:3005                any IP address
    ```
-   DNS records:
    ```
    HOST            TYPE            VALUE                           TTL
    @               A               54.186.188.200                  21600
    aws             A               54.186.188.200                  21600
    ec2             CNAME           ec2-54-186-188-200.us-west-2    21600
                                        .compute.amazonaws.com.
    www             CNAME           anuv.me.                        21600
    github          CNAME           anuvgupta.github.io.            21600
    me              CNAME           aws.anuv.me.                    21600
    rubbr           CNAME           aws.anuv.me.                    21600
    io.rubbr        CNAME           salty-reindeer-jp0wvrc91d5or2   21600
                                        penb6e31x9.herokudns.com.
    *.rubbr         CNAME           aws.anuv.me.                    21600
    chessroom       A               151.101.1.195                   21600
    chessroom       A               151.101.65.195                  21600
    *               CNAME           aws.anuv.me.                    21600
    mail            CNAME           domain.mail.yandex.net.         21600
    @               MX              mx.yandex.net.                  21600
    ```

### data

Data details:

-   The base directory of this repository mirrors the home directory `~` on the server, but there are exceptions.
    -   `www` mirrors `/var/www` directory on the system, not `~/www`. Copy relevant files to `/var/www`, then symlink `/var/www` to `~/www`.
    -   `apache2-sites` mirrors `/etc/apache2` directory on the system, not `~/apache2-sites`. Copy relevant files to `/etc/apache2`, create folder `~/apache2-sites`, then symlink added/updated files and folders in `/etc/apache2` to `~/apache2-sites`. Do not symlink `/etc/apache2` to `~/apache2-sites`.
    -   `nginx-sites` mirrors `/etc/nginx` directory on the system, not `~/nginx-sites`. Copy relevant files to `/etc/nginx`, create folder `~/nginx-sites`, then symlink added/updated files and folders in `/etc/nginx` to `~/nginx-sites`. Do not symlink `/etc/nginx` to `~/apache2-nginx`.
    -   `nodejs-apps`, `pocketjs-apps`, and all the files in the base directory belong in `~` on the server.
-   URL files in this repository each represent a collection of files for a project maintained elsewhere, and the repository for that project is linked in the file.
    -   When uploading to the server, make the necessary replacements.
    -   ie. `aliases_ubuntu.url` contains a link to the [aliases](https://github.com/anuvgupta/aliases) project, so it should be replaced by `aliases_ubuntu.sh` and `aliases_ubuntu.txt`.
